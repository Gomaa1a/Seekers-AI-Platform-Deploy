import { db, logger } from '../config';
import { encrypt, decrypt } from '../utils/encryption';
import { FacebookPage, InstagramAccount } from '../types';

export class TokenService {
  /**
   * Encrypt access token before storing
   */
  encryptToken(token: string): string {
    return encrypt(token);
  }

  /**
   * Decrypt access token when retrieving
   */
  decryptToken(encryptedData: string): string {
    return decrypt(encryptedData);
  }

  /**
   * Store Meta user token
   */
  async storeUserToken(
    organizationId: string,
    userId: string,
    accessToken: string,
    expiresIn: number,
    metaUserId: string,
    metaUserName: string,
    scopes: string[]
  ): Promise<string> {
    const encrypted = this.encryptToken(accessToken);
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    const result = await db.queryOne<{ id: string }>(
      `INSERT INTO meta_tokens
       (organization_id, access_token_encrypted, token_type, expires_at, scopes, meta_user_id, meta_user_name)
       VALUES ($1, $2, 'user_token', $3, $4, $5, $6)
       ON CONFLICT (organization_id)
       DO UPDATE SET
         access_token_encrypted = EXCLUDED.access_token_encrypted,
         token_type = 'user_token',
         expires_at = EXCLUDED.expires_at,
         scopes = EXCLUDED.scopes,
         meta_user_id = COALESCE(NULLIF(EXCLUDED.meta_user_id, ''), meta_tokens.meta_user_id),
         meta_user_name = COALESCE(NULLIF(EXCLUDED.meta_user_name, ''), meta_tokens.meta_user_name),
         updated_at = NOW()
       RETURNING id`,
      [organizationId, encrypted, expiresAt, scopes, metaUserId || '', metaUserName || '']
    );

    logger.info('User token stored', { organizationId, metaUserId });
    return result?.id || '';
  }

  /**
   * Store Facebook page token
   */
  async storePageToken(
    organizationId: string,
    pageId: string,
    pageName: string,
    pageAccessToken: string,
    additionalData?: {
      category?: string;
      link?: string;
      pictureUrl?: string;
      followersCount?: number;
    }
  ): Promise<string> {
    const encrypted = this.encryptToken(pageAccessToken);

    const result = await db.queryOne<{ id: string }>(
      `INSERT INTO facebook_pages
       (organization_id, page_id, page_name, access_token_encrypted, category, picture_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (page_id)
       DO UPDATE SET
         access_token_encrypted = EXCLUDED.access_token_encrypted,
         page_name = EXCLUDED.page_name,
         category = EXCLUDED.category,
         picture_url = EXCLUDED.picture_url,
         updated_at = NOW()
       RETURNING id`,
      [
        organizationId,
        pageId,
        pageName,
        encrypted,
        additionalData?.category || null,
        additionalData?.pictureUrl || null,
      ]
    );

    logger.info('Page token stored', { organizationId, pageId, pageName });
    return result?.id || '';
  }

  /**
   * Store Instagram account
   */
  async storeInstagramAccount(
    organizationId: string,
    facebookPageId: string,
    instagramBusinessAccountId: string,
    username: string,
    profilePictureUrl?: string,
    followersCount?: number
  ): Promise<string> {
    const result = await db.queryOne<{ id: string }>(
      `INSERT INTO instagram_accounts
       (organization_id, facebook_page_id, instagram_id, username, profile_picture_url, followers_count)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (instagram_id)
       DO UPDATE SET
         username = EXCLUDED.username,
         profile_picture_url = EXCLUDED.profile_picture_url,
         followers_count = EXCLUDED.followers_count,
         updated_at = NOW()
       RETURNING id`,
      [
        organizationId,
        facebookPageId,
        instagramBusinessAccountId,
        username,
        profilePictureUrl || null,
        followersCount || null,
      ]
    );

    logger.info('Instagram account stored', { organizationId, instagramBusinessAccountId, username });
    return result?.id || '';
  }

  /**
   * Get decrypted page token
   */
  async getPageToken(pageId: string): Promise<string | null> {
    const result = await db.queryOne<{ access_token_encrypted: string }>(
      'SELECT access_token_encrypted FROM facebook_pages WHERE page_id = $1',
      [pageId]
    );

    if (!result) return null;

    return this.decryptToken(result.access_token_encrypted);
  }

  /**
   * Get decrypted page token by internal ID
   */
  async getPageTokenById(id: string): Promise<string | null> {
    const result = await db.queryOne<{ access_token_encrypted: string }>(
      'SELECT access_token_encrypted FROM facebook_pages WHERE id = $1',
      [id]
    );

    if (!result) return null;

    return this.decryptToken(result.access_token_encrypted);
  }

