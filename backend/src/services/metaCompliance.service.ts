import crypto from 'crypto';
import { db, logger } from '../config';

/**
 * Implements Meta's platform-compliance callbacks for real:
 *
 * - Deauthorize: the user removed the app on Facebook -> disconnect their
 *   organization's Meta assets (tokens, pages, IG accounts).
 * - Data deletion: the user requested deletion -> remove tokens, connected
 *   assets and stored conversation history, and persist a confirmation code
 *   so /api/meta/deletion-status can report truthful status.
 *
 * Both callbacks identify the user only by Meta user ID, which we store on
 * meta_tokens.meta_user_id at OAuth time (migration 012).
 */
export class MetaComplianceService {
  /**
   * Find all organizations connected through a given Meta user.
   */
  private async findOrganizations(metaUserId: string): Promise<string[]> {
    const rows = await db.queryAll<{ organization_id: string }>(
      `SELECT organization_id FROM meta_tokens WHERE meta_user_id = $1`,
      [metaUserId]
    );
    return rows.map((r) => r.organization_id);
  }

  /**
   * Deauthorization: revoke access without destroying business records.
   * Tokens are deleted (they are dead anyway) and assets are deactivated so
   * webhook routing stops immediately; the org can reconnect later.
   */
  async handleDeauthorize(metaUserId: string): Promise<{ organizations: number }> {
    const orgIds = await this.findOrganizations(metaUserId);

    if (orgIds.length === 0) {
      logger.info('Deauthorize: no organization found for Meta user', { metaUserId });
      return { organizations: 0 };
    }

    await db.transaction(async (client) => {
      await client.query(`DELETE FROM meta_tokens WHERE meta_user_id = $1`, [metaUserId]);
      await client.query(
        `UPDATE facebook_pages SET is_active = false, webhook_subscribed = false
          WHERE organization_id = ANY($1)`,
        [orgIds]
      );
      await client.query(
        `UPDATE instagram_accounts SET is_active = false, webhook_subscribed = false
          WHERE organization_id = ANY($1)`,
        [orgIds]
      );
    });

    logger.info('Deauthorize processed', { metaUserId, organizations: orgIds.length });
    return { organizations: orgIds.length };
  }

  /**
   * Data deletion request: delete Meta-derived data and record the request.
   * Returns the confirmation code Meta expects in the callback response.
   */
  async handleDeletionRequest(metaUserId: string): Promise<{ confirmationCode: string }> {
    const confirmationCode = `DEL-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const orgIds = await this.findOrganizations(metaUserId);

    // Record first so status is queryable even if the wipe below fails.
    await db.query(
      `INSERT INTO meta_deletion_requests (confirmation_code, meta_user_id, organization_id, status)
       VALUES ($1, $2, $3, 'pending')`,
      [confirmationCode, metaUserId, orgIds[0] || null]
    );

    try {
      if (orgIds.length > 0) {
        await db.transaction(async (client) => {
          // Conversation history captured from Meta (messages cascade).
          await client.query(
            `DELETE FROM conversations WHERE organization_id = ANY($1)`,
            [orgIds]
          );
          // Connected assets + their encrypted tokens (IG rows reference pages).
          await client.query(
            `DELETE FROM instagram_accounts WHERE organization_id = ANY($1)`,
            [orgIds]
          );
          await client.query(
            `DELETE FROM facebook_pages WHERE organization_id = ANY($1)`,
            [orgIds]
          );
          // User-level OAuth tokens.
          await client.query(`DELETE FROM meta_tokens WHERE meta_user_id = $1`, [metaUserId]);
        });
      }

      await db.query(
        `UPDATE meta_deletion_requests
            SET status = 'completed', completed_at = NOW(),
                details = $2
          WHERE confirmation_code = $1`,
        [confirmationCode, `Deleted Meta data for ${orgIds.length} organization(s)`]
      );

      logger.info('Meta data deletion completed', {
        metaUserId,
        confirmationCode,
        organizations: orgIds.length,
      });
    } catch (error: any) {
      await db.query(
        `UPDATE meta_deletion_requests SET status = 'failed', details = $2
          WHERE confirmation_code = $1`,
        [confirmationCode, error.message]
      );
      logger.error('Meta data deletion failed', { metaUserId, confirmationCode, error: error.message });
    }

    return { confirmationCode };
  }

  /**
   * Status lookup for the deletion-status URL we hand back to Meta.
   */
  async getDeletionStatus(confirmationCode: string): Promise<{
    confirmationCode: string;
    status: string;
    requestedAt: Date | null;
    completedAt: Date | null;
  } | null> {
    const row = await db.queryOne<{
      confirmation_code: string;
      status: string;
      created_at: Date;
      completed_at: Date | null;
    }>(
      `SELECT confirmation_code, status, created_at, completed_at
         FROM meta_deletion_requests WHERE confirmation_code = $1`,
      [confirmationCode]
    );

    if (!row) return null;

    return {
      confirmationCode: row.confirmation_code,
      status: row.status,
      requestedAt: row.created_at,
      completedAt: row.completed_at,
    };
  }
}

export const metaComplianceService = new MetaComplianceService();
export default metaComplianceService;
