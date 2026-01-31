import { db, logger } from '../config';

// Use any types for analytics to avoid type mismatches
type AnalyticsSummary = any;
type OrganizationAnalytics = any;
type AdminDashboardStats = any;

export class AnalyticsService {
  // ============================================
  // Organization Analytics
  // ============================================

  /**
   * Get analytics for an organization
   */
  async getOrganizationAnalytics(
    organizationId: string,
    dateRange: { from: Date; to: Date }
  ): Promise<OrganizationAnalytics> {
    const [
      conversationStats,
      messageStats,
      workflowStats,
      pageStats,
    ] = await Promise.all([
      this.getConversationStats(organizationId, dateRange),
      this.getMessageStats(organizationId, dateRange),
      this.getWorkflowStats(organizationId, dateRange),
      this.getPageStats(organizationId),
    ]);

    return {
      organizationId,
      dateRange,
      conversations: conversationStats,
      messages: messageStats,
      workflows: workflowStats,
      pages: pageStats,
    };
  }

  private async getConversationStats(
    organizationId: string,
    dateRange: { from: Date; to: Date }
  ): Promise<{
    total: number;
    active: number;
    resolved: number;
    avgDuration: number;
  }> {
    const stats = await db.queryOne<{
      total: string;
      active: string;
      resolved: string;
      avg_duration: string;
    }>(
      `SELECT 
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE status = 'active') as active,
         COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
         AVG(EXTRACT(EPOCH FROM (last_message_at - started_at))) as avg_duration
       FROM conversations
       WHERE organization_id = $1 
       AND started_at BETWEEN $2 AND $3`,
      [organizationId, dateRange.from, dateRange.to]
    );

    return {
      total: parseInt(stats?.total || '0'),
      active: parseInt(stats?.active || '0'),
      resolved: parseInt(stats?.resolved || '0'),
      avgDuration: parseFloat(stats?.avg_duration || '0'),
    };
  }

  private async getMessageStats(
    organizationId: string,
    dateRange: { from: Date; to: Date }
  ): Promise<{
    totalReceived: number;
    totalSent: number;
    avgResponseTime: number;
    aiHandled: number;
    humanHandled: number;
  }> {
    const stats = await db.queryOne<{
      total_received: string;
      total_sent: string;
      avg_response_time: string;
      ai_handled: string;
      human_handled: string;
    }>(
      `SELECT 
         COUNT(*) FILTER (WHERE direction = 'inbound') as total_received,
         COUNT(*) FILTER (WHERE direction = 'outbound') as total_sent,
         AVG(response_time_ms) FILTER (WHERE response_time_ms IS NOT NULL) as avg_response_time,
         COUNT(*) FILTER (WHERE handled_by = 'ai') as ai_handled,
         COUNT(*) FILTER (WHERE handled_by = 'human') as human_handled
       FROM messages m
       JOIN conversations c ON c.id = m.conversation_id
       WHERE c.organization_id = $1 
       AND m.created_at BETWEEN $2 AND $3`,
      [organizationId, dateRange.from, dateRange.to]
    );

    return {
      totalReceived: parseInt(stats?.total_received || '0'),
      totalSent: parseInt(stats?.total_sent || '0'),
      avgResponseTime: parseFloat(stats?.avg_response_time || '0'),
      aiHandled: parseInt(stats?.ai_handled || '0'),
      humanHandled: parseInt(stats?.human_handled || '0'),
    };
  }

