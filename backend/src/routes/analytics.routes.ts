import { Router } from 'express';
import { analyticsService } from '../services';
import { authenticate, authenticateAdmin } from '../middleware';
import { asyncHandler } from '../utils/helpers';

const router = Router();

// ============================================
// Client Analytics Routes
// ============================================

/**
 * @route   GET /api/analytics
 * @desc    Get analytics for the organization
 * @access  Private
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const organizationId = req.user!.organizationId;
    const days = parseInt(req.query.days as string) || 30;
    
    const from = new Date();
    from.setDate(from.getDate() - days);
    const to = new Date();

    const analytics = await analyticsService.getOrganizationAnalytics(
      organizationId,
      { from, to }
    );

    res.json({
      success: true,
      data: analytics,
    });
  })
);

/**
 * @route   GET /api/analytics/overview
 * @desc    Engagement overview for the client analytics page: daily AI/human
 *          reply volume, totals + AI efficiency, conversation counts, platforms.
 * @access  Private
 */
router.get(
  '/overview',
  authenticate,
  asyncHandler(async (req, res) => {
    const organizationId = req.user!.organizationId;
    const days = Math.min(parseInt(req.query.days as string) || 30, 365);

    const data = await analyticsService.getEngagementOverview(organizationId, days);

    res.json({
      success: true,
      data,
    });
  })
);

/**
 * @route   GET /api/analytics/messages
 * @desc    Get daily message statistics
 * @access  Private
 */
router.get(
  '/messages',
  authenticate,
  asyncHandler(async (req, res) => {
    const organizationId = req.user!.organizationId;
    const days = parseInt(req.query.days as string) || 30;

    const data = await analyticsService.getDailyStats(organizationId, 'messages', days);

    res.json({
      success: true,
      data,
    });
  })
);

/**
 * @route   GET /api/analytics/conversations
 * @desc    Get daily conversation statistics
 * @access  Private
 */
router.get(
  '/conversations',
  authenticate,
  asyncHandler(async (req, res) => {
    const organizationId = req.user!.organizationId;
    const days = parseInt(req.query.days as string) || 30;

    const data = await analyticsService.getDailyStats(organizationId, 'conversations', days);

    res.json({
      success: true,
      data,
    });
  })
);

/**
 * @route   GET /api/analytics/workflows
 * @desc    Get daily workflow trigger statistics
 * @access  Private
 */
router.get(
  '/workflows',
  authenticate,
  asyncHandler(async (req, res) => {
    const organizationId = req.user!.organizationId;
    const days = parseInt(req.query.days as string) || 30;

    const data = await analyticsService.getDailyStats(organizationId, 'workflows', days);

    res.json({
      success: true,
      data,
    });
  })
);

/**
 * @route   GET /api/analytics/platforms
 * @desc    Get platform breakdown
 * @access  Private
 */
router.get(
  '/platforms',
  authenticate,
  asyncHandler(async (req, res) => {
    const organizationId = req.user!.organizationId;

    const data = await analyticsService.getPlatformBreakdown(organizationId);

    res.json({
      success: true,
      data,
    });
  })
);

// ============================================
// Admin Analytics Routes
// ============================================

/**
 * @route   GET /api/admin/analytics/dashboard
 * @desc    Get admin dashboard statistics
 * @access  Private (Admin)
 */
router.get(
  '/admin/dashboard',
  authenticateAdmin,
  asyncHandler(async (req, res) => {
    const stats = await analyticsService.getAdminDashboardStats();

    res.json({
      success: true,
      data: stats,
    });
  })
);

/**
 * @route   GET /api/admin/analytics/organizations/:id
 * @desc    Get analytics for a specific organization
 * @access  Private (Admin)
 */
router.get(
  '/admin/organizations/:id',
  authenticateAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const days = parseInt(req.query.days as string) || 30;
    
    const from = new Date();
    from.setDate(from.getDate() - days);
    const to = new Date();

    const analytics = await analyticsService.getOrganizationAnalytics(id, { from, to });

    res.json({
      success: true,
      data: analytics,
    });
  })
);

/**
 * @route   GET /api/admin/analytics/global/messages
 * @desc    Get global message statistics
 * @access  Private (Admin)
 */
router.get(
  '/admin/global/messages',
  authenticateAdmin,
  asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days as string) || 30;

    const data = await analyticsService.getDailyStats(null, 'messages', days);

    res.json({
      success: true,
      data,
    });
  })
);

/**
 * @route   GET /api/admin/analytics/global/conversations
 * @desc    Get global conversation statistics
 * @access  Private (Admin)
 */
router.get(
  '/admin/global/conversations',
  authenticateAdmin,
  asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days as string) || 30;

    const data = await analyticsService.getDailyStats(null, 'conversations', days);

    res.json({
      success: true,
      data,
    });
  })
);

/**
 * @route   GET /api/admin/analytics/global/workflows
 * @desc    Get global workflow statistics
 * @access  Private (Admin)
 */
router.get(
  '/admin/global/workflows',
  authenticateAdmin,
  asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days as string) || 30;

    const data = await analyticsService.getDailyStats(null, 'workflows', days);

    res.json({
      success: true,
      data,
    });
  })
);

// ============================================
// Client Usage Analytics
// ============================================

/**
 * @route   GET /api/analytics/usage
 * @desc    Get usage analytics with plan limits
 * @access  Private
 */
router.get(
  '/usage',
  authenticate,
  asyncHandler(async (req, res) => {
    const organizationId = req.user!.organizationId;
    const days = parseInt(req.query.days as string) || 30;

    const data = await analyticsService.getUsageAnalytics(organizationId, days);

    res.json({
      success: true,
      data,
    });
  })
);

/**
 * @route   GET /api/analytics/webhooks
 * @desc    Get webhook performance for org
 * @access  Private
 */
router.get(
  '/webhooks',
  authenticate,
  asyncHandler(async (req, res) => {
    const organizationId = req.user!.organizationId;
    const days = parseInt(req.query.days as string) || 30;

    const data = await analyticsService.getWebhookPerformance(organizationId, days);

    res.json({
      success: true,
      data,
    });
  })
);

// ============================================
// Admin Revenue & System Analytics
// ============================================

/**
 * @route   GET /api/analytics/admin/revenue
 * @desc    Get revenue analytics
 * @access  Private (Admin)
 */
router.get(
  '/admin/revenue',
  authenticateAdmin,
  asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days as string) || 30;

    const data = await analyticsService.getRevenueAnalytics(days);

    res.json({
      success: true,
      data,
    });
  })
);

/**
 * @route   GET /api/analytics/admin/webhooks
 * @desc    Get global webhook performance
 * @access  Private (Admin)
 */
router.get(
  '/admin/webhooks',
  authenticateAdmin,
  asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days as string) || 30;

    const data = await analyticsService.getWebhookPerformance(null, days);

    res.json({
      success: true,
      data,
    });
  })
);

/**
 * @route   GET /api/analytics/admin/health
 * @desc    Get system health dashboard
 * @access  Private (Admin)
 */
router.get(
  '/admin/health',
  authenticateAdmin,
  asyncHandler(async (_req, res) => {
    const data = await analyticsService.getSystemHealth();

    res.json({
      success: true,
      data,
    });
  })
);

export default router;
