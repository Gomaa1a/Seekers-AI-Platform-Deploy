/**
 * Platform Settings Service
 * Manages global admin-configurable platform settings
 */

import { db } from '../config/database';
import { logger } from '../config';

export interface PlatformSetting {
  key: string;
  value: any;
  description?: string;
  updated_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface PlatformSettingsMap {
  free_tier_webhook_url: string;
  free_tier_trial_hours: number;
  maintenance_mode: boolean;
  meta_app_id: string;
  meta_app_secret: string;
  pricing_tiers: {
    free: number;
    starter: number;
    professional: number;
    enterprise: number;
  };
}

export class PlatformSettingsService {
  /**
   * Get a single setting by key
   */
  async getSetting<K extends keyof PlatformSettingsMap>(key: K): Promise<PlatformSettingsMap[K] | null> {
    const result = await db.queryOne<PlatformSetting>(
      'SELECT * FROM platform_settings WHERE key = $1',
      [key]
    );

    if (!result) {
      logger.warn(`Platform setting not found: ${key}`);
      return null;
    }

    return result.value;
  }

  /**
   * Get all platform settings as a map
   */
  async getAllSettings(): Promise<Partial<PlatformSettingsMap>> {
    const results = await db.queryAll<PlatformSetting>(
      'SELECT * FROM platform_settings ORDER BY key'
    );

    const settings: Partial<PlatformSettingsMap> = {};
    for (const row of results) {
      (settings as any)[row.key] = row.value;
    }

    return settings;
  }

  /**
   * Update a single setting
   */
  async updateSetting<K extends keyof PlatformSettingsMap>(
    key: K,
    value: PlatformSettingsMap[K],
    adminId?: string
  ): Promise<PlatformSetting> {
    const result = await db.queryOne<PlatformSetting>(
      `INSERT INTO platform_settings (key, value, updated_by)
       VALUES ($1, $2::jsonb, $3)
       ON CONFLICT (key) 
       DO UPDATE SET 
         value = $2::jsonb,
         updated_by = COALESCE($3, platform_settings.updated_by),
         updated_at = NOW()
       RETURNING *`,
      [key, JSON.stringify(value), adminId]
    );

    if (!result) {
      throw new Error(`Failed to update setting: ${key}`);
    }

    logger.info('Platform setting updated', { key, adminId });
    return result;
  }

  /**
   * Update multiple settings at once
   */
  async updateSettings(
    settings: Partial<PlatformSettingsMap>,
    adminId?: string
  ): Promise<void> {
    await db.transaction(async (client) => {
      for (const [key, value] of Object.entries(settings)) {
        await client.query(
          `INSERT INTO platform_settings (key, value, updated_by)
           VALUES ($1, $2::jsonb, $3)
           ON CONFLICT (key) 
           DO UPDATE SET 
             value = $2::jsonb,
             updated_by = COALESCE($3, platform_settings.updated_by),
             updated_at = NOW()`,
          [key, JSON.stringify(value), adminId]
        );
      }
    });

    logger.info('Platform settings updated', { keys: Object.keys(settings), adminId });
  }

  /**
   * Get the free tier webhook URL
   */
  async getFreeTierWebhookUrl(): Promise<string | null> {
    return this.getSetting('free_tier_webhook_url');
  }

  /**
   * Get the free tier trial duration in hours
   */
  async getFreeTierTrialHours(): Promise<number> {
    const hours = await this.getSetting('free_tier_trial_hours');
    return hours ?? 24; // Default to 24 hours
  }

  /**
   * Check if maintenance mode is enabled
   */
  async isMaintenanceMode(): Promise<boolean> {
    const mode = await this.getSetting('maintenance_mode');
    return mode === true;
  }

  /**
   * Set maintenance mode
   */
  async setMaintenanceMode(enabled: boolean, adminId?: string): Promise<void> {
    await this.updateSetting('maintenance_mode', enabled, adminId);
    logger.info(`Maintenance mode ${enabled ? 'enabled' : 'disabled'}`, { adminId });
  }
}

export const platformSettingsService = new PlatformSettingsService();
