import { db, logger } from '../config';
import { notificationService } from './notification.service';
import {
  WorkflowRequest,
  CreateWorkflowRequestInput,
  UpdateWorkflowRequestInput,
  AddonRequest,
  CreateAddonRequestInput,
  UpdateAddonRequestInput,
  PaginatedResponse,
} from '../types';

export class WorkflowRequestService {
  /**
   * Create a new workflow request
   */
  async createWorkflowRequest(
    organizationId: string,
    input: CreateWorkflowRequestInput
  ): Promise<WorkflowRequest> {
    const result = await db.queryOne<WorkflowRequest>(
      `INSERT INTO workflow_requests 
       (organization_id, request_type, title, description, platforms, status, priority)
       VALUES ($1, $2, $3, $4, $5, 'pending', 'normal')
       RETURNING *`,
      [
        organizationId,
        input.requestType,
        input.title,
        input.description,
        JSON.stringify(input.platforms),
      ]
    );

    if (!result) {
      throw new Error('Failed to create workflow request');
    }

    // Update organization onboarding status
    await db.query(
      'UPDATE organizations SET workflow_requested = true WHERE id = $1',
      [organizationId]
    );

    // Create notification for admins
    await notificationService.notifyAdmins({
      type: 'workflow_requested',
      title: 'New Workflow Request',
      message: `New workflow request: ${input.title}`,
      organizationId,
      workflowRequestId: result.id,
      priority: 'normal',
    });

    logger.info('Workflow request created', {
      id: result.id,
      organizationId,
      type: input.requestType,
    });

    return result;
  }

  /**
   * Get workflow request by ID
   */
  async getWorkflowRequestById(
    id: string,
    organizationId?: string
  ): Promise<WorkflowRequest | null> {
    const query = organizationId
      ? 'SELECT * FROM workflow_requests WHERE id = $1 AND organization_id = $2'
      : 'SELECT * FROM workflow_requests WHERE id = $1';
    
    const params = organizationId ? [id, organizationId] : [id];

    return db.queryOne<WorkflowRequest>(query, params);
  }

  /**
   * Get all workflow requests for an organization
   */
  async getOrganizationWorkflowRequests(
    organizationId: string
  ): Promise<WorkflowRequest[]> {
    return db.queryAll<WorkflowRequest>(
      `SELECT * FROM workflow_requests 
       WHERE organization_id = $1 
       ORDER BY created_at DESC`,
      [organizationId]
    );
  }

