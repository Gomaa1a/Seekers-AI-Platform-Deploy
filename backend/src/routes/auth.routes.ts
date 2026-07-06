import { Router, Request, Response, NextFunction } from 'express';
import { authService } from '../services';
import { twoFactorService } from '../services/twoFactor.service';
import { authenticate, authLimiter, passwordResetLimiter } from '../middleware';
import { validateSchema, schemas } from '../middleware/validation';
import { AuthenticatedRequest } from '../types';

const router = Router();

// Async handler wrapper
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user and organization
 * @access  Public
 */
router.post(
  '/register',
  authLimiter,
  validateSchema(schemas.register),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password, fullName, organizationName, phone, industry } = req.body;

    const result = await authService.register({
      email,
      password,
      fullName,
      organizationName,
      phone,
      industry,
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: result,
    });
  })
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  authLimiter,
  validateSchema(schemas.login),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const result = await authService.login({ email, password });

    res.json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  })
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post(
  '/logout',
  authenticate,
  asyncHandler(async (req: Request & AuthenticatedRequest, res: Response) => {
    await authService.logout(req.user!.userId);

    res.json({
      success: true,
      message: 'Logout successful',
    });
  })
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post(
  '/refresh',
  asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken, userId, organizationId } = req.body;

    if (!refreshToken || !userId || !organizationId) {
      res.status(400).json({
        success: false,
        message: 'Refresh token, userId and organizationId are required',
      });
      return;
    }

    const result = await authService.refreshTokens(userId, organizationId);

    res.json({
      success: true,
      message: 'Token refreshed',
      data: result,
    });
  })
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: Request & AuthenticatedRequest, res: Response) => {
    const result = await authService.getCurrentUser(req.user!.userId);

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * @route   PUT /api/auth/me
 * @desc    Update current user's profile (name, phone, job title, timezone)
 * @access  Private
 */
router.put(
  '/me',
  authenticate,
  asyncHandler(async (req: Request & AuthenticatedRequest, res: Response) => {
    const { fullName, phone, jobTitle, timezone, avatarUrl } = req.body || {};

    const user = await authService.updateProfile(req.user!.userId, {
      fullName,
      phone,
      jobTitle,
      timezone,
      avatarUrl,
    });

    res.json({
      success: true,
      message: 'Profile updated',
      data: { user },
    });
  })
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post(
  '/forgot-password',
  passwordResetLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        message: 'Email is required',
      });
      return;
    }

    await authService.requestPasswordReset(email);

    // Always return success to prevent email enumeration
    res.json({
      success: true,
      message: 'If an account exists with this email, a reset link has been sent',
    });
  })
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post(
  '/reset-password',
  asyncHandler(async (req: Request, res: Response) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      res.status(400).json({
        success: false,
        message: 'Token and new password are required',
      });
      return;
    }

    await authService.resetPassword(token, newPassword);

    res.json({
      success: true,
      message: 'Password reset successful',
    });
  })
);

/**
 * @route   POST /api/auth/send-verification
 * @desc    Send verification email
 * @access  Public
 */
router.post(
  '/send-verification',
  asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        message: 'Email is required',
      });
      return;
    }

    await authService.requestVerificationEmail(email);

    // Always return success to prevent email enumeration
    res.json({
      success: true,
      message: 'If an unverified account exists with this email, a verification link has been sent',
    });
  })
);

/**
 * @route   GET /api/auth/verify-email/:token
 * @desc    Verify email with token
 * @access  Public
 */
router.get(
  '/verify-email/:token',
  asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params;

    if (!token) {
      res.status(400).json({
        success: false,
        message: 'Verification token is required',
      });
      return;
    }

    await authService.verifyEmail(token);

    res.json({
      success: true,
      message: 'Email verified successfully',
    });
  })
);

// ============================================
// Two-Factor Authentication Routes
// ============================================

/**
 * @route   POST /api/auth/2fa/setup
 * @desc    Generate 2FA secret and QR code
 * @access  Private
 */
