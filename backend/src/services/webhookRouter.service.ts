import axios, { AxiosError } from 'axios';
import { db, redis, logger, config } from '../config';
import {
  WebhookEvent,
  N8nWorkflow,
} from '../types';

export class WebhookRouterService {
  private readonly WEBHOOK_QUEUE_KEY = 'webhooks:queue';
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAYS = [1000, 5000, 30000]; // ms

  /**
   * Process incoming Meta webhook event
   */
  async processWebhook(event: WebhookEvent): Promise<void> {
    const { platform, event_type: eventType, platform_id: pageId, payload: data } = event;

    logger.info('Processing webhook', { platform, eventType, pageId });

    if (!pageId) {
      logger.warn('No platform_id in webhook event');
      return;
    }

    try {
      // Find the page and organization
      const page = await this.getPageByPlatformId(pageId, platform);
      
      if (!page) {
        logger.warn('Page not found for webhook', { pageId, platform });
        return;
      }

      // Find matching dedicated workflow (paid tiers)
      const workflow = await this.findMatchingWorkflow(
        page.organization_id,
        platform,
        eventType
      );

      if (!workflow) {
        // No dedicated workflow — route via shared base webhook (free tier)
        const routed = await this.routeViaBaseWebhook(page, event, eventType);
        if (!routed) {
          logger.debug('No workflow or base webhook found for event', {
            organizationId: page.organization_id,
            platform,
            eventType,
          });
        }
        return;
      }

      // Enrich the payload with organization context
      const enrichedPayload = await this.enrichPayload(page, event, workflow);

      // Deliver to n8n webhook
      await this.deliverWebhook(workflow, enrichedPayload);

      // Log successful delivery
      await this.logDelivery({
        webhookUrl: workflow.n8n_webhook_url,
        organizationId: page.organization_id,
        workflowId: workflow.id,
        eventType,
        status: 'success',
        requestPayload: enrichedPayload,
      });

    } catch (error) {
      logger.error('Failed to process webhook', { error, event });
      
      // Queue for retry
      await this.queueForRetry(event);
    }
  }

  /**
   * Route event through the shared base n8n webhook (free-tier orgs).
   * The base webhook URL is either set on the org or falls back to the global N8N_WEBHOOK_BASE_URL.
   * The payload includes organizationId so n8n's router node can dispatch to the correct knowledge base.
   */
  private async routeViaBaseWebhook(
    page: { id: string; organization_id: string; page_name: string },
    event: WebhookEvent,
    eventType: string
  ): Promise<boolean> {
    // Check for org-level or global base webhook
    const org = await db.queryOne<{ n8n_base_webhook_url: string | null; plan_type: string }>(
      'SELECT n8n_base_webhook_url, plan_type FROM organizations WHERE id = $1',
      [page.organization_id]
    );

    const baseWebhookUrl = org?.n8n_base_webhook_url || config.n8n.webhookBaseUrl;
    if (!baseWebhookUrl) return false;

    const kbType = ['messages', 'message_deliveries', 'message_reads', 'messaging_postbacks', 'instagram_messages']
      .includes(eventType) ? 'chatbot' : 'comments';

    const knowledgeBase = await db.queryOne<{ id: string; name: string; content: string }>(
      `SELECT id, name, content FROM knowledge_bases
       WHERE organization_id = $1 AND type = $2 AND is_active = true
       ORDER BY updated_at DESC LIMIT 1`,
      [page.organization_id, kbType]
    );

    const payload = {
      event: event.payload,
      platform: event.platform,
      eventType: event.event_type,
      pageId: event.platform_id,
      organization: {
        id: page.organization_id,
        pageId: page.id,
        pageName: page.page_name,
        planType: org?.plan_type || 'free',
      },
      knowledgeBase: knowledgeBase ? {
        id: knowledgeBase.id,
        name: knowledgeBase.name,
        content: knowledgeBase.content,
      } : null,
      routingType: 'base_webhook',
      receivedAt: new Date().toISOString(),
    };

    try {
      await axios.post(baseWebhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Seekers-Signature': this.generateSignature(payload),
          'X-Organization-ID': page.organization_id,
          'X-Routing-Type': 'base-webhook',
        },
        timeout: 30000,
      });

      await this.logDelivery({
        webhookUrl: baseWebhookUrl,
        organizationId: page.organization_id,
        workflowId: '',
        eventType,
        status: 'success',
        requestPayload: payload,
      });

