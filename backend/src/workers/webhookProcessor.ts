import Bull, { Job } from 'bull';
import { logger, config } from '../config';
import { webhookRouterService } from '../services/webhookRouter.service';
import { WebhookJobData } from '../types';

// Create Bull queue with Redis connection
const webhookQueue = new Bull<WebhookJobData>('webhook-processing', {
  redis: {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password || undefined,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2s, then 4s, then 8s
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 500, // Keep last 500 failed jobs for debugging
  },
});

// Queue event handlers
webhookQueue.on('completed', (job: Job<WebhookJobData>) => {
  logger.info('Webhook job completed', {
    jobId: job.id,
    platform: job.data.platform,
    eventType: job.data.eventType,
  });
});

webhookQueue.on('failed', (job: Job<WebhookJobData> | undefined, error: Error) => {
  logger.error('Webhook job failed', {
    jobId: job?.id,
    platform: job?.data.platform,
    eventType: job?.data.eventType,
    attempts: job?.attemptsMade,
    error: error.message,
  });
});

webhookQueue.on('stalled', (jobId: string) => {
  logger.warn('Webhook job stalled', { jobId });
});

webhookQueue.on('error', (error: Error) => {
  logger.error('Webhook queue error', { error: error.message });
});

/**
 * Process webhook jobs
 */
webhookQueue.process(async (job: Job<WebhookJobData>) => {
  const { platform, eventType, assetId, payload, receivedAt } = job.data;

  logger.info('Processing webhook job', {
    jobId: job.id,
    platform,
    eventType,
    assetId,
    receivedAt,
  });

  try {
    // Convert job data to WebhookEvent format for processing
    // Only essential fields are needed - processWebhook extracts platform, event_type, platform_id, payload
    await webhookRouterService.processWebhook({
      id: job.id?.toString() || '',
      organization_id: null,
      platform,
      event_type: eventType,
      platform_id: assetId,
      payload,
      processed: false,
      routed_to_n8n: false,
      n8n_workflow_id: null,
      n8n_response_status: null,
      error_message: null,
      retry_count: 0,
      created_at: new Date(receivedAt),
      processed_at: null,
    });

    return { success: true, processedAt: new Date().toISOString() };
  } catch (error) {
    const err = error as Error;
    logger.error('Webhook processing error', {
      jobId: job.id,
      error: err.message,
      stack: err.stack,
    });
    throw error; // Rethrow to trigger retry
  }
});

/**
 * Add a webhook event to the processing queue
 */
export async function enqueueWebhook(data: WebhookJobData): Promise<string> {
  const job = await webhookQueue.add(data, {
    // Higher priority for messages (lower number = higher priority)
    priority: data.eventType.includes('message') ? 1 : 5,
  });

  logger.debug('Webhook enqueued', {
    jobId: job.id,
    platform: data.platform,
    eventType: data.eventType,
  });

  return job.id.toString();
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}> {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    webhookQueue.getWaitingCount(),
    webhookQueue.getActiveCount(),
    webhookQueue.getCompletedCount(),
    webhookQueue.getFailedCount(),
    webhookQueue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed };
}

/**
 * Graceful shutdown
 */
export async function closeQueue(): Promise<void> {
  logger.info('Closing webhook queue...');
  await webhookQueue.close();
  logger.info('Webhook queue closed');
}

// Export queue for direct access if needed
export { webhookQueue };

// Start the worker when this file is run directly
if (require.main === module) {
  logger.info('Webhook processor worker started');
  
  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down webhook processor...');
    await closeQueue();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down webhook processor...');
    await closeQueue();
    process.exit(0);
  });
}