  private async getWorkflowStats(
    organizationId: string,
    dateRange: { from: Date; to: Date }
  ): Promise<{
    totalTriggers: number;
    successRate: number;
    topWorkflows: Array<{ id: string; name: string; triggers: number }>;
  }> {
    const triggers = await db.queryOne<{
      total: string;
      success: string;
    }>(
      `SELECT 
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE status = 'success') as success
       FROM webhook_logs
       WHERE organization_id = $1 
       AND created_at BETWEEN $2 AND $3`,
      [organizationId, dateRange.from, dateRange.to]
    );

    const topWorkflows = await db.queryAll<{ id: string; name: string; triggers: string }>(
      `SELECT w.id, w.name, COUNT(*) as triggers
       FROM webhook_logs wl
       JOIN n8n_workflows w ON w.id = wl.workflow_id
       WHERE wl.organization_id = $1 
       AND wl.created_at BETWEEN $2 AND $3
       GROUP BY w.id, w.name
       ORDER BY triggers DESC
       LIMIT 5`,
      [organizationId, dateRange.from, dateRange.to]
    );

    const total = parseInt(triggers?.total || '0');
    const success = parseInt(triggers?.success || '0');

    return {
      totalTriggers: total,
      successRate: total > 0 ? (success / total) * 100 : 0,
      topWorkflows: topWorkflows.map(w => ({
        id: w.id,
        name: w.name,
        triggers: parseInt(w.triggers),
      })),
    };
  }

  private async getPageStats(organizationId: string): Promise<{
    facebookPages: number;
    instagramAccounts: number;
    activePages: number;
  }> {
    const stats = await db.queryOne<{
      facebook: string;
      instagram: string;
      active: string;
    }>(
      `SELECT 
         (SELECT COUNT(*) FROM facebook_pages WHERE organization_id = $1) as facebook,
         (SELECT COUNT(*) FROM instagram_accounts WHERE organization_id = $1) as instagram,
         (SELECT COUNT(*) FROM facebook_pages WHERE organization_id = $1 AND is_active = true) +
         (SELECT COUNT(*) FROM instagram_accounts WHERE organization_id = $1 AND is_active = true) as active`,
      [organizationId]
    );

    return {
      facebookPages: parseInt(stats?.facebook || '0'),
      instagramAccounts: parseInt(stats?.instagram || '0'),
      activePages: parseInt(stats?.active || '0'),
    };
  }

  // ============================================
  // Admin Dashboard Analytics
  // ============================================

  /**
   * Get admin dashboard statistics
   */
  async getAdminDashboardStats(): Promise<AdminDashboardStats> {
    const [
      orgStats,
      workflowRequestStats,
      addonStats,
      recentActivity,
    ] = await Promise.all([
      this.getOrganizationOverview(),
      this.getWorkflowRequestOverview(),
      this.getAddonRequestOverview(),
      this.getRecentActivity(),
    ]);

    return {
      organizations: orgStats,
      workflowRequests: workflowRequestStats,
      addons: addonStats,
      recentActivity,
    };
  }

  private async getOrganizationOverview(): Promise<{
    total: number;
    active: number;
    newThisMonth: number;
    byPlan: Record<string, number>;
  }> {
    const stats = await db.queryOne<{
      total: string;
      active: string;
      new_this_month: string;
    }>(
      `SELECT 
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE status = 'active') as active,
         COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as new_this_month
       FROM organizations`,
      []
    );

    const byPlan = await db.queryAll<{ plan_type: string; count: string }>(
      `SELECT plan_type, COUNT(*) as count 
       FROM organizations 
       GROUP BY plan_type`,
      []
    );

    return {
      total: parseInt(stats?.total || '0'),
      active: parseInt(stats?.active || '0'),
      newThisMonth: parseInt(stats?.new_this_month || '0'),
      byPlan: byPlan.reduce((acc, p) => {
        acc[p.plan_type] = parseInt(p.count);
        return acc;
      }, {} as Record<string, number>),
    };
  }