router.post(
  '/2fa/setup',
  authenticate,
  asyncHandler(async (req: Request & AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const email = req.user!.email;

    // Check if 2FA is already enabled
    const isEnabled = await twoFactorService.isTwoFactorEnabled(userId);
    if (isEnabled) {
      res.status(400).json({
        success: false,
        message: '2FA is already enabled for this account',
      });
      return;
    }

    const setup = await twoFactorService.generateSecret(userId, email);

    res.json({
      success: true,
      message: 'Scan the QR code with your authenticator app',
      data: {
        qrCodeDataUrl: setup.qrCodeDataUrl,
        manualEntryKey: setup.secret,
      },
    });
  })
);

/**
 * @route   POST /api/auth/2fa/enable
 * @desc    Verify token and enable 2FA
 * @access  Private
 */
router.post(
  '/2fa/enable',
  authenticate,
  asyncHandler(async (req: Request & AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { token } = req.body;

    if (!token) {
      res.status(400).json({
        success: false,
        message: 'Verification token is required',
      });
      return;
    }

    const result = await twoFactorService.verifyAndEnable(userId, token);

    if (!result.valid) {
      res.status(400).json({
        success: false,
        message: 'Invalid verification code. Please try again.',
      });
      return;
    }

    // Generate backup codes
    const backupCodes = await twoFactorService.generateBackupCodes(userId);

    res.json({
      success: true,
      message: '2FA enabled successfully',
      data: {
        backupCodes,
        warning: 'Save these backup codes in a safe place. They can only be used once.',
      },
    });
  })
);

/**
 * @route   POST /api/auth/2fa/disable
 * @desc    Disable 2FA
 * @access  Private
 */
router.post(
  '/2fa/disable',
  authenticate,
  asyncHandler(async (req: Request & AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { token } = req.body;

    if (!token) {
      res.status(400).json({
        success: false,
        message: 'Verification token is required to disable 2FA',
      });
      return;
    }

    const success = await twoFactorService.disableTwoFactor(userId, token);

    if (!success) {
      res.status(400).json({
        success: false,
        message: 'Invalid verification code',
      });
      return;
    }

    res.json({
      success: true,
      message: '2FA has been disabled',
    });
  })
);

/**
 * @route   POST /api/auth/2fa/verify
 * @desc    Verify 2FA token during login
 * @access  Public
 */
router.post(
  '/2fa/verify',
  authLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { userId, token, useBackupCode } = req.body;

    if (!userId || !token) {
      res.status(400).json({
        success: false,
        message: 'User ID and token are required',
      });
      return;
    }

    let valid = false;

    if (useBackupCode) {
      valid = await twoFactorService.verifyBackupCode(userId, token);
    } else {
      const result = await twoFactorService.verifyToken(userId, token);
      valid = result.valid;
    }

    if (!valid) {
      res.status(401).json({
        success: false,
        message: 'Invalid verification code',
      });
      return;
    }

    // Generate full auth tokens after 2FA verification
    const authResult = await authService.complete2FALogin(userId);

    res.json({
      success: true,
      message: '2FA verification successful',
      data: authResult,
    });
  })
);

/**
 * @route   GET /api/auth/2fa/status
 * @desc    Get 2FA status for current user
 * @access  Private
 */
router.get(
  '/2fa/status',
  authenticate,
  asyncHandler(async (req: Request & AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const isEnabled = await twoFactorService.isTwoFactorEnabled(userId);

    res.json({
      success: true,
      data: {
        twoFactorEnabled: isEnabled,
      },
    });
  })
);

/**
 * @route   POST /api/auth/2fa/regenerate-backup
 * @desc    Regenerate backup codes
 * @access  Private
 */
router.post(
  '/2fa/regenerate-backup',
  authenticate,
  asyncHandler(async (req: Request & AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { token } = req.body;

    if (!token) {
      res.status(400).json({
        success: false,
        message: 'Verification token is required',
      });
      return;
    }

    // Verify current 2FA token before regenerating
    const result = await twoFactorService.verifyToken(userId, token);
    if (!result.valid) {
      res.status(400).json({
        success: false,
        message: 'Invalid verification code',
      });
      return;
    }

    const backupCodes = await twoFactorService.generateBackupCodes(userId);

    res.json({
      success: true,
      message: 'New backup codes generated. Previous codes are now invalid.',
      data: {
        backupCodes,
      },
    });
  })
);

export default router;
