import { Router } from 'express';
import { organizationService } from '../services';
import { authenticate } from '../middleware';
import { asyncHandler } from '../utils/helpers';

const router = Router();

/**
 * @route   GET /api/organization
 * @desc    Get current organization
 * @access  Private
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const organizationId = req.user!.organizationId;

    const organization = await organizationService.getOrganizationById(organizationId);

    if (!organization) {
      res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
      return;
    }

    res.json({
      success: true,
      data: organization,
    });
  })
);

/**
 * @route   PUT /api/organization
 * @desc    Update organization
 * @access  Private
 */
router.put(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const organizationId = req.user!.organizationId;
    const { name, domain, logoUrl, timezone, settings } = req.body;

    const organization = await organizationService.updateOrganization(organizationId, {
      name,
      domain,
      logoUrl,
      timezone,
      settings,
    });

    res.json({
      success: true,
      message: 'Organization updated successfully',
      data: organization,
    });
  })
);

/**
 * @route   GET /api/organization/pages
 * @desc    Get all connected pages
 * @access  Private
 */
router.get(
  '/pages',
  authenticate,
  asyncHandler(async (req, res) => {
    const organizationId = req.user!.organizationId;

    const [facebookPages, instagramAccounts] = await Promise.all([
      organizationService.getFacebookPages(organizationId),
      organizationService.getInstagramAccounts(organizationId),
    ]);

    res.json({
      success: true,
      data: {
        facebook: facebookPages.map((p) => ({
          id: p.id,
          pageId: p.page_id,
          name: p.page_name,
          category: p.page_category,
          pictureUrl: p.page_picture_url,
          isActive: p.is_active,
          connectedAt: p.created_at,
        })),
        instagram: instagramAccounts.map((a) => ({
          id: a.id,
          instagramId: a.instagram_business_account_id,
          username: a.username,
          profilePictureUrl: a.profile_picture_url,
          followersCount: a.followers_count,
          isActive: a.is_active,
          connectedAt: a.created_at,
        })),
      },
    });
  })
);

/**
 * @route   PUT /api/organization/pages/facebook/:id/toggle
 * @desc    Toggle Facebook page active status
 * @access  Private
 */
router.put(
  '/pages/facebook/:id/toggle',
  authenticate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;
    const organizationId = req.user!.organizationId;

    if (typeof isActive !== 'boolean') {
      res.status(400).json({
        success: false,
        message: 'isActive must be a boolean',
      });
      return;
    }

    const page = await organizationService.toggleFacebookPageStatus(id, organizationId, isActive);

    res.json({
      success: true,
      message: `Page ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: page,
    });
  })
);

/**
 * @route   GET /api/organization/workflows
 * @desc    Get all workflows for the organization
 * @access  Private
 */
router.get(
  '/workflows',
  authenticate,
  asyncHandler(async (req, res) => {
    const organizationId = req.user!.organizationId;

    const workflows = await organizationService.getWorkflows(organizationId);

    res.json({
      success: true,
      data: workflows.map((w) => ({
        id: w.id,
        name: w.workflow_name,
        description: w.workflow_type, // No description field, use type as fallback
        platform: w.workflow_type,
        workflowType: w.workflow_type,
        isActive: w.is_active,
        lastTriggeredAt: w.last_triggered_at,
        triggerCount: w.trigger_count,
        createdAt: w.created_at,
      })),
    });
  })
);

/**
 * @route   GET /api/organization/onboarding
 * @desc    Get onboarding status
 * @access  Private
 */
router.get(
  '/onboarding',
  authenticate,
  asyncHandler(async (req, res) => {
    const organizationId = req.user!.organizationId;

    const organization = await organizationService.getOrganizationById(organizationId);

    if (!organization) {
      res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
      return;
    }

    const steps = [
      {
        id: 'account',
        title: 'Create Account',
        description: 'Sign up and create your organization',
        completed: true,
        order: 1,
      },
      {
        id: 'meta_connection',
        title: 'Connect Meta Account',
        description: 'Connect your Facebook/Instagram Business account',
        completed: organization.meta_connected,
        order: 2,
      },
      {
        id: 'add_page',
        title: 'Add a Page',
        description: 'Connect at least one Facebook Page or Instagram account',
        completed: organization.meta_connected,
        order: 3,
      },
      {
        id: 'knowledge_base',
        title: 'Create Knowledge Base',
        description: 'Add content for your AI chatbot to learn from',
        completed: organization.knowledge_base_added,
        order: 4,
      },
      {
        id: 'workflow_request',
        title: 'Request Workflow',
        description: 'Submit a request for your AI automation workflow',
        completed: organization.workflow_requested,
        order: 5,
      },
    ];

    const completedSteps = steps.filter((s) => s.completed).length;
    const totalSteps = steps.length;
    const progress = Math.round((completedSteps / totalSteps) * 100);

    res.json({
      success: true,
      data: {
        steps,
        progress,
        completedSteps,
        totalSteps,
        isComplete: completedSteps === totalSteps,
      },
    });
  })
);

export default router;
