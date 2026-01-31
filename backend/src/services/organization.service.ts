import { db, logger } from '../config';
import {
  Organization,
  CreateOrganizationInput,
  UpdateOrganizationInput,
  FacebookPage,
  InstagramAccount,
  N8nWorkflow,
  CreateN8nWorkflowInput,
  UpdateN8nWorkflowInput,
  PaginatedResponse,
} from '../types';

export class OrganizationService {
  // ============================================
  // Organization CRUD
  // ============================================

  /**
   * Get organization by ID
   */
  async getOrganizationById(id: string): Promise<Organization | null> {
    return db.queryOne<Organization>(
      'SELECT * FROM organizations WHERE id = $1',
      [id]
    );
  }

  /**
   * Get organization by owner ID
   */
  async getOrganizationByOwnerId(ownerId: string): Promise<Organization | null> {
    return db.queryOne<Organization>(
      'SELECT * FROM organizations WHERE owner_id = $1',
      [ownerId]
    );
  }

  /**
   * Get all organizations (admin)
   */
  async getAllOrganizations(
    filters: {
      status?: string;
      planType?: string;
      search?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<PaginatedResponse<Organization>> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(filters.status);
    }

    if (filters.planType) {
      conditions.push(`plan_type = $${paramIndex++}`);
      params.push(filters.planType);
    }

    if (filters.search) {
      conditions.push(`(name ILIKE $${paramIndex} OR domain ILIKE $${paramIndex})`);
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await db.queryOne<{ count: string }>(
      `SELECT COUNT(*) FROM organizations ${whereClause}`,
      params
    );
    const total = parseInt(countResult?.count || '0');

    params.push(limit, offset);
    const results = await db.queryAll<Organization>(
      `SELECT * FROM organizations 
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      params
    );

    return {
      data: results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };
  }

  /**
   * Create organization (usually done during registration)
   */
  async createOrganization(
    ownerId: string,
    input: CreateOrganizationInput
  ): Promise<Organization> {
    const result = await db.queryOne<Organization>(
      `INSERT INTO organizations (owner_id, name, domain, logo_url, timezone, settings)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        ownerId,
        input.name,
        input.domain || null,
        input.logoUrl || null,
        input.timezone || 'UTC',
        JSON.stringify(input.settings || {}),
      ]
    );

    if (!result) {
      throw new Error('Failed to create organization');
    }

    logger.info('Organization created', { id: result.id, name: input.name, ownerId });

    return result;
  }

