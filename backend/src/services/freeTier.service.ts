/**
 * Free Tier Service
 * Manages automatic free tier connections and trial periods
 */

import { db } from '../config/database';
import { logger } from '../config';
import { platformSettingsService } from './platformSettings.service';
import { notificationService } from './notification.service';

export interface FreeTierConnection {
  id: string;
  organization_id: string;
  user_id: string;
  webhook_url: string;
  connected_at: Date;
  disconnected_at: Date | null;
  disconnection_reason: 'trial_expired' | 'manual' | 'upgraded' | 'suspended' | null;
  created_at: Date;
}

export interface Organization {
  id: string;
  owner_id: string;
  name: string;
  plan_type: string;
  free_tier_trial_started_at: Date | null;
  free_tier_trial_ends_at: Date | null;
  free_tier_auto_connected: boolean;
  n8n_base_webhook_url: string | null;
}

export class FreeTierService {
  /**
   * Auto-connect a user to the free tier webhook when they connect a social account
   * This is called after successful Meta OAuth callback
   */
  async autoConnectFreeTier(organizationId: string, userId: string): Promise<{
    connected: boolean;
    webhookUrl: string | null;
    trialEndsAt: Date | null;
  }> {
    // Get the free tier webhook URL from platform settings
    const freeTierWebhookUrl = await platformSettingsService.getFreeTierWebhookUrl();
    
    if (!freeTierWebhookUrl) {
      logger.warn('Free tier webhook URL not configured, skipping auto-connect', { organizationId });
      return { connected: false, webhookUrl: null, trialEndsAt: null };
    }

    // Get trial duration
    const trialHours = await platformSettingsService.getFreeTierTrialHours();
    
    // Check if org already has a paid subscription or is already connected
    const org = await db.queryOne<Organization>(
      `SELECT id, owner_id, name, plan_type, free_tier_auto_connected, n8n_base_webhook_url,
              free_tier_trial_started_at, free_tier_trial_ends_at
       FROM organizations WHERE id = $1`,
      [organizationId]
    );

    if (!org) {
      throw new Error(`Organization not found: ${organizationId}`);
    }

    // Don't auto-connect if already connected
    if (org.free_tier_auto_connected) {
      logger.info('Organization already connected to free tier', { organizationId });
      return { 
        connected: true, 
        webhookUrl: org.n8n_base_webhook_url, 
        trialEndsAt: org.free_tier_trial_ends_at 
      };
    }

    // Don't auto-connect if they have a paid plan
    if (org.plan_type !== 'free') {
      logger.info('Organization has paid plan, skipping free tier auto-connect', { 
        organizationId, 
        planType: org.plan_type 
      });
      return { connected: false, webhookUrl: null, trialEndsAt: null };
    }

    // Calculate trial end time
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + trialHours * 60 * 60 * 1000);

    // Begin transaction to update organization and log connection
    await db.transaction(async (client) => {
      // Update organization with free tier webhook and trial info
      await client.query(
        `UPDATE organizations SET
           n8n_base_webhook_url = $1,
           free_tier_trial_started_at = $2,
           free_tier_trial_ends_at = $3,
           free_tier_auto_connected = TRUE,
           updated_at = NOW()
         WHERE id = $4`,
        [freeTierWebhookUrl, now, trialEndsAt, organizationId]
      );

      // Log the connection
      await client.query(
        `INSERT INTO free_tier_connections 
           (organization_id, user_id, webhook_url, connected_at)
         VALUES ($1, $2, $3, $4)`,
        [organizationId, userId, freeTierWebhookUrl, now]
      );
    });

    logger.info('Auto-connected organization to free tier', {
      organizationId,
      userId,
      webhookUrl: freeTierWebhookUrl,
      trialEndsAt,
      trialHours,
    });

    // Send notification to user
    await notificationService.notifyClient(organizationId, {
      type: 'trial_started',
      title: '🎉 Free Trial Activated!',
      message: `Your ${trialHours}-hour free trial has started! Your chatbot is now active and will respond to messages automatically.`,
      metadata: {
        trialEndsAt: trialEndsAt.toISOString(),
        trialHours,
      },
    });

