import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config, logger, db } from '../config';
import { JwtPayload, AuthRequest } from '../types';

/**
 * Authentication middleware for client users
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Authentication required. Please provide a valid token.',
      });
      return;
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Authentication token is missing.',
      });
      return;
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;

    if (decoded.type !== 'access') {
      res.status(401).json({
        success: false,
        error: 'Invalid token type.',
      });
      return;
    }

    // Check if user exists and get organization
    const result = await db.queryOne<{
      user_id: string;
      email: string;
      organization_id: string;
      subscription_status: string;
    }>(
      `SELECT u.id as user_id, u.email, o.id as organization_id, o.subscription_status
       FROM users u
       JOIN organizations o ON o.owner_id = u.id
       WHERE u.id = $1`,
      [decoded.userId]
    );

    if (!result) {
      res.status(401).json({
        success: false,
        error: 'User not found or organization deleted.',
      });
      return;
    }

    // Check subscription status
    if (result.subscription_status === 'suspended') {
      res.status(403).json({
        success: false,
        error: 'Your subscription is suspended. Please contact support.',
      });
      return;
    }

    if (result.subscription_status === 'cancelled') {
      res.status(403).json({
        success: false,
        error: 'Your subscription has been cancelled.',
      });
      return;
    }

    // Attach user info to request
    (req as AuthRequest).user = {
      userId: result.user_id,
      email: result.email,
      organizationId: result.organization_id,
      type: 'access',
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: 'Token has expired. Please login again.',
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: 'Invalid token.',
      });
      return;
    }

    logger.error('Authentication error', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed.',
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token provided
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      next();
      return;
    }

    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;

    if (decoded.type === 'access') {
      const result = await db.queryOne<{
        user_id: string;
        email: string;
        organization_id: string;
      }>(
        `SELECT u.id as user_id, u.email, o.id as organization_id
         FROM users u
         JOIN organizations o ON o.owner_id = u.id
         WHERE u.id = $1`,
        [decoded.userId]
      );

      if (result) {
        (req as AuthRequest).user = {
          userId: result.user_id,
          email: result.email,
          organizationId: result.organization_id,
          type: 'access',
        };
      }
    }

    next();
  } catch {
    // Silently continue without authentication
    next();
  }
};

/**
 * Verify refresh token middleware
 */
export const verifyRefreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(401).json({
        success: false,
        error: 'Refresh token is required.',
      });
      return;
    }

    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as JwtPayload;

    if (decoded.type !== 'refresh') {
      res.status(401).json({
        success: false,
        error: 'Invalid token type.',
      });
      return;
    }

    // Check if user exists
    const result = await db.queryOne<{ id: string; email: string }>(
      'SELECT id, email FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (!result) {
      res.status(401).json({
        success: false,
        error: 'User not found.',
      });
      return;
    }

    (req as AuthRequest).user = {
      userId: result.id,
      email: result.email,
      organizationId: decoded.organizationId || '',
      type: 'refresh',
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: 'Refresh token has expired. Please login again.',
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: 'Invalid refresh token.',
      });
      return;
    }

    logger.error('Refresh token verification error', error);
    res.status(500).json({
      success: false,
      error: 'Token verification failed.',
    });
  }
};

export default authenticate;