  /**
   * Update organization
   */
  async updateOrganization(
    id: string,
    input: UpdateOrganizationInput
  ): Promise<Organization> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(input.name);
    }

    if (input.domain !== undefined) {
      updates.push(`domain = $${paramIndex++}`);
      values.push(input.domain);
    }

    if (input.logoUrl !== undefined) {
      updates.push(`logo_url = $${paramIndex++}`);
      values.push(input.logoUrl);
    }

    if (input.timezone !== undefined) {
      updates.push(`timezone = $${paramIndex++}`);
      values.push(input.timezone);
    }

    if (input.settings !== undefined) {
      updates.push(`settings = $${paramIndex++}`);
      values.push(JSON.stringify(input.settings));
    }

    if (input.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(input.status);
    }

    if (input.planType !== undefined) {
      updates.push(`plan_type = $${paramIndex++}`);
      values.push(input.planType);
    }

    if (updates.length === 0) {
      throw new Error('No updates provided');
    }

    values.push(id);

    const result = await db.queryOne<Organization>(
      `UPDATE organizations SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (!result) {
      throw new Error('Organization not found');
    }

    logger.info('Organization updated', { id, updates: Object.keys(input) });

    return result;
  }

  // ============================================
  // Facebook Pages
  // ============================================

  /**
   * Get Facebook pages for an organization
   */
  async getFacebookPages(organizationId: string): Promise<FacebookPage[]> {
    return db.queryAll<FacebookPage>(
      'SELECT * FROM facebook_pages WHERE organization_id = $1 ORDER BY created_at DESC',
      [organizationId]
    );
  }

  /**
   * Get Facebook page by ID
   */
  async getFacebookPageById(
    id: string,
    organizationId?: string
  ): Promise<FacebookPage | null> {
    const query = organizationId
      ? 'SELECT * FROM facebook_pages WHERE id = $1 AND organization_id = $2'
      : 'SELECT * FROM facebook_pages WHERE id = $1';
    
    const params = organizationId ? [id, organizationId] : [id];

    return db.queryOne<FacebookPage>(query, params);
  }

  /**
   * Add Facebook page
   */
  async addFacebookPage(
    organizationId: string,
    pageData: {
      pageId: string;
      pageName: string;
      accessToken: string;
      category?: string;
      pictureUrl?: string;
    }
  ): Promise<FacebookPage> {
    // Check if page already exists
    const existing = await db.queryOne<FacebookPage>(
      'SELECT * FROM facebook_pages WHERE page_id = $1',
      [pageData.pageId]
    );

    if (existing) {
      if (existing.organization_id !== organizationId) {
        throw new Error('Page is already connected to another organization');
      }
      
      // Update existing
      return db.queryOne<FacebookPage>(
        `UPDATE facebook_pages 
         SET page_name = $1, access_token_encrypted = $2, category = $3, picture_url = $4, is_active = true
         WHERE id = $5
         RETURNING *`,
        [pageData.pageName, pageData.accessToken, pageData.category, pageData.pictureUrl, existing.id]
      ) as Promise<FacebookPage>;
    }

    const result = await db.queryOne<FacebookPage>(
      `INSERT INTO facebook_pages 
       (organization_id, page_id, page_name, access_token_encrypted, category, picture_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        organizationId,
        pageData.pageId,
        pageData.pageName,
        pageData.accessToken,
        pageData.category || null,
        pageData.pictureUrl || null,
      ]
    );

    if (!result) {
      throw new Error('Failed to add Facebook page');
    }

    // Update organization onboarding
    await db.query(
      'UPDATE organizations SET facebook_connected = true WHERE id = $1',
      [organizationId]
    );

    logger.info('Facebook page added', { id: result.id, organizationId, pageId: pageData.pageId });

    return result;
  }

  /**
   * Remove Facebook page
   */
  async removeFacebookPage(id: string, organizationId: string): Promise<void> {
    const result = await db.query(
      'DELETE FROM facebook_pages WHERE id = $1 AND organization_id = $2',
      [id, organizationId]
    );

    if (result.rowCount === 0) {
      throw new Error('Page not found');
    }

    // Check if any pages remain
    const remaining = await db.queryOne<{ count: string }>(
      'SELECT COUNT(*) FROM facebook_pages WHERE organization_id = $1',
      [organizationId]
    );

    if (parseInt(remaining?.count || '0') === 0) {
      await db.query(
        'UPDATE organizations SET facebook_connected = false WHERE id = $1',
        [organizationId]
      );
    }

    logger.info('Facebook page removed', { id, organizationId });
  }

  /**
   * Toggle Facebook page active status
   */
  async toggleFacebookPageStatus(
    id: string,
    organizationId: string,
    isActive: boolean
  ): Promise<FacebookPage> {
    const result = await db.queryOne<FacebookPage>(
      `UPDATE facebook_pages SET is_active = $1 WHERE id = $2 AND organization_id = $3 RETURNING *`,
      [isActive, id, organizationId]
    );

    if (!result) {
      throw new Error('Page not found');
    }

    return result;
  }

  // ============================================
  // Instagram Accounts
  // ============================================

  /**
   * Get Instagram accounts for an organization
   */
  async getInstagramAccounts(organizationId: string): Promise<InstagramAccount[]> {
    return db.queryAll<InstagramAccount>(
      'SELECT * FROM instagram_accounts WHERE organization_id = $1 ORDER BY created_at DESC',
      [organizationId]
    );
  }

  /**
   * Get Instagram account by ID
   */
  async getInstagramAccountById(
    id: string,
    organizationId?: string
  ): Promise<InstagramAccount | null> {
    const query = organizationId
      ? 'SELECT * FROM instagram_accounts WHERE id = $1 AND organization_id = $2'
      : 'SELECT * FROM instagram_accounts WHERE id = $1';
    
    const params = organizationId ? [id, organizationId] : [id];

    return db.queryOne<InstagramAccount>(query, params);
  }

  /**
   * Add Instagram account
   */
  async addInstagramAccount(
    organizationId: string,
    accountData: {
      instagramId: string;
      username: string;
      accessToken: string;
      facebookPageId?: string;
      profilePictureUrl?: string;
      followersCount?: number;
    }
  ): Promise<InstagramAccount> {
    // Check if account already exists
    const existing = await db.queryOne<InstagramAccount>(
      'SELECT * FROM instagram_accounts WHERE instagram_id = $1',
      [accountData.instagramId]
    );

    if (existing) {
      if (existing.organization_id !== organizationId) {
        throw new Error('Instagram account is already connected to another organization');
      }
      
      // Update existing
      return db.queryOne<InstagramAccount>(
        `UPDATE instagram_accounts 
         SET username = $1, access_token_encrypted = $2, profile_picture_url = $3, 
             followers_count = $4, is_active = true
         WHERE id = $5
         RETURNING *`,
        [
          accountData.username,
          accountData.accessToken,
          accountData.profilePictureUrl,
          accountData.followersCount,
          existing.id,
        ]
      ) as Promise<InstagramAccount>;
    }

    const result = await db.queryOne<InstagramAccount>(
      `INSERT INTO instagram_accounts 
       (organization_id, instagram_id, username, access_token_encrypted, 
        facebook_page_id, profile_picture_url, followers_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        organizationId,
        accountData.instagramId,
        accountData.username,
        accountData.accessToken,
        accountData.facebookPageId || null,
        accountData.profilePictureUrl || null,
        accountData.followersCount || 0,
      ]
    );

    if (!result) {
      throw new Error('Failed to add Instagram account');
    }

    // Update organization onboarding
    await db.query(
      'UPDATE organizations SET instagram_connected = true WHERE id = $1',
      [organizationId]
    );

    logger.info('Instagram account added', {
      id: result.id,
      organizationId,
      instagramId: accountData.instagramId,
    });

    return result;
  }

  /**
   * Remove Instagram account
   */
  async removeInstagramAccount(id: string, organizationId: string): Promise<void> {
    const result = await db.query(
      'DELETE FROM instagram_accounts WHERE id = $1 AND organization_id = $2',
      [id, organizationId]
    );

    if (result.rowCount === 0) {
      throw new Error('Account not found');
    }

    // Check if any accounts remain
    const remaining = await db.queryOne<{ count: string }>(
      'SELECT COUNT(*) FROM instagram_accounts WHERE organization_id = $1',
      [organizationId]
    );

    if (parseInt(remaining?.count || '0') === 0) {
      await db.query(
        'UPDATE organizations SET instagram_connected = false WHERE id = $1',
        [organizationId]
      );
    }

    logger.info('Instagram account removed', { id, organizationId });
  }

  // ============================================
  // n8n Workflows
  // ============================================

  /**
   * Get workflows for an organization
   */
  async getWorkflows(organizationId: string): Promise<N8nWorkflow[]> {
    return db.queryAll<N8nWorkflow>(
      'SELECT * FROM n8n_workflows WHERE organization_id = $1 ORDER BY created_at DESC',
      [organizationId]
    );
  }

  /**
   * Get workflow by ID
   */
  async getWorkflowById(
    id: string,
    organizationId?: string
  ): Promise<N8nWorkflow | null> {
    const query = organizationId
      ? 'SELECT * FROM n8n_workflows WHERE id = $1 AND organization_id = $2'
      : 'SELECT * FROM n8n_workflows WHERE id = $1';
    
    const params = organizationId ? [id, organizationId] : [id];

    return db.queryOne<N8nWorkflow>(query, params);
  }

  /**
   * Create workflow (admin only)
   */
  async createWorkflow(
    input: CreateN8nWorkflowInput,
    createdBy: string
  ): Promise<N8nWorkflow> {
    const result = await db.queryOne<N8nWorkflow>(
      `INSERT INTO n8n_workflows 
       (organization_id, workflow_request_id, name, description, platform, 
        workflow_type, webhook_url, n8n_workflow_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        input.organizationId,
        input.workflowRequestId || null,
        input.name,
        input.description || null,
        input.platform,
        input.workflowType,
        input.webhookUrl,
        input.n8nWorkflowId || null,
        createdBy,
      ]
    );

    if (!result) {
      throw new Error('Failed to create workflow');
    }

    // Update workflow request status if linked
    if (input.workflowRequestId) {
      await db.query(
        'UPDATE workflow_requests SET status = $1 WHERE id = $2',
        ['completed', input.workflowRequestId]
      );
    }

    logger.info('Workflow created', { id: result.id, organizationId: input.organizationId });

    return result;
  }

  /**
   * Update workflow (admin only)
   */
  async updateWorkflow(
    id: string,
    input: UpdateN8nWorkflowInput
  ): Promise<N8nWorkflow> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(input.name);
    }

    if (input.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(input.description);
    }

    if (input.webhookUrl !== undefined) {
      updates.push(`webhook_url = $${paramIndex++}`);
      values.push(input.webhookUrl);
    }

    if (input.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(input.isActive);
    }

    if (input.configuration !== undefined) {
      updates.push(`configuration = $${paramIndex++}`);
      values.push(JSON.stringify(input.configuration));
    }

    if (updates.length === 0) {
      throw new Error('No updates provided');
    }

    values.push(id);

    const result = await db.queryOne<N8nWorkflow>(
      `UPDATE n8n_workflows SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (!result) {
      throw new Error('Workflow not found');
    }

    logger.info('Workflow updated', { id, updates: Object.keys(input) });

    return result;
  }

  /**
   * Delete workflow (admin only)
   */
  async deleteWorkflow(id: string): Promise<void> {
    const result = await db.query(
      'DELETE FROM n8n_workflows WHERE id = $1',
      [id]
    );

    if (result.rowCount === 0) {
      throw new Error('Workflow not found');
    }

    logger.info('Workflow deleted', { id });
  }
}

export const organizationService = new OrganizationService();
export default organizationService;
