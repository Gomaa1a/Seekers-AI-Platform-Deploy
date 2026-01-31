import { Router } from 'express';
import axios from 'axios';
import {
  organizationService,
  workflowRequestService,
  analyticsService,
  notificationService,
  auditService,
  platformSettingsService,
  freeTierService,
} from '../services';
import { db } from '../config';
import { authenticateAdmin } from '../middleware';
import { asyncHandler } from '../utils/helpers';

const router = Router();

// ============================================
// Platform Settings Management
// ============================================

/**
 * @route   GET /api/admin/settings
 * @desc    Get all platform settings
 * @access  Private (Admin)
 */
router.get(
  '/settings',
  authenticateAdmin,
  asyncHandler(async (req, res) => {
    const settings = await platformSettingsService.getAllSettings();

    res.json({
      success: true,
      data: settings,
    });
  })
);

/**
 * @route   PUT /api/admin/settings
 * @desc    Update platform settings
 * @access  Private (Admin)
 */
router.put(
  '/settings',
  authenticateAdmin,
  asyncHandler(async (req, res) => {
    const adminId = (req as any).admin!.adminId;
    const settings = req.body;

    await platformSettingsService.updateSettings(settings, adminId);

    res.json({
      success: true,
      message: 'Platform settings updated successfully',
    });
  })
);

/**
 * @route   GET /api/admin/free-tier/expired
 * @desc    Get all organizations with expired free tier trials
 * @access  Private (Admin)
 */
router.get(
  '/free-tier/expired',
  authenticateAdmin,
  asyncHandler(async (req, res) => {
    const expiredOrgs = await freeTierService.getExpiredTrials();

    res.json({
      success: true,
      data: expiredOrgs,
      count: expiredOrgs.length,
    });
  })
);

/**
 * @route   POST /api/admin/free-tier/process-expired
 * @desc    Manually process expired free tier trials
 * @access  Private (Admin)
 */
router.post(
  '/free-tier/process-expired',
  authenticateAdmin,
  asyncHandler(async (req, res) => {
    const disconnectedCount = await freeTierService.processExpiredTrials();

    res.json({
      success: true,
      message: `Processed ${disconnectedCount} expired free tier trials`,
      disconnectedCount,
    });
  })
);

/**
 * @route   DELETE /api/admin/free-tier/:orgId
 * @desc    Manually disconnect an organization from free tier
 * @access  Private (Admin)
 */
router.delete(
  '/free-tier/:orgId',
  authenticateAdmin,
  asyncHandler(async (req, res) => {
    const { orgId } = req.params;
    const { reason } = req.body;

    await freeTierService.disconnectFreeTier(
      orgId, 
      reason || 'manual'
    );

    res.json({
      success: true,
      message: 'Organization disconnected from free tier',
    });
  })
);

// ============================================
// Organization Management
// ============================================

/**
 * @route   GET /api/admin/organizations
 * @desc    Get all organizations
 * @access  Private (Admin)
 */
router.get(
  '/organizations',
  authenticateAdmin,
  asyncHandler(async (req, res) => {
    const { status, planType, search, page, limit } = req.query;

    const result = await organizationService.getAllOrganizations({
      status: status as string,
      planType: planType as string,
      search: search as string,
      page: parseInt(page as string) || 1,
      limit: parseInt(limit as string) || 20,
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  })
);

/**
 * @route   GET /api/admin/organizations/:id
 * @desc    Get organization details
 * @access  Private (Admin)
 */
router.get(
  '/organizations/:id',
  authenticateAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const [organization, facebookPages, instagramAccounts, workflows] = await Promise.all([
      organizationService.getOrganizationById(id),
      organizationService.getFacebookPages(id),
      organizationService.getInstagramAccounts(id),
      organizationService.getWorkflows(id),
    ]);

    if (!organization) {
      res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        organization,
        facebookPages,
        instagramAccounts,
        workflows,
      },
    });
  })
);

/**
 * @route   PUT /api/admin/organizations/:id
 * @desc    Update organization
 * @access  Private (Admin)
 */
router.put(
  '/organizations/:id',
  authenticateAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const organization = await organizationService.updateOrganization(id, req.body);

    res.json({
      success: true,
      message: 'Organization updated successfully',
      data: organization,
    });
  })
);

// ============================================
// Workflow Request Management
// ============================================