  private async getWorkflowRequestOverview(): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    byType: Record<string, number>;
  }> {
    const stats = await db.queryOne<{
      total: string;
      pending: string;
      in_progress: string;
      completed: string;
    }>(
      `SELECT 
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE status = 'pending') as pending,
         COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
         COUNT(*) FILTER (WHERE status = 'completed') as completed
       FROM workflow_requests`,
      []
    );

    const byType = await db.queryAll<{ request_type: string; count: string }>(
      `SELECT request_type, COUNT(*) as count 
       FROM workflow_requests 
       GROUP BY request_type`,
      []
    );

    return {
      total: parseInt(stats?.total || '0'),
      pending: parseInt(stats?.pending || '0'),
      inProgress: parseInt(stats?.in_progress || '0'),
      completed: parseInt(stats?.completed || '0'),
      byType: byType.reduce((acc, t) => {
        acc[t.request_type] = parseInt(t.count);
        return acc;
      }, {} as Record<string, number>),
    };
  }

  private async getAddonRequestOverview(): Promise<{
    total: number;
    pending: number;
    configured: number;
    byType: Record<string, number>;
  }> {
    const stats = await db.queryOne<{
      total: string;
      pending: string;
      configured: string;
    }>(
      `SELECT 
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE status = 'pending') as pending,
         COUNT(*) FILTER (WHERE status IN ('configured', 'active')) as configured
       FROM addon_requests`,
      []
    );

    const byType = await db.queryAll<{ addon_type: string; count: string }>(
      `SELECT addon_type, COUNT(*) as count 
       FROM addon_requests 
       GROUP BY addon_type`,
      []
    );

    return {
      total: parseInt(stats?.total || '0'),
      pending: parseInt(stats?.pending || '0'),
      configured: parseInt(stats?.configured || '0'),
      byType: byType.reduce((acc, t) => {
        acc[t.addon_type] = parseInt(t.count);
        return acc;
      }, {} as Record<string, number>),
    };
  }

  private async getRecentActivity(): Promise<Array<{
    type: string;
    description: string;
    organizationId?: string;
    organizationName?: string;
    timestamp: Date;
  }>> {
    // Get recent signups
    const recentSignups = await db.queryAll<{
      id: string;
      name: string;
      created_at: Date;
    }>(
      `SELECT id, name, created_at 
       FROM organizations 
       ORDER BY created_at DESC 
       LIMIT 5`,
      []
    );

    // Get recent workflow requests
    const recentRequests = await db.queryAll<{
      id: string;
      title: string;
      organization_id: string;
      organization_name: string;
      created_at: Date;
    }>(
      `SELECT wr.id, wr.title, wr.organization_id, o.name as organization_name, wr.created_at
       FROM workflow_requests wr
       JOIN organizations o ON o.id = wr.organization_id
       ORDER BY wr.created_at DESC
       LIMIT 5`,
      []
    );

    // Combine and sort
    const activity = [
      ...recentSignups.map(s => ({
        type: 'new_signup',
        description: `New organization: ${s.name}`,
        organizationId: s.id,
        organizationName: s.name,
        timestamp: s.created_at,
      })),
      ...recentRequests.map(r => ({
        type: 'workflow_request',
        description: `Workflow request: ${r.title}`,
        organizationId: r.organization_id,
        organizationName: r.organization_name,
        timestamp: r.created_at,
      })),
    ];

    return activity.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ).slice(0, 10);
  }

  // ============================================
  // Time Series Data
  // ============================================

  /**
   * Get daily statistics for charting
   */
  async getDailyStats(
    organizationId: string | null,
    metric: 'messages' | 'conversations' | 'workflows',
    days: number = 30
  ): Promise<Array<{ date: string; count: number }>> {
    let query: string;
    const params: any[] = [];

    switch (metric) {
      case 'messages':
        query = `
          SELECT DATE(m.created_at) as date, COUNT(*) as count
          FROM messages m
          JOIN conversations c ON c.id = m.conversation_id
          WHERE m.created_at > NOW() - INTERVAL '${days} days'
          ${organizationId ? 'AND c.organization_id = $1' : ''}
          GROUP BY DATE(m.created_at)
          ORDER BY date
        `;
        break;

      case 'conversations':
        query = `
          SELECT DATE(started_at) as date, COUNT(*) as count
          FROM conversations
          WHERE started_at > NOW() - INTERVAL '${days} days'
          ${organizationId ? 'AND organization_id = $1' : ''}
          GROUP BY DATE(started_at)
          ORDER BY date
        `;
        break;

      case 'workflows':
        query = `
          SELECT DATE(created_at) as date, COUNT(*) as count
          FROM webhook_logs
          WHERE created_at > NOW() - INTERVAL '${days} days'
          ${organizationId ? 'AND organization_id = $1' : ''}
          GROUP BY DATE(created_at)
          ORDER BY date
        `;
        break;

      default:
        throw new Error('Invalid metric');
    }

    if (organizationId) {
      params.push(organizationId);
    }

    const results = await db.queryAll<{ date: string; count: string }>(query, params);

    return results.map(r => ({
      date: r.date,
      count: parseInt(r.count),
    }));
  }

  /**
   * Get platform breakdown
   */
  async getPlatformBreakdown(
    organizationId: string
  ): Promise<Array<{ platform: string; conversations: number; messages: number }>> {
    const results = await db.queryAll<{
      platform: string;
      conversations: string;
      messages: string;
    }>(
      `SELECT 
         c.platform,
         COUNT(DISTINCT c.id) as conversations,
         COUNT(m.id) as messages
       FROM conversations c
       LEFT JOIN messages m ON m.conversation_id = c.id
       WHERE c.organization_id = $1
       GROUP BY c.platform`,
      [organizationId]
    );

    return results.map(r => ({
      platform: r.platform,
      conversations: parseInt(r.conversations),
      messages: parseInt(r.messages),
    }));
  }

  /**
   * Log analytics event (for tracking custom events)
   */
  async logEvent(
    organizationId: string,
    eventType: string,
    metadata: Record<string, any>
  ): Promise<void> {
    await db.query(
      `INSERT INTO analytics_events (organization_id, event_type, metadata)
       VALUES ($1, $2, $3)`,
      [organizationId, eventType, JSON.stringify(metadata)]
    );

    logger.debug('Analytics event logged', { organizationId, eventType });
  }

  // ============================================
  // Webhook Performance Analytics
  // ============================================

  async getWebhookPerformance(
    organizationId: string | null,
    days: number = 30
  ): Promise<{
    totalDeliveries: number;
    successRate: number;
    avgResponseTime: number;
    failuresByType: Array<{ error: string; count: number }>;
    dailyStats: Array<{ date: string; success: number; failed: number }>;
  }> {
    const orgFilter = organizationId ? 'AND organization_id = $1' : '';
    const params: any[] = organizationId ? [organizationId] : [];

    const totals = await db.queryOne<{
      total: string;
      success: string;
      avg_response: string;
    }>(
      `SELECT
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE status = 'success') as success,
         AVG(response_status) FILTER (WHERE response_status IS NOT NULL) as avg_response
       FROM webhook_logs
       WHERE created_at > NOW() - INTERVAL '${days} days' ${orgFilter}`,
      params
    );

    const failures = await db.queryAll<{ error: string; count: string }>(
      `SELECT COALESCE(error_message, 'Unknown error') as error, COUNT(*) as count
       FROM webhook_logs
       WHERE status = 'failed' AND created_at > NOW() - INTERVAL '${days} days' ${orgFilter}
       GROUP BY error_message
       ORDER BY count DESC
       LIMIT 10`,
      params
    );

    const daily = await db.queryAll<{ date: string; success: string; failed: string }>(
      `SELECT
         DATE(created_at) as date,
         COUNT(*) FILTER (WHERE status = 'success') as success,
         COUNT(*) FILTER (WHERE status = 'failed') as failed
       FROM webhook_logs
       WHERE created_at > NOW() - INTERVAL '${days} days' ${orgFilter}
       GROUP BY DATE(created_at)
       ORDER BY date`,
      params
    );

    const total = parseInt(totals?.total || '0');
    const success = parseInt(totals?.success || '0');

    return {
      totalDeliveries: total,
      successRate: total > 0 ? (success / total) * 100 : 0,
      avgResponseTime: parseFloat(totals?.avg_response || '0'),
      failuresByType: failures.map(f => ({ error: f.error, count: parseInt(f.count) })),
      dailyStats: daily.map(d => ({
        date: d.date,
        success: parseInt(d.success),
        failed: parseInt(d.failed),
      })),
    };
  }

  // ============================================
  // Usage & Billing Analytics
  // ============================================

  async getUsageAnalytics(
    organizationId: string,
    days: number = 30
  ): Promise<{
    conversations: { current: number; limit: number | null };
    connectedPages: { current: number; limit: number | null };
    webhookDeliveries: number;
    storageUsedMb: number;
    dailyUsage: Array<{ date: string; conversations: number; messages: number }>;
  }> {
    const [convCount, pageCount, webhookCount, dailyUsage] = await Promise.all([
      db.queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM conversations
         WHERE organization_id = $1 AND started_at > NOW() - INTERVAL '${days} days'`,
        [organizationId]
      ),
      db.queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM facebook_pages
         WHERE organization_id = $1 AND is_active = true`,
        [organizationId]
      ),
      db.queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM webhook_logs
         WHERE organization_id = $1 AND created_at > NOW() - INTERVAL '${days} days'`,
        [organizationId]
      ),
      db.queryAll<{ date: string; conversations: string; messages: string }>(
        `SELECT
           d.date,
           COALESCE(c.conv_count, 0) as conversations,
           COALESCE(m.msg_count, 0) as messages
         FROM generate_series(
           NOW() - INTERVAL '${days} days', NOW(), '1 day'
         ) as d(date)
         LEFT JOIN (
           SELECT DATE(started_at) as date, COUNT(*) as conv_count
           FROM conversations WHERE organization_id = $1
           GROUP BY DATE(started_at)
         ) c ON DATE(d.date) = c.date
         LEFT JOIN (
           SELECT DATE(m.created_at) as date, COUNT(*) as msg_count
           FROM messages m
           JOIN conversations cv ON cv.id = m.conversation_id
           WHERE cv.organization_id = $1
           GROUP BY DATE(m.created_at)
         ) m ON DATE(d.date) = m.date
         ORDER BY d.date`,
        [organizationId]
      ),
    ]);

    // Get plan limits from subscription
    const sub = await db.queryOne<{ plan_slug: string }>(
      `SELECT sp.slug as plan_slug
       FROM subscriptions s
       JOIN subscription_plans sp ON sp.id = s.plan_id
       WHERE s.organization_id = $1 AND s.status = 'active'`,
      [organizationId]
    );

    const planLimits: Record<string, { conversations: number | null; pages: number | null }> = {
      free: { conversations: 100, pages: 2 },
      starter: { conversations: 1000, pages: 10 },
      professional: { conversations: 5000, pages: 50 },
      enterprise: { conversations: null, pages: null },
    };

    const limits = planLimits[sub?.plan_slug || 'free'] || planLimits.free;

    return {
      conversations: {
        current: parseInt(convCount?.count || '0'),
        limit: limits.conversations,
      },
      connectedPages: {
        current: parseInt(pageCount?.count || '0'),
        limit: limits.pages,
      },
      webhookDeliveries: parseInt(webhookCount?.count || '0'),
      storageUsedMb: 0, // placeholder until S3 integration
      dailyUsage: dailyUsage.map(d => ({
        date: d.date,
        conversations: parseInt(String(d.conversations)),
        messages: parseInt(String(d.messages)),
      })),
    };
  }

  // ============================================
  // Admin Revenue Analytics
  // ============================================

  async getRevenueAnalytics(days: number = 30): Promise<{
    totalRevenue: number;
    monthlyRecurring: number;
    activeSubscriptions: number;
    churnRate: number;
    revenueByPlan: Array<{ plan: string; revenue: number; count: number }>;
    dailyRevenue: Array<{ date: string; amount: number }>;
  }> {
    const [revenue, mrr, byPlan, dailyRev, churn] = await Promise.all([
      db.queryOne<{ total: string }>(
        `SELECT COALESCE(SUM(amount), 0) as total FROM payments
         WHERE status = 'succeeded' AND created_at > NOW() - INTERVAL '${days} days'`,
        []
      ),
      db.queryOne<{ mrr: string; active_count: string }>(
        `SELECT
           COALESCE(SUM(sp.price_monthly), 0) as mrr,
           COUNT(*) as active_count
         FROM subscriptions s
         JOIN subscription_plans sp ON sp.id = s.plan_id
         WHERE s.status = 'active'`,
        []
      ),
      db.queryAll<{ plan: string; revenue: string; count: string }>(
        `SELECT sp.name as plan, COALESCE(SUM(p.amount), 0) as revenue, COUNT(DISTINCT s.id) as count
         FROM subscription_plans sp
         LEFT JOIN subscriptions s ON s.plan_id = sp.id AND s.status = 'active'
         LEFT JOIN payments p ON p.subscription_id = s.id AND p.status = 'succeeded'
           AND p.created_at > NOW() - INTERVAL '${days} days'
         GROUP BY sp.name
         ORDER BY revenue DESC`,
        []
      ),
      db.queryAll<{ date: string; amount: string }>(
        `SELECT DATE(created_at) as date, COALESCE(SUM(amount), 0) as amount
         FROM payments
         WHERE status = 'succeeded' AND created_at > NOW() - INTERVAL '${days} days'
         GROUP BY DATE(created_at)
         ORDER BY date`,
        []
      ),
      db.queryOne<{ churned: string; total_start: string }>(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'cancelled' AND updated_at > NOW() - INTERVAL '${days} days') as churned,
           COUNT(*) FILTER (WHERE created_at < NOW() - INTERVAL '${days} days') as total_start
         FROM subscriptions`,
        []
      ),
    ]);

    const churned = parseInt(churn?.churned || '0');
    const totalStart = parseInt(churn?.total_start || '0');

    return {
      totalRevenue: parseFloat(revenue?.total || '0'),
      monthlyRecurring: parseFloat(mrr?.mrr || '0'),
      activeSubscriptions: parseInt(mrr?.active_count || '0'),
      churnRate: totalStart > 0 ? (churned / totalStart) * 100 : 0,
      revenueByPlan: byPlan.map(p => ({
        plan: p.plan,
        revenue: parseFloat(p.revenue),
        count: parseInt(p.count),
      })),
      dailyRevenue: dailyRev.map(d => ({
        date: d.date,
        amount: parseFloat(d.amount),
      })),
    };
  }

  // ============================================
  // System Health Analytics (Admin)
  // ============================================

  async getSystemHealth(): Promise<{
    webhookSuccessRate24h: number;
    activeConnections: number;
    tokensExpiringSoon: number;
    failedWebhooks24h: number;
    pendingWorkflowRequests: number;
  }> {
    const [webhookHealth, tokens, pendingWr] = await Promise.all([
      db.queryOne<{ total: string; success: string; failed: string }>(
        `SELECT
           COUNT(*) as total,
           COUNT(*) FILTER (WHERE status = 'success') as success,
           COUNT(*) FILTER (WHERE status = 'failed') as failed
         FROM webhook_logs
         WHERE created_at > NOW() - INTERVAL '24 hours'`,
        []
      ),
      db.queryOne<{ expiring: string }>(
        `SELECT COUNT(*) as expiring FROM meta_tokens
         WHERE expires_at BETWEEN NOW() AND NOW() + INTERVAL '7 days'`,
        []
      ),
      db.queryOne<{ pending: string }>(
        `SELECT COUNT(*) as pending FROM workflow_requests WHERE status = 'pending'`,
        []
      ),
    ]);

    const total = parseInt(webhookHealth?.total || '0');
    const success = parseInt(webhookHealth?.success || '0');

    return {
      webhookSuccessRate24h: total > 0 ? (success / total) * 100 : 100,
      activeConnections: parseInt(webhookHealth?.total || '0'),
      tokensExpiringSoon: parseInt(tokens?.expiring || '0'),
      failedWebhooks24h: parseInt(webhookHealth?.failed || '0'),
      pendingWorkflowRequests: parseInt(pendingWr?.pending || '0'),
    };
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;
