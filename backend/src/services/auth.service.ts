import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, config, logger, redisClient } from '../config';
import { generateToken, generateSlug } from '../utils/encryption';
import { CACHE_KEYS, CACHE_TTL, TIER_LIMITS } from '../utils/constants';
import { emailService } from './email.service';
import {
  User,
  RegisterInput,
  LoginInput,
  AuthTokens,
  JwtPayload,
  Organization,
} from '../types';

export class AuthService {
  /**
   * Register a new user and organization
   */
  async register(input: RegisterInput): Promise<{
    user: Omit<User, 'password_hash'>;
    organization: Organization;
    tokens: AuthTokens;
  }> {
    // Check if email already exists
    const existingUser = await db.queryOne(
      'SELECT id FROM users WHERE email = $1',
      [input.email.toLowerCase()]
    );

    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(input.password, config.security.bcryptRounds);
    
    // Split fullName into first_name and last_name
    const nameParts = input.fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || nameParts[0] || ''; // Use first name as last name if only one word

    // Start transaction
    const result = await db.transaction(async (client) => {
      // Create user
      const userResult = await client.query<User>(
        `INSERT INTO users (email, password_hash, first_name, last_name, phone, status)
         VALUES ($1, $2, $3, $4, $5, 'active')
         RETURNING *`,
        [
          input.email.toLowerCase(),
          passwordHash,
          firstName,
          lastName,
          input.phone || null,
        ]
      );
      const user = userResult.rows[0];

      // Create organization with domain from email
      const emailDomain = input.email.split('@')[1] || `${firstName.toLowerCase()}-org.com`;
      const orgResult = await client.query<Organization>(
        `INSERT INTO organizations (
           name, owner_id, domain, plan_type, status, settings
         )
         VALUES ($1, $2, $3, 'free', 'active', $4)
         RETURNING *`,
        [
          input.organizationName,
          user.id,
          emailDomain,
          JSON.stringify({ industry: input.industry || null, language: 'en', notifications: true }),
        ]
      );
      const organization = orgResult.rows[0];

      return { user, organization };
    });

    // Generate tokens
    const tokens = this.generateTokens(result.user.id, result.user.email, result.organization.id);

    // Cache session
    await redisClient.setJson(
      CACHE_KEYS.USER_SESSION(result.user.id),
      { organizationId: result.organization.id },
      CACHE_TTL.SESSION
    );

    // Log activity
    await this.logActivity(result.user.id, result.organization.id, 'register');

    logger.info('New user registered', {
      userId: result.user.id,
      organizationId: result.organization.id,
      email: result.user.email,
    });

    // Return user without password hash
    const { password_hash, ...userWithoutPassword } = result.user;

    return {
      user: userWithoutPassword,
      organization: result.organization,
      tokens,
    };
  }

  /**
   * Login user
   */
  async login(input: LoginInput): Promise<{
    user: Omit<User, 'password_hash'>;
    organization: Organization;
    tokens: AuthTokens;
  }> {
    // Find user with organization
    const result = await db.queryOne<User & { organization_id: string }>(
      `SELECT u.*, o.id as organization_id
       FROM users u
       JOIN organizations o ON o.owner_id = u.id
       WHERE u.email = $1`,
      [input.email.toLowerCase()]
    );

    if (!result) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(input.password, result.password_hash);

    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Get organization
    const organization = await db.queryOne<Organization>(
      'SELECT * FROM organizations WHERE id = $1',
      [result.organization_id]
    );

    if (!organization) {
      throw new Error('Organization not found');
    }

    // Check subscription status
    if (organization.subscription_status === 'suspended') {
      throw new Error('Your account has been suspended. Please contact support.');
    }

    if (organization.subscription_status === 'cancelled') {
      throw new Error('Your subscription has been cancelled.');
    }

    // Update last login
    await db.query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [result.id]
    );

    // Generate tokens
    const tokens = this.generateTokens(result.id, result.email, organization.id);