/**
 * @route   GET /api/admin/workflow-requests
 * @desc    Get all workflow requests
 * @access  Private (Admin)
 */
router.get(
  '/workflow-requests',
  authenticateAdmin,
  asyncHandler(async (req, res) => {
    const { status, priority, assignedTo, organizationId, page, limit } = req.query;

    const result = await workflowRequestService.getAllWorkflowRequests({
      status: status as string,
      priority: priority as string,
      assignedTo: assignedTo as string,
      organizationId: organizationId as string,
      page: parseInt(page as string) || 1,
      limit: parseInt(limit as string) || 20,
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  })
);

/**
 * @route   GET /api/admin/workflow-requests/:id
 * @desc    Get workflow request details
 * @access  Private (Admin)
 */
router.get(
  '/workflow-requests/:id',
  authenticateAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const request = await workflowRequestService.getWorkflowRequestById(id);

    if (!request) {
      res.status(404).json({
        success: false,
        message: 'Workflow request not found',
      });
      return;
    }

    res.json({
      success: true,
      data: request,
    });
  })
);

/**
 * @route   PUT /api/admin/workflow-requests/:id
 * @desc    Update workflow request (change status, assign, etc.)
 * @access  Private (Admin)
 */
router.put(
  '/workflow-requests/:id',
  authenticateAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const adminId = (req as any).admin!.adminId;

    const request = await workflowRequestService.updateWorkflowRequest(id, adminId, req.body);

    res.json({
      success: true,
      message: 'Workflow request updated successfully',
      data: request,
    });
  })
);

// ============================================
// Add-on Request Management
// ============================================

/**
 * @route   GET /api/admin/addon-requests
 * @desc    Get all add-on requests
 * @access  Private (Admin)
 */
router.get(
  '/addon-requests',
  authenticateAdmin,
  asyncHandler(async (req, res) => {
    const { status, addonType, organizationId, page, limit } = req.query;

    const result = await workflowRequestService.getAllAddonRequests({
      status: status as string,
      addonType: addonType as string,
      organizationId: organizationId as string,
      page: parseInt(page as string) || 1,
      limit: parseInt(limit as string) || 20,
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  })
);

/**
 * @route   PUT /api/admin/addon-requests/:id
 * @desc    Update add-on request (configure, activate, etc.)
 * @access  Private (Admin)
 */
router.put(
  '/addon-requests/:id',
  authenticateAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const adminId = (req as any).admin!.adminId;

    const request = await workflowRequestService.updateAddonRequest(id, adminId, req.body);

    res.json({
      success: true,
      message: 'Add-on request updated successfully',
      data: request,
    });
  })
);

// ============================================
// n8n Workflow Management
// ============================================

/**
 * @route   POST /api/admin/workflows
 * @desc    Create a new n8n workflow for an organization
 * @access  Private (Admin)
 */
router.post(
  '/workflows',
  authenticateAdmin,
  asyncHandler(async (req, res) => {
    const adminId = (req as any).admin!.adminId;

    const workflow = await organizationService.createWorkflow(req.body, adminId);

    // Notify client
    await notificationService.notifyClient(workflow.organization_id, {
      type: 'workflow_completed',
      title: 'Workflow Created',
      message: `Your ${workflow.workflow_type} workflow "${workflow.workflow_name}" has been set up and is now active!`,
      metadata: { workflowId: workflow.id },
    });

    res.status(201).json({
      success: true,
      message: 'Workflow created successfully',
      data: workflow,
    });
  })
);

/**
 * @route   PUT /api/admin/workflows/:id
 * @desc    Update an n8n workflow
 * @access  Private (Admin)
 */
router.put(
  '/workflows/:id',
  authenticateAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const workflow = await organizationService.updateWorkflow(id, req.body);

    res.json({
      success: true,
      message: 'Workflow updated successfully',
      data: workflow,
    });
  })
);

/**
 * @route   DELETE /api/admin/workflows/:id
 * @desc    Delete an n8n workflow
 * @access  Private (Admin)
 */
router.delete(
  '/workflows/:id',
  authenticateAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    await organizationService.deleteWorkflow(id);

    res.json({
      success: true,
      message: 'Workflow deleted successfully',
    });
  })
);

// ============================================
// Dashboard
// ============================================

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get admin dashboard data
 * @access  Private (Admin)
 */