    return { 
      connected: true, 
      webhookUrl: freeTierWebhookUrl, 
      trialEndsAt 
    };
  }

  /**
   * Disconnect an organization from free tier (trial expired, manual, upgraded, or suspended)
   */
  async disconnectFreeTier(
    organizationId: string,
    reason: 'trial_expired' | 'manual' | 'upgraded' | 'suspended'
  ): Promise<void> {
    await db.transaction(async (client) => {
      // Update organization
      await client.query(
        `UPDATE organizations SET
           n8n_base_webhook_url = NULL,
           free_tier_auto_connected = FALSE,
           updated_at = NOW()
         WHERE id = $1`,
        [organizationId]
      );

      // Update connection log
      await client.query(
        `UPDATE free_tier_connections SET
           disconnected_at = NOW(),
           disconnection_reason = $1
         WHERE organization_id = $2 AND disconnected_at IS NULL`,
        [reason, organizationId]
      );
    });

    logger.info('Disconnected organization from free tier', { organizationId, reason });

    // Send appropriate notification based on reason
    const notifications: Record<string, { title: string; message: string }> = {
      trial_expired: {
        title: '⏰ Free Trial Ended',
        message: 'Your free trial has expired. Upgrade to a paid plan to continue enjoying AI-powered automation!',
      },
      manual: {
        title: 'Webhook Disconnected',
        message: 'Your free tier webhook has been disconnected by an administrator.',
      },
      upgraded: {
        title: '🎉 Plan Upgraded!',
        message: 'Congratulations on upgrading! You now have access to dedicated webhook support.',
      },
      suspended: {
        title: '⚠️ Service Suspended',
        message: 'Your service has been temporarily suspended. Please contact support for assistance.',
      },
    };

    const notification = notifications[reason];
    if (notification) {
      await notificationService.notifyClient(organizationId, {
        type: reason === 'trial_expired' ? 'trial_ended' : 'settings_updated',
        title: notification.title,
        message: notification.message,
        metadata: { reason },
      });
    }
  }

  /**
   * Get all organizations with expired free tier trials that need disconnection
   */
  async getExpiredTrials(): Promise<Organization[]> {
    const results = await db.queryAll<Organization>(
      `SELECT id, owner_id, name, plan_type, free_tier_trial_started_at, 
              free_tier_trial_ends_at, free_tier_auto_connected, n8n_base_webhook_url
       FROM organizations
       WHERE free_tier_auto_connected = TRUE
         AND free_tier_trial_ends_at IS NOT NULL
         AND free_tier_trial_ends_at < NOW()`
    );

    return results;
  }

  /**
   * Process all expired free tier trials and disconnect them
   */
  async processExpiredTrials(): Promise<number> {
    const expiredOrgs = await this.getExpiredTrials();
    
    if (expiredOrgs.length === 0) {
      logger.debug('No expired free tier trials to process');
      return 0;
    }

    logger.info(`Processing ${expiredOrgs.length} expired free tier trials`);

    let disconnectedCount = 0;
    for (const org of expiredOrgs) {
      try {
        await this.disconnectFreeTier(org.id, 'trial_expired');
        disconnectedCount++;
      } catch (error) {
        logger.error('Failed to disconnect expired trial', { 
          organizationId: org.id, 
          error 
        });
      }
    }

    logger.info(`Disconnected ${disconnectedCount} expired free tier trials`);
    return disconnectedCount;
  }

  /**
   * Get free tier connection status for an organization
   */
  async getConnectionStatus(organizationId: string): Promise<{
    isConnected: boolean;
    trialStartedAt: Date | null;
    trialEndsAt: Date | null;
    webhookUrl: string | null;
    timeRemaining: number | null; // milliseconds
  }> {
    const org = await db.queryOne<Organization>(
      `SELECT free_tier_auto_connected, free_tier_trial_started_at, 
              free_tier_trial_ends_at, n8n_base_webhook_url
       FROM organizations WHERE id = $1`,
      [organizationId]
    );

    if (!org) {
      throw new Error(`Organization not found: ${organizationId}`);
    }

    const now = new Date();
    let timeRemaining: number | null = null;

    if (org.free_tier_auto_connected && org.free_tier_trial_ends_at) {
      const endsAt = new Date(org.free_tier_trial_ends_at);
      timeRemaining = Math.max(0, endsAt.getTime() - now.getTime());
    }

    return {
      isConnected: org.free_tier_auto_connected,
      trialStartedAt: org.free_tier_trial_started_at,
      trialEndsAt: org.free_tier_trial_ends_at,
      webhookUrl: org.n8n_base_webhook_url,
      timeRemaining,
    };
  }

  /**
   * Get connection history for an organization
   */
  async getConnectionHistory(organizationId: string): Promise<FreeTierConnection[]> {
    return db.queryAll<FreeTierConnection>(
      `SELECT * FROM free_tier_connections 
       WHERE organization_id = $1 
       ORDER BY connected_at DESC`,
      [organizationId]
    );
  }
}

export const freeTierService = new FreeTierService();
