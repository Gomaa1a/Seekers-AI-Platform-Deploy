import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { adminAuthService } from '../services';
import { authenticateAdmin } from '../middleware';
import { validateSchema, schemas } from '../middleware/validation';

// Simple async handler wrapper
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

const router = Router();

/**
 * @route   POST /api/admin/auth/login
 * @desc    Admin login
 * @access  Public
 */
router.post(
  '/login',
  validateSchema(schemas.login),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const result = await adminAuthService.login({ email, password });

    res.json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  })
);

/**
 * @route   POST /api/admin/auth/logout
 * @desc    Admin logout
 * @access  Private (Admin)
 */
router.post(
  '/logout',
  authenticateAdmin as RequestHandler,
  asyncHandler(async (req: Request, res: Response) => {
    const admin = (req as any).admin;
    
    await adminAuthService.logout(admin?.adminId || '');

    res.json({
      success: true,
      message: 'Logout successful',
    });
  })
);

/**
 * @route   GET /api/admin/auth/me
 * @desc    Get current admin profile
 * @access  Private (Admin)
 */
router.get(
  '/me',
  authenticateAdmin as RequestHandler,
  asyncHandler(async (req: Request, res: Response) => {
    const admin = (req as any).admin;
    const adminData = await adminAuthService.getCurrentAdmin(admin?.adminId || '');

    if (!adminData) {
      res.status(404).json({
        success: false,
        message: 'Admin not found',
      });
      return;
    }

    res.json({
      success: true,
      data: adminData,
    });
  })
);

/**
 * @route   PUT /api/admin/auth/password
 * @desc    Change admin password
 * @access  Private (Admin)
 */
router.put(
  '/password',
  authenticateAdmin as RequestHandler,
  asyncHandler(async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    const admin = (req as any).admin;

    await adminAuthService.changePassword(admin?.adminId || '', currentPassword, newPassword);

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  })
);

// ============================================
// Admin User Management (Superadmin only)
// ============================================

/**
 * @route   GET /api/admin/auth/admins
 * @desc    Get all admins
 * @access  Private (Superadmin)
 */
router.get(
  '/admins',
  authenticateAdmin as RequestHandler,
  asyncHandler(async (req: Request, res: Response) => {
    const admins = await adminAuthService.listAdmins();

    res.json({
      success: true,
      data: admins,
    });
  })
);

/**
 * @route   POST /api/admin/auth/admins
 * @desc    Create new admin
 * @access  Private (Superadmin)
 */
router.post(
  '/admins',
  authenticateAdmin as RequestHandler,
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password, fullName, role, phone } = req.body;
    const admin = (req as any).admin;

    const newAdmin = await adminAuthService.createAdmin(
      admin?.adminId || '',
      email,
      password,
      fullName,
      role,
      phone
    );

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      data: newAdmin,
    });
  })
);

/**
 * @route   PUT /api/admin/auth/admins/:id
 * @desc    Update admin
 * @access  Private (Superadmin)
 */
router.put(
  '/admins/:id',
  authenticateAdmin as RequestHandler,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;
    const admin = (req as any).admin;

    const updatedAdmin = await adminAuthService.updateAdmin(id, admin?.adminId || '', updates);

    res.json({
      success: true,
      message: 'Admin updated successfully',
      data: updatedAdmin,
    });
  })
);

/**
 * @route   DELETE /api/admin/auth/admins/:id
 * @desc    Deactivate admin
 * @access  Private (Superadmin)
 */
router.delete(
  '/admins/:id',
  authenticateAdmin as RequestHandler,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const admin = (req as any).admin;

    // Don't allow deleting yourself
    if (id === admin?.adminId) {
      res.status(400).json({
        success: false,
        message: 'Cannot deactivate your own account',
      });
      return;
    }

    await adminAuthService.updateAdmin(id, admin?.adminId || '', { isActive: false });

    res.json({
      success: true,
      message: 'Admin deactivated successfully',
    });
  })
);

export default router;
