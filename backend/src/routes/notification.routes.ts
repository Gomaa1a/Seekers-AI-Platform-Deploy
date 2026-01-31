import { Router } from 'express';
import { notificationService } from '../services';
import { authenticate, authenticateAdmin } from '../middleware';
import { asyncHandler } from '../utils/helpers';

const router = Router();

// ============================================
// Client Notification Routes
// ============================================

/**
 * @route   GET /api/notifications
 * @desc    Get notifications for the current user
 * @access  Private
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const unreadOnly = req.query.unreadOnly === 'true';
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const result = await notificationService.getUserNotifications(userId, 'client', {
      unreadOnly,
      page,
      limit,
    });

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Mark a notification as read
 * @access  Private
 */
router.put(
  '/:id/read',
  authenticate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user!.userId;

    const notification = await notificationService.markAsRead(id, userId, 'client');

    if (!notification) {
      res.status(404).json({
        success: false,
        message: 'Notification not found or already read',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: notification,
    });
  })
);

/**
 * @route   PUT /api/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put(
  '/read-all',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;

    const count = await notificationService.markAllAsRead(userId, 'client');

    res.json({
      success: true,
      message: `${count} notifications marked as read`,
    });
  })
);

// ============================================
// Admin Notification Routes
// ============================================

/**
 * @route   GET /api/admin/notifications
 * @desc    Get notifications for the current admin
 * @access  Private (Admin)
 */
router.get(
  '/admin',
  authenticateAdmin,
  asyncHandler(async (req, res) => {
    const adminId = req.admin!.adminId;
    const unreadOnly = req.query.unreadOnly === 'true';
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const result = await notificationService.getUserNotifications(adminId, 'admin', {
      unreadOnly,
      page,
      limit,
    });

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * @route   PUT /api/admin/notifications/:id/read
 * @desc    Mark an admin notification as read
 * @access  Private (Admin)
 */
router.put(
  '/admin/:id/read',
  authenticateAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const adminId = req.admin!.adminId;

    const notification = await notificationService.markAsRead(id, adminId, 'admin');

    if (!notification) {
      res.status(404).json({
        success: false,
        message: 'Notification not found or already read',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: notification,
    });
  })
);

/**
 * @route   PUT /api/admin/notifications/read-all
 * @desc    Mark all admin notifications as read
 * @access  Private (Admin)
 */
router.put(
  '/admin/read-all',
  authenticateAdmin,
  asyncHandler(async (req, res) => {
    const adminId = req.admin!.adminId;

    const count = await notificationService.markAllAsRead(adminId, 'admin');

    res.json({
      success: true,
      message: `${count} notifications marked as read`,
    });
  })
);

/**
 * @route   GET /api/admin/notifications/queue
 * @desc    Get admin notification queue (for dashboard)
 * @access  Private (Admin)
 */
router.get(
  '/admin/queue',
  authenticateAdmin,
  asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 100;

    const queue = await notificationService.getAdminNotificationQueue(limit);

    res.json({
      success: true,
      data: queue,
    });
  })
);

export default router;
