import { db, redis, logger } from '../config';
import { io } from '../app';
import {
  Notification,
  AdminNotificationInput,
  ClientNotificationType,
  AdminNotificationType,
} from '../types';

// Simplified notification input for any notifications
interface NotifyInput {
  type: ClientNotificationType | AdminNotificationType;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export class NotificationService {
  private readonly NOTIFICATION_CHANNEL = 'notifications';

  /**
   * Create a notification for a specific user
   */
  async createNotification(
    userId: string,
    userType: 'client' | 'admin',
    input: NotifyInput
  ): Promise<Notification> {
    const result = await db.queryOne<Notification>(
      `INSERT INTO notifications 
       (user_id, user_type, type, title, message, metadata, priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        userId,
        userType,
        input.type,
        input.title,
        input.message,
        JSON.stringify(input.metadata || {}),
        input.priority || 'normal',
      ]
    );

    if (!result) {
      throw new Error('Failed to create notification');
    }

    // Publish to Redis for real-time delivery
    await this.publishNotification(userId, userType, result);

    logger.debug('Notification created', { id: result.id, userId, type: input.type });

    return result;
  }

  /**
   * Notify all admins
   */
  async notifyAdmins(input: AdminNotificationInput): Promise<void> {
    try {
      // Get all active admins
      const admins = await db.queryAll<{ id: string }>(
        'SELECT id FROM admin_users WHERE status = $1',
        ['active']
      );

      // Create notifications for all admins
      await Promise.all(
        admins.map((admin) =>
          this.createNotification(admin.id, 'admin', {
            type: input.type,
            title: input.title,
            message: input.message,
            metadata: {
              organizationId: input.organizationId,
              workflowRequestId: input.workflowRequestId,
              addonRequestId: input.addonRequestId,
              ...input,
            },
            priority: input.priority,
          })
        )
      );

      // Also store in admin notifications queue for dashboard
      await redis.lpush(
        'admin:notifications:queue',
        JSON.stringify({
          ...input,
          createdAt: new Date().toISOString(),
        })
      );

      // Trim queue to last 1000 entries
      await redis.ltrim('admin:notifications:queue', 0, 999);

      logger.info('Admins notified', { type: input.type, adminCount: admins.length });
    } catch (error) {
      logger.error('Failed to notify admins', { error, input });
    }
  }

  /**
   * Notify organization owner/members
   */
  async notifyClient(
    organizationId: string,
    input: NotifyInput
  ): Promise<void> {
    try {
      // Get organization owner
      const org = await db.queryOne<{ owner_id: string }>(
        'SELECT owner_id FROM organizations WHERE id = $1',
        [organizationId]
      );

      if (!org) {
        logger.warn('Organization not found for notification', { organizationId });
        return;
      }

      await this.createNotification(org.owner_id, 'client', input);

      logger.info('Client notified', { organizationId, userId: org.owner_id, type: input.type });
    } catch (error) {
      logger.error('Failed to notify client', { error, organizationId, input });
    }
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(
    userId: string,
    userType: 'client' | 'admin',
    options: {
      unreadOnly?: boolean;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ notifications: Notification[]; unreadCount: number }> {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const offset = (page - 1) * limit;

    let query = `
      SELECT * FROM notifications 
      WHERE user_id = $1 AND user_type = $2
    `;
    const params: any[] = [userId, userType];

    if (options.unreadOnly) {
      query += ' AND read_at IS NULL';
    }

    query += ' ORDER BY created_at DESC LIMIT $3 OFFSET $4';
    params.push(limit, offset);

    const notifications = await db.queryAll<Notification>(query, params);

    // Get unread count
    const unreadResult = await db.queryOne<{ count: string }>(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND user_type = $2 AND read_at IS NULL',
      [userId, userType]
    );
    const unreadCount = parseInt(unreadResult?.count || '0');

    return { notifications, unreadCount };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(
    notificationId: string,
    userId: string,
    userType: 'client' | 'admin'
  ): Promise<Notification | null> {
    const result = await db.queryOne<Notification>(
      `UPDATE notifications 
       SET read_at = NOW() 
       WHERE id = $1 AND user_id = $2 AND user_type = $3 AND read_at IS NULL
       RETURNING *`,
      [notificationId, userId, userType]
    );

    if (result) {
      logger.debug('Notification marked as read', { notificationId, userId });
    }

    return result;
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string, userType: 'client' | 'admin'): Promise<number> {
    const result = await db.query(
      `UPDATE notifications 
       SET read_at = NOW() 
       WHERE user_id = $1 AND user_type = $2 AND read_at IS NULL`,
      [userId, userType]
    );

    const count = result.rowCount || 0;
    logger.info('All notifications marked as read', { userId, count });

    return count;
  }

  /**
   * Delete old notifications
   */
  async deleteOldNotifications(daysOld: number = 30): Promise<number> {
    const result = await db.query(
      `DELETE FROM notifications 
       WHERE created_at < NOW() - INTERVAL '${daysOld} days' AND read_at IS NOT NULL`,
      []
    );

    const count = result.rowCount || 0;
    logger.info('Old notifications deleted', { daysOld, count });

    return count;
  }

  /**
   * Publish notification to Redis and Socket.IO for real-time delivery
   */
  private async publishNotification(
    userId: string,
    userType: 'client' | 'admin',
    notification: Notification
  ): Promise<void> {
    try {
      // Publish to Redis for cross-server communication
      await redis.publish(
        this.NOTIFICATION_CHANNEL,
        JSON.stringify({
          userId,
          userType,
          notification,
        })
      );

      // Emit directly via Socket.IO to the user's room
      const roomName = userType === 'admin' ? `admin:${userId}` : `client:${userId}`;
      io.to(roomName).emit('notification', {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        metadata: notification.metadata,
        is_read: notification.is_read,
        created_at: notification.created_at,
      });

      logger.debug('Notification published to Socket.IO', { userId, userType, roomName });
    } catch (error) {
      logger.error('Failed to publish notification', { error, userId });
    }
  }

  /**
   * Get admin notification queue (for dashboard)
   */
  async getAdminNotificationQueue(limit: number = 100): Promise<AdminNotificationInput[]> {
    const items = await redis.lrange('admin:notifications:queue', 0, limit - 1);
    return items.map((item) => JSON.parse(item));
  }

  // ============================================
  // Notification Types Helpers
  // ============================================

  /**
   * Notify when organization connects Meta account
   */
  async notifyMetaConnected(organizationId: string, platform: string): Promise<void> {
    // Get organization details
    const org = await db.queryOne<{ name: string }>(
      'SELECT name FROM organizations WHERE id = $1',
      [organizationId]
    );

    await this.notifyAdmins({
      type: 'meta_connected',
      title: 'Meta Account Connected',
      message: `${org?.name || 'Unknown'} has connected their ${platform} account`,
      organizationId,
      priority: 'normal',
    });
  }

  /**
   * Notify when organization adds a page
   */
  async notifyPageConnected(
    organizationId: string,
    pageName: string,
    platform: 'facebook' | 'instagram'
  ): Promise<void> {
    const org = await db.queryOne<{ name: string }>(
      'SELECT name FROM organizations WHERE id = $1',
      [organizationId]
    );

    await this.notifyAdmins({
      type: 'page_connected',
      title: `${platform === 'facebook' ? 'Facebook' : 'Instagram'} Page Connected`,
      message: `${org?.name || 'Unknown'} connected page: ${pageName}`,
      organizationId,
      priority: 'normal',
    });
  }

  /**
   * Notify when new organization signs up
   */
  async notifyNewOrganization(organizationId: string, organizationName: string): Promise<void> {
    await this.notifyAdmins({
      type: 'new_signup',
      title: 'New Organization Signup',
      message: `New organization registered: ${organizationName}`,
      organizationId,
      priority: 'high',
    });
  }

  /**
   * Notify token expiration
   */
  async notifyTokenExpiring(
    organizationId: string,
    pageId: string,
    pageName: string,
    daysUntilExpiry: number
  ): Promise<void> {
    // Notify client
    await this.notifyClient(organizationId, {
      type: 'token_expiring',
      title: 'Access Token Expiring Soon',
      message: `Your access token for ${pageName} will expire in ${daysUntilExpiry} days. Please reconnect your account.`,
      metadata: { pageId, daysUntilExpiry },
      priority: daysUntilExpiry <= 3 ? 'high' : 'normal',
    });

    // Notify admins for urgent cases
    if (daysUntilExpiry <= 7) {
      await this.notifyAdmins({
        type: 'token_expiring',
        title: 'Client Token Expiring',
        message: `Token for page ${pageName} expires in ${daysUntilExpiry} days`,
        organizationId,
        priority: daysUntilExpiry <= 3 ? 'urgent' : 'high',
      });
    }
  }

  /**
   * Notify webhook failure
   */
  async notifyWebhookFailure(
    organizationId: string,
    webhookUrl: string,
    errorMessage: string
  ): Promise<void> {
    await this.notifyAdmins({
      type: 'webhook_failed',
      title: 'Webhook Delivery Failed',
      message: `Webhook to ${webhookUrl} failed: ${errorMessage}`,
      organizationId,
      priority: 'high',
    });
  }
}

export const notificationService = new NotificationService();
export default notificationService;