  /**
   * Get decrypted user token
   */
  async getUserToken(organizationId: string): Promise<string | null> {
    const result = await db.queryOne<{ access_token_encrypted: string }>(
      `SELECT access_token_encrypted FROM meta_tokens
       WHERE organization_id = $1 AND token_type = 'user_token'
       ORDER BY created_at DESC LIMIT 1`,
      [organizationId]
    );

    if (!result) return null;

    return this.decryptToken(result.access_token_encrypted);
  }

  /**
   * Get all pages for an organization
   */
  async getOrganizationPages(organizationId: string): Promise<FacebookPage[]> {
    return db.queryAll<FacebookPage>(
      `SELECT * FROM facebook_pages 
       WHERE organization_id = $1 
       ORDER BY page_name ASC`,
      [organizationId]
    );
  }

  /**
   * Get all Instagram accounts for an organization
   */
  async getOrganizationInstagramAccounts(organizationId: string): Promise<InstagramAccount[]> {
    return db.queryAll<InstagramAccount>(
      `SELECT ia.*, fp.page_name as linked_page_name
       FROM instagram_accounts ia
       LEFT JOIN facebook_pages fp ON fp.id = ia.facebook_page_id
       WHERE ia.organization_id = $1 
       ORDER BY ia.username ASC`,
      [organizationId]
    );
  }

  /**
   * Get page by ID
   */
  async getPage(pageId: string): Promise<FacebookPage | null> {
    return db.queryOne<FacebookPage>(
      'SELECT * FROM facebook_pages WHERE page_id = $1',
      [pageId]
    );
  }

  /**
   * Get page by internal ID
   */
  async getPageById(id: string): Promise<FacebookPage | null> {
    return db.queryOne<FacebookPage>(
      'SELECT * FROM facebook_pages WHERE id = $1',
      [id]
    );
  }

  /**
   * Update page webhook subscription status
   */
  async updatePageWebhookStatus(pageId: string, subscribed: boolean): Promise<void> {
    await db.query(
      'UPDATE facebook_pages SET webhook_subscribed = $1 WHERE page_id = $2',
      [subscribed, pageId]
    );
  }

  /**
   * Update Instagram webhook subscription status
   */
  async updateInstagramWebhookStatus(igId: string, subscribed: boolean): Promise<void> {
    await db.query(
      'UPDATE instagram_accounts SET webhook_subscribed = $1 WHERE instagram_id = $2',
      [subscribed, igId]
    );
  }

  /**
   * Delete page and related data
   */
  async deletePage(pageId: string): Promise<void> {
    await db.transaction(async (client) => {
      // Delete related Instagram accounts
      await client.query(
        `DELETE FROM instagram_accounts 
         WHERE facebook_page_id = (SELECT id FROM facebook_pages WHERE page_id = $1)`,
        [pageId]
      );

      // Delete the page
      await client.query('DELETE FROM facebook_pages WHERE page_id = $1', [pageId]);
    });

    logger.info('Page deleted', { pageId });
  }

  /**
   * Delete Instagram account
   */
  async deleteInstagramAccount(igId: string): Promise<void> {
    await db.query(
      'DELETE FROM instagram_accounts WHERE instagram_id = $1',
      [igId]
    );

    logger.info('Instagram account deleted', { igId });
  }

  /**
   * Toggle page active status
   */
  async togglePageStatus(pageId: string, isActive: boolean): Promise<void> {
    await db.query(
      'UPDATE facebook_pages SET is_active = $1 WHERE page_id = $2',
      [isActive, pageId]
    );
  }

  /**
   * Toggle Instagram active status
   */
  async toggleInstagramStatus(igId: string, isActive: boolean): Promise<void> {
    await db.query(
      'UPDATE instagram_accounts SET is_active = $1 WHERE instagram_id = $2',
      [isActive, igId]
    );
  }

  /**
   * Get tokens needing refresh (within 7 days of expiry)
   */
  async getTokensNeedingRefresh(): Promise<Array<{
    id: string;
    organizationId: string;
    tokenType: string;
    expiresAt: Date;
  }>> {
    const result = await db.queryAll<{
      id: string;
      organization_id: string;
      token_type: string;
      expires_at: Date;
    }>(
      `SELECT id, organization_id, token_type, expires_at
       FROM meta_tokens
       WHERE expires_at < NOW() + INTERVAL '7 days'
         AND expires_at > NOW()
       ORDER BY expires_at ASC`
    );

    return result.map(row => ({
      id: row.id,
      organizationId: row.organization_id,
      tokenType: row.token_type,
      expiresAt: row.expires_at,
    }));
  }

  /**
   * Check if organization has valid Meta connection
   */
  async hasValidMetaConnection(organizationId: string): Promise<boolean> {
    const token = await db.queryOne<{ expires_at: Date }>(
      `SELECT expires_at FROM meta_tokens 
       WHERE organization_id = $1 AND expires_at > NOW()
       LIMIT 1`,
      [organizationId]
    );

    return token !== null;
  }
}

export const tokenService = new TokenService();
export default tokenService;