    // Cache session
    await redisClient.setJson(
      CACHE_KEYS.USER_SESSION(result.id),
      { organizationId: organization.id },
      CACHE_TTL.SESSION
    );

    // Log activity
    await this.logActivity(result.id, organization.id, 'login');

    logger.info('User logged in', { userId: result.id, email: result.email });

    // Return user without password hash
    const { password_hash, organization_id, ...userWithoutPassword } = result;

    return {
      user: userWithoutPassword,
      organization,
      tokens,
    };
  }

  /**
   * Logout user
   */
  async logout(userId: string): Promise<void> {
    // Remove session from cache
    await redisClient.del(CACHE_KEYS.USER_SESSION(userId));

    logger.info('User logged out', { userId });
  }

  /**
   * Refresh tokens
   */
  async refreshTokens(userId: string, organizationId: string): Promise<AuthTokens> {
    const user = await db.queryOne<{ email: string }>(
      'SELECT email FROM users WHERE id = $1',
      [userId]
    );

    if (!user) {
      throw new Error('User not found');
    }

    return this.generateTokens(userId, user.email, organizationId);
  }

  /**
   * Complete login after 2FA verification
   */
  async complete2FALogin(userId: string): Promise<{
    user: Omit<User, 'password_hash'>;
    organization: Organization;
    tokens: AuthTokens;
  }> {
    // Get user with organization
    const result = await db.queryOne<User & { organization_id: string }>(
      `SELECT u.*, o.id as organization_id
       FROM users u
       JOIN organizations o ON o.owner_id = u.id
       WHERE u.id = $1`,
      [userId]
    );

    if (!result) {
      throw new Error('User not found');
    }

    // Get full organization data
    const organization = await db.queryOne<Organization>(
      'SELECT * FROM organizations WHERE id = $1',
      [result.organization_id]
    );

    if (!organization) {
      throw new Error('Organization not found');
    }

    // Update last login
    await db.query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [result.id]
    );

    // Generate tokens
    const tokens = this.generateTokens(result.id, result.email, organization.id);

    // Cache session
    await redisClient.setJson(
      CACHE_KEYS.USER_SESSION(result.id),
      { organizationId: organization.id },
      CACHE_TTL.SESSION
    );

    // Log activity
    await this.logActivity(result.id, organization.id, 'login_2fa');

    logger.info('User completed 2FA login', { userId: result.id, email: result.email });

    // Return user without password hash
    const { password_hash, organization_id, ...userWithoutPassword } = result;

    return {
      user: userWithoutPassword,
      organization,
      tokens,
    };
  }

  /**
   * Get current user info
   */
  async getCurrentUser(userId: string): Promise<{
    user: Omit<User, 'password_hash'>;
    organization: Organization;
  }> {
    const result = await db.queryOne<User & { organization_id: string }>(
      `SELECT u.*, o.id as organization_id
       FROM users u
       JOIN organizations o ON o.owner_id = u.id
       WHERE u.id = $1`,
      [userId]
    );

    if (!result) {
      throw new Error('User not found');
    }

    const organization = await db.queryOne<Organization>(
      'SELECT * FROM organizations WHERE id = $1',
      [result.organization_id]
    );

    if (!organization) {
      throw new Error('Organization not found');
    }

    const { password_hash, organization_id, ...userWithoutPassword } = result;

    return {
      user: userWithoutPassword,
      organization,
    };
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await db.queryOne<{ id: string }>(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (!user) {
      // Don't reveal if email exists
      return;
    }

    const resetToken = generateToken();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.query(
      `UPDATE users 
       SET reset_password_token = $1, reset_password_expires = $2
       WHERE id = $3`,
      [resetToken, resetExpires, user.id]
    );

    // Send password reset email
    const userData = await db.queryOne<{ first_name: string; email: string }>(
      'SELECT first_name, email FROM users WHERE id = $1',
      [user.id]
    );

    if (userData) {
      await emailService.sendPasswordResetEmail(
        userData.email,
        userData.first_name || 'User',
        resetToken
      );
    }

    logger.info('Password reset requested', { userId: user.id });
  }

  /**
   * Reset password
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await db.queryOne<{ id: string }>(
      `SELECT id FROM users 
       WHERE reset_password_token = $1 
         AND reset_password_expires > NOW()`,
      [token]
    );

    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, config.security.bcryptRounds);

    await db.query(
      `UPDATE users 
       SET password_hash = $1, reset_password_token = NULL, reset_password_expires = NULL
       WHERE id = $2`,
      [passwordHash, user.id]
    );

    logger.info('Password reset completed', { userId: user.id });
  }

  /**
   * Verify email
   */
  async verifyEmail(token: string): Promise<void> {
    const result = await db.query(
      `UPDATE users 
       SET email_verified = true, email_verified_at = NOW(), verification_token = NULL
       WHERE verification_token = $1
       RETURNING id`,
      [token]
    );

    if (result.rowCount === 0) {
      throw new Error('Invalid verification token');
    }

    logger.info('Email verified', { userId: result.rows[0].id });
  }

  /**
   * Send verification email to user
   */
  async sendVerificationEmail(userId: string): Promise<void> {
    const user = await db.queryOne<{ id: string; email: string; first_name: string; email_verified: boolean }>(
      'SELECT id, email, first_name, email_verified FROM users WHERE id = $1',
      [userId]
    );

    if (!user) {
      throw new Error('User not found');
    }

    if (user.email_verified) {
      throw new Error('Email is already verified');
    }

    const verificationToken = generateToken();

    await db.query(
      'UPDATE users SET verification_token = $1 WHERE id = $2',
      [verificationToken, userId]
    );

    // Send verification email
    await emailService.sendVerificationEmail(user.email, user.first_name, verificationToken);

    logger.info('Verification email sent', { userId: user.id });
  }

  /**
   * Request verification email by email address (for resend)
   */
  async requestVerificationEmail(email: string): Promise<void> {
    const user = await db.queryOne<{ id: string; email: string; first_name: string; email_verified: boolean }>(
      'SELECT id, email, first_name, email_verified FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (!user) {
      // Don't reveal if email exists
      return;
    }

    if (user.email_verified) {
      // Don't reveal verification status
      return;
    }

    const verificationToken = generateToken();

    await db.query(
      'UPDATE users SET verification_token = $1 WHERE id = $2',
      [verificationToken, user.id]
    );

    // Send verification email
    await emailService.sendVerificationEmail(user.email, user.first_name, verificationToken);

    logger.info('Verification email resent', { userId: user.id });
  }

  /**
   * Generate JWT tokens
   */
  private generateTokens(userId: string, email: string, organizationId: string): AuthTokens {
    const accessPayload: JwtPayload = {
      userId,
      email,
      organizationId,
      type: 'access',
    };

    const refreshPayload: JwtPayload = {
      userId,
      email,
      organizationId,
      type: 'refresh',
    };

    // @ts-ignore - jwt.sign accepts string for expiresIn like "7d"
    const accessToken = jwt.sign(accessPayload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    // @ts-ignore - jwt.sign accepts string for expiresIn like "30d"
    const refreshToken = jwt.sign(refreshPayload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn,
    });

    // Parse expiresIn to seconds
    const expiresIn = this.parseExpiresIn(config.jwt.expiresIn);

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  /**
   * Parse expires in string to seconds
   */
  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 3600; // Default 1 hour

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 3600;
    }
  }

  /**
   * Log activity
   */
  private async logActivity(
    userId: string,
    organizationId: string,
    action: string
  ): Promise<void> {
    await db.query(
      `INSERT INTO activity_logs (user_type, user_id, organization_id, action)
       VALUES ('client', $1, $2, $3)`,
      [userId, organizationId, action]
    );
  }
}

export const authService = new AuthService();
export default authService;