      logger.info('Routed via base webhook', { organizationId: page.organization_id, eventType });
      return true;
    } catch (error) {
      const axiosError = error as AxiosError;
      logger.error('Base webhook delivery failed', {
        organizationId: page.organization_id,
        error: axiosError.message,
      });

      await this.logDelivery({
        webhookUrl: baseWebhookUrl,
        organizationId: page.organization_id,
        workflowId: '',
        eventType,
        status: 'failed',
        requestPayload: payload,
        errorMessage: axiosError.message,
      });

      return false;
    }
  }

  /**
   * Find page by platform-specific ID
   */
  private async getPageByPlatformId(
    platformId: string,
    platform: 'facebook' | 'instagram'
  ): Promise<{
    id: string;
    organization_id: string;
    page_name: string;
  } | null> {
    if (platform === 'facebook') {
      return db.queryOne(
        `SELECT fp.id, fp.organization_id, fp.page_name 
         FROM facebook_pages fp 
         WHERE fp.page_id = $1 AND fp.is_active = true`,
        [platformId]
      );
    } else {
      return db.queryOne(
        `SELECT ia.id, ia.organization_id, ia.username as page_name 
         FROM instagram_accounts ia 
         WHERE ia.instagram_id = $1 AND ia.is_active = true`,
        [platformId]
      );
    }
  }

  /**
   * Find matching workflow for the event
   */
  private async findMatchingWorkflow(
    organizationId: string,
    platform: 'facebook' | 'instagram',
    eventType: string
  ): Promise<N8nWorkflow | null> {
    // Map event type to workflow type
    const workflowType = this.mapEventToWorkflowType(eventType);

    return db.queryOne<N8nWorkflow>(
      `SELECT * FROM n8n_workflows 
       WHERE organization_id = $1 
       AND platform = $2 
       AND workflow_type = $3 
       AND is_active = true`,
      [organizationId, platform, workflowType]
    );
  }

  /**
   * Map Meta event type to workflow type
   */
  private mapEventToWorkflowType(eventType: string): string {
    const mapping: Record<string, string> = {
      // Messenger events
      'messages': 'chatbot',
      'message_deliveries': 'chatbot',
      'message_reads': 'chatbot',
      'messaging_postbacks': 'chatbot',
      
      // Feed events
      'feed': 'comment_reply',
      'comments': 'comment_reply',
      
      // Instagram events
      'instagram_messages': 'chatbot',
      'instagram_comments': 'comment_reply',
      'instagram_story_mentions': 'comment_reply',
    };

    return mapping[eventType] || 'custom';
  }

  /**
   * Enrich payload with organization context
   */
  private async enrichPayload(
    page: { id: string; organization_id: string; page_name: string },
    event: WebhookEvent,
    workflow: N8nWorkflow
  ): Promise<Record<string, any>> {
    // Get knowledge base for this organization and workflow type
    const kbType = (workflow.workflow_type === 'messenger' || workflow.workflow_type === 'instagram_dm') ? 'chatbot' : 'comments';
    const knowledgeBase = await db.queryOne(
      `SELECT id, name, content FROM knowledge_bases 
       WHERE organization_id = $1 AND type = $2 AND is_active = true 
       ORDER BY updated_at DESC LIMIT 1`,
      [page.organization_id, kbType]
    );

    return {
      // Original event data
      event: event.payload,
      
      // Platform info
      platform: event.platform,
      eventType: event.event_type,
      pageId: event.platform_id,
      
      // Organization context
      organization: {
        id: page.organization_id,
        pageId: page.id,
        pageName: page.page_name,
      },
      
      // Knowledge base (if available)
      knowledgeBase: knowledgeBase ? {
        id: knowledgeBase.id,
        name: knowledgeBase.name,
        content: knowledgeBase.content,
      } : null,
      
      // Workflow metadata
      workflow: {
        id: workflow.id,
        type: workflow.workflow_type,
        name: workflow.workflow_name,
      },
      
      // Timestamp
      receivedAt: new Date().toISOString(),
    };
  }

  /**
   * Deliver webhook to n8n
   */
  private async deliverWebhook(
    workflow: N8nWorkflow,
    payload: Record<string, any>,
    retryCount: number = 0
  ): Promise<void> {
    try {
      const response = await axios.post(workflow.n8n_webhook_url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Seekers-Signature': this.generateSignature(payload),
          'X-Workflow-ID': workflow.id,
        },
        timeout: 30000, // 30 second timeout
      });

      // Update workflow last triggered
      await db.query(
        'UPDATE n8n_workflows SET last_triggered_at = NOW(), trigger_count = trigger_count + 1 WHERE id = $1',
        [workflow.id]
      );

      logger.info('Webhook delivered successfully', {
        workflowId: workflow.id,
        status: response.status,
      });

    } catch (error) {
      const axiosError = error as AxiosError;
      
      logger.error('Webhook delivery failed', {
        workflowId: workflow.id,
        error: axiosError.message,
        status: axiosError.response?.status,
        retryCount,
      });

      // Retry logic
      if (retryCount < this.MAX_RETRIES) {
        const delay = this.RETRY_DELAYS[retryCount];
        
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return this.deliverWebhook(workflow, payload, retryCount + 1);
      }

      // Update failure count
      await db.query(
        'UPDATE n8n_workflows SET failure_count = failure_count + 1, last_error = $1 WHERE id = $2',
        [axiosError.message, workflow.id]
      );

      throw error;
    }
  }

  /**
   * Generate signature for webhook payload
   */
  private generateSignature(payload: Record<string, any>): string {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', config.jwt.secret);
    hmac.update(JSON.stringify(payload));
    return hmac.digest('hex');
  }

  /**
   * Queue webhook for retry
   */
  private async queueForRetry(event: WebhookEvent): Promise<void> {
    await redis.rpush(
      this.WEBHOOK_QUEUE_KEY,
      JSON.stringify({
        event,
        queuedAt: new Date().toISOString(),
        retryCount: 0,
      })
    );
  }

  /**
   * Process queued webhooks
   */
  async processQueue(): Promise<void> {
    const item = await redis.lpop(this.WEBHOOK_QUEUE_KEY);
    
    if (!item) return;

    const { event, retryCount } = JSON.parse(item);

    if (retryCount >= this.MAX_RETRIES) {
      logger.warn('Webhook exceeded max retries', { event });
      return;
    }

    try {
      await this.processWebhook(event);
    } catch (error) {
      // Re-queue with incremented retry count
      await redis.rpush(
        this.WEBHOOK_QUEUE_KEY,
        JSON.stringify({
          event,
          queuedAt: new Date().toISOString(),
          retryCount: retryCount + 1,
        })
      );
    }
  }

  /**
   * Log webhook delivery
   */
  private async logDelivery(log: {
    webhookUrl: string;
    organizationId: string;
    workflowId: string;
    eventType: string;
    status: 'success' | 'failed';
    requestPayload: Record<string, any>;
    responseStatus?: number;
    responseBody?: string;
    errorMessage?: string;
  }): Promise<void> {
    await db.query(
      `INSERT INTO webhook_logs 
       (webhook_url, organization_id, workflow_id, event_type, status, 
        request_payload, response_status, response_body, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        log.webhookUrl,
        log.organizationId,
        log.workflowId,
        log.eventType,
        log.status,
        JSON.stringify(log.requestPayload),
        log.responseStatus || null,
        log.responseBody || null,
        log.errorMessage || null,
      ]
    );
  }

  /**
   * Get webhook delivery logs for an organization
   */
  async getDeliveryLogs(
    organizationId: string,
    options: {
      workflowId?: string;
      status?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<any[]> {
    const conditions: string[] = ['organization_id = $1'];
    const params: any[] = [organizationId];
    let paramIndex = 2;

    if (options.workflowId) {
      conditions.push(`workflow_id = $${paramIndex++}`);
      params.push(options.workflowId);
    }

    if (options.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(options.status);
    }

    params.push(options.limit || 100, options.offset || 0);

    return db.queryAll<any>(
      `SELECT * FROM webhook_logs 
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      params
    );
  }

  /**
   * Get workflow statistics
   */
  async getWorkflowStats(workflowId: string): Promise<{
    totalTriggers: number;
    successCount: number;
    failureCount: number;
    avgResponseTime: number;
    lastTriggered: Date | null;
  }> {
    const workflow = await db.queryOne<N8nWorkflow>(
      'SELECT * FROM n8n_workflows WHERE id = $1',
      [workflowId]
    );

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const stats = await db.queryOne<{ success_count: string; failure_count: string; avg_time: string }>(
      `SELECT 
         COUNT(*) FILTER (WHERE status = 'success') as success_count,
         COUNT(*) FILTER (WHERE status = 'failed') as failure_count,
         AVG(EXTRACT(EPOCH FROM (created_at - created_at))) as avg_time
       FROM webhook_logs
       WHERE workflow_id = $1 AND created_at > NOW() - INTERVAL '30 days'`,
      [workflowId]
    );

    return {
      totalTriggers: workflow.trigger_count,
      successCount: parseInt(stats?.success_count || '0'),
      failureCount: workflow.failure_count,
      avgResponseTime: parseFloat(stats?.avg_time || '0'),
      lastTriggered: workflow.last_triggered_at,
    };
  }
}

export const webhookRouterService = new WebhookRouterService();
export default webhookRouterService;