router.get(
  '/dashboard',
  authenticateAdmin,
  asyncHandler(async (req, res) => {
    const [stats, notifications] = await Promise.all([
      analyticsService.getAdminDashboardStats(),
      notificationService.getAdminNotificationQueue(20),
    ]);

    res.json({
      success: true,
      data: {
        stats,
        recentNotifications: notifications,
      },
    });
  })
);

// ============================================
// Webhook Provisioning
// ============================================

/**
 * @route   PUT /api/admin/organizations/:id/webhook
 * @desc    Set the n8n base webhook URL for an organization (free tier uses shared, paid gets dedicated)
 * @access  Private (Admin)
 */
router.put(
  '/organizations/:id/webhook',
  authenticateAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { webhookUrl } = req.body;

    if (!webhookUrl || typeof webhookUrl !== 'string') {
      res.status(400).json({ success: false, message: 'webhookUrl is required' });
      return;
    }

    const organization = await organizationService.updateOrganization(id, {
      n8n_base_webhook_url: webhookUrl,
    });

    // Notify client
    await notificationService.notifyClient(id, {
      type: 'settings_updated',
      title: 'Webhook Updated',
      message: 'Your organization webhook configuration has been updated by an admin.',
      metadata: {},
    });

    res.json({
      success: true,
      message: 'Webhook URL updated for organization',
      data: organization,
    });
  })
);

/**
 * @route   DELETE /api/admin/organizations/:id/webhook
 * @desc    Remove dedicated webhook (revert org to shared base webhook)
 * @access  Private (Admin)
 */
router.delete(
  '/organizations/:id/webhook',
  authenticateAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const organization = await organizationService.updateOrganization(id, {
      n8n_base_webhook_url: null,
    });

    res.json({
      success: true,
      message: 'Organization reverted to shared base webhook',
      data: organization,
    });
  })
);

// ============================================
// Workflow Test
// ============================================

/**
 * @route   POST /api/admin/workflows/:id/test
 * @desc    Send a test payload to an n8n workflow webhook to verify connectivity
 * @access  Private (Admin)
 */
router.post(
  '/workflows/:id/test',
  authenticateAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const workflow = await db.queryOne<{
      id: string;
      n8n_webhook_url: string;
      workflow_name: string;
      organization_id: string;
    }>('SELECT id, n8n_webhook_url, workflow_name, organization_id FROM n8n_workflows WHERE id = $1', [id]);

    if (!workflow) {
      res.status(404).json({ success: false, message: 'Workflow not found' });
      return;
    }

    const testPayload = {
      test: true,
      workflowId: workflow.id,
      workflowName: workflow.workflow_name,
      organizationId: workflow.organization_id,
      sentAt: new Date().toISOString(),
      message: 'This is a test event from Seekers AI Platform.',
    };

    try {
      const response = await axios.post(workflow.n8n_webhook_url, testPayload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000,
      });

      res.json({
        success: true,
        message: 'Test webhook delivered successfully',
        data: {
          status: response.status,
          responseTime: response.headers['x-response-time'] || null,
        },
      });
    } catch (error: any) {
      res.status(502).json({
        success: false,
        message: 'Webhook test failed',
        error: error.response?.status
          ? `n8n responded with status ${error.response.status}`
          : error.message,
      });
    }
  })
);

// ============================================
// Audit Logs
// ============================================

/**
 * @route   GET /api/admin/audit-logs
 * @desc    Get audit logs with filtering
 * @access  Private (Admin)
 */
router.get(
  '/audit-logs',
  authenticateAdmin,
  asyncHandler(async (req, res) => {
    const filters = {
      userId: req.query.userId as string,
      userType: req.query.userType as string,
      action: req.query.action as string,
      resourceType: req.query.resourceType as string,
      resourceId: req.query.resourceId as string,
      from: req.query.from ? new Date(req.query.from as string) : undefined,
      to: req.query.to ? new Date(req.query.to as string) : undefined,
      limit: parseInt(req.query.limit as string) || 50,
      offset: parseInt(req.query.offset as string) || 0,
    };

    const data = await auditService.getAuditLogs(filters);

    res.json({
      success: true,
      data: data.logs,
      pagination: {
        total: data.total,
        limit: filters.limit,
        offset: filters.offset,
      },
    });
  })
);

export default router;