  /**
   * Get all workflow requests (admin)
   */
  async getAllWorkflowRequests(
    filters: {
      status?: string;
      priority?: string;
      assignedTo?: string;
      organizationId?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<PaginatedResponse<WorkflowRequest & { organization_name: string }>> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.status) {
      conditions.push(`wr.status = $${paramIndex++}`);
      params.push(filters.status);
    }

    if (filters.priority) {
      conditions.push(`wr.priority = $${paramIndex++}`);
      params.push(filters.priority);
    }

    if (filters.assignedTo) {
      conditions.push(`wr.assigned_to = $${paramIndex++}`);
      params.push(filters.assignedTo);
    }

    if (filters.organizationId) {
      conditions.push(`wr.organization_id = $${paramIndex++}`);
      params.push(filters.organizationId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await db.queryOne<{ count: string }>(
      `SELECT COUNT(*) FROM workflow_requests wr ${whereClause}`,
      params
    );
    const total = parseInt(countResult?.count || '0');

    // Get paginated results
    params.push(limit, offset);
    const results = await db.queryAll<WorkflowRequest & { organization_name: string }>(
      `SELECT wr.*, o.name as organization_name
       FROM workflow_requests wr
       JOIN organizations o ON o.id = wr.organization_id
       ${whereClause}
       ORDER BY 
         CASE wr.priority 
           WHEN 'urgent' THEN 1 
           WHEN 'high' THEN 2 
           WHEN 'normal' THEN 3 
           WHEN 'low' THEN 4 
         END,
         wr.created_at DESC
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
   * Update workflow request (admin)
   */
  async updateWorkflowRequest(
    id: string,
    adminId: string,
    input: UpdateWorkflowRequestInput
  ): Promise<WorkflowRequest> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(input.status);

      if (input.status === 'completed') {
        updates.push(`completed_at = NOW()`);
      }

      if (input.status === 'in_review' || input.status === 'rejected') {
        updates.push(`reviewed_by = $${paramIndex++}`);
        values.push(adminId);
        updates.push(`reviewed_at = NOW()`);
      }
    }

    if (input.priority !== undefined) {
      updates.push(`priority = $${paramIndex++}`);
      values.push(input.priority);
    }

    if (input.assignedTo !== undefined) {
      updates.push(`assigned_to = $${paramIndex++}`);
      values.push(input.assignedTo);
    }

    if (input.adminNotes !== undefined) {
      updates.push(`admin_notes = $${paramIndex++}`);
      values.push(input.adminNotes);
    }

    if (input.rejectionReason !== undefined) {
      updates.push(`rejection_reason = $${paramIndex++}`);
      values.push(input.rejectionReason);
    }

    if (input.estimatedCompletion !== undefined) {
      updates.push(`estimated_completion = $${paramIndex++}`);
      values.push(input.estimatedCompletion);
    }

    if (updates.length === 0) {
      throw new Error('No updates provided');
    }

    values.push(id);

    const result = await db.queryOne<WorkflowRequest>(
      `UPDATE workflow_requests SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (!result) {
      throw new Error('Workflow request not found');
    }

    // Notify client of status changes
    if (input.status === 'completed' || input.status === 'rejected') {
      const notificationType = input.status === 'completed' ? 'workflow_completed' : 'workflow_rejected';
      const message = input.status === 'completed'
        ? 'Your workflow request has been completed and is now active!'
        : `Your workflow request was rejected: ${input.rejectionReason || 'No reason provided'}`;

      await notificationService.notifyClient(result.organization_id, {
        type: notificationType,
        title: `Workflow Request ${input.status.charAt(0).toUpperCase() + input.status.slice(1)}`,
        message,
        metadata: { workflowRequestId: id },
      });
    }

    logger.info('Workflow request updated', { id, adminId, updates: Object.keys(input) });

    return result;
  }

  // ============================================
  // Add-on Requests
  // ============================================

  /**
   * Create a new add-on request
   */
  async createAddonRequest(
    organizationId: string,
    input: CreateAddonRequestInput
  ): Promise<AddonRequest> {
    const result = await db.queryOne<AddonRequest>(
      `INSERT INTO addon_requests 
       (organization_id, workflow_request_id, addon_type, addon_name, description, configuration)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        organizationId,
        input.workflowRequestId || null,
        input.addonType,
        input.addonName,
        input.description || null,
        JSON.stringify(input.configuration || {}),
      ]
    );

    if (!result) {
      throw new Error('Failed to create add-on request');
    }

    // Notify admins
    await notificationService.notifyAdmins({
      type: 'addon_requested',
      title: 'New Add-on Request',
      message: `New add-on request: ${input.addonName} (${input.addonType})`,
      organizationId,
      addonRequestId: result.id,
      priority: 'normal',
    });

    logger.info('Add-on request created', {
      id: result.id,
      organizationId,
      type: input.addonType,
    });

    return result;
  }

  /**
   * Get add-on request by ID
   */
  async getAddonRequestById(
    id: string,
    organizationId?: string
  ): Promise<AddonRequest | null> {
    const query = organizationId
      ? 'SELECT * FROM addon_requests WHERE id = $1 AND organization_id = $2'
      : 'SELECT * FROM addon_requests WHERE id = $1';
    
    const params = organizationId ? [id, organizationId] : [id];

    return db.queryOne<AddonRequest>(query, params);
  }

  /**
   * Get all add-on requests for an organization
   */
  async getOrganizationAddonRequests(organizationId: string): Promise<AddonRequest[]> {
    return db.queryAll<AddonRequest>(
      `SELECT * FROM addon_requests 
       WHERE organization_id = $1 
       ORDER BY created_at DESC`,
      [organizationId]
    );
  }

  /**
   * Get all add-on requests (admin)
   */
  async getAllAddonRequests(
    filters: {
      status?: string;
      addonType?: string;
      organizationId?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<PaginatedResponse<AddonRequest & { organization_name: string }>> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.status) {
      conditions.push(`ar.status = $${paramIndex++}`);
      params.push(filters.status);
    }

    if (filters.addonType) {
      conditions.push(`ar.addon_type = $${paramIndex++}`);
      params.push(filters.addonType);
    }

    if (filters.organizationId) {
      conditions.push(`ar.organization_id = $${paramIndex++}`);
      params.push(filters.organizationId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await db.queryOne<{ count: string }>(
      `SELECT COUNT(*) FROM addon_requests ar ${whereClause}`,
      params
    );
    const total = parseInt(countResult?.count || '0');

    params.push(limit, offset);
    const results = await db.queryAll<AddonRequest & { organization_name: string }>(
      `SELECT ar.*, o.name as organization_name
       FROM addon_requests ar
       JOIN organizations o ON o.id = ar.organization_id
       ${whereClause}
       ORDER BY ar.created_at DESC
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
   * Update add-on request (admin)
   */
  async updateAddonRequest(
    id: string,
    adminId: string,
    input: UpdateAddonRequestInput
  ): Promise<AddonRequest> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(input.status);

      if (input.status === 'configured' || input.status === 'active') {
        updates.push(`configured_by = $${paramIndex++}`);
        values.push(adminId);
        updates.push(`configured_at = NOW()`);
      }
    }

    if (input.configuration !== undefined) {
      updates.push(`configuration = $${paramIndex++}`);
      values.push(JSON.stringify(input.configuration));
    }

    if (input.setupNotes !== undefined) {
      updates.push(`setup_notes = $${paramIndex++}`);
      values.push(input.setupNotes);
    }

    if (updates.length === 0) {
      throw new Error('No updates provided');
    }

    values.push(id);

    const result = await db.queryOne<AddonRequest>(
      `UPDATE addon_requests SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (!result) {
      throw new Error('Add-on request not found');
    }

    // Notify client when add-on is configured
    if (input.status === 'configured' || input.status === 'active') {
      await notificationService.notifyClient(result.organization_id, {
        type: 'addon_configured',
        title: 'Add-on Configured',
        message: `Your ${result.addon_name} add-on has been configured and is now active!`,
        metadata: { addonRequestId: id },
      });
    }

    logger.info('Add-on request updated', { id, adminId, updates: Object.keys(input) });

    return result;
  }
}

export const workflowRequestService = new WorkflowRequestService();
export default workflowRequestService;
