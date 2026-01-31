import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config, logger, db } from '../config';
import { AdminJwtPayload, AdminRole, AdminRequest } from '../types';

/**
 * Authentication middleware for admin users (Seekers team)
 */
export const authenticateAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Admin authentication required.',
      });
      return;
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Admin token is missing.',
      });
      return;
    }

    // Verify admin token with separate secret
    const decoded = jwt.verify(token, config.jwt.adminSecret) as AdminJwtPayload;

    if (decoded.type !== 'admin_access') {
      res.status(401).json({
        success: false,
        error: 'Invalid admin token type.',
      });
      return;
    }

    // Check if admin exists and is active
    const result = await db.queryOne<{
      id: string;
      email: string;
      role: AdminRole;
      is_active: boolean;
    }>(
      `SELECT id, email, role, is_active
       FROM admin_users
       WHERE id = $1`,
      [decoded.adminId]
    );

    if (!result) {
      res.status(401).json({
        success: false,
        error: 'Admin user not found.',
      });
      return;
    }

    if (!result.is_active) {
      res.status(403).json({
        success: false,
        error: 'Admin account is disabled.',
      });
      return;
    }

    // Attach admin info to request
    (req as AdminRequest).admin = {
      adminId: result.id,
      email: result.email,
      role: result.role,
      type: 'admin_access',
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: 'Admin token has expired. Please login again.',
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: 'Invalid admin token.',
      });
      return;
    }

    logger.error('Admin authentication error', error);
    res.status(500).json({
      success: false,
      error: 'Admin authentication failed.',
    });
  }
};

/**
 * Role-based access control middleware
 */
export const requireRole = (...allowedRoles: AdminRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const adminReq = req as AdminRequest;

    if (!adminReq.admin) {
      res.status(401).json({
        success: false,
        error: 'Admin authentication required.',
      });
      return;
    }

    if (!allowedRoles.includes(adminReq.admin.role as AdminRole)) {
      res.status(403).json({
        success: false,
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
      });
      return;
    }

    next();
  };
};

/**
 * Superadmin only access
 */
export const requireSuperAdmin = requireRole('superadmin');

/**
 * Admin or superadmin access
 */
export const requireAdmin = requireRole('superadmin', 'admin');

/**
 * Any admin role access (including support)
 */
export const requireAnyAdmin = requireRole('superadmin', 'admin', 'support');

export default authenticateAdmin;
