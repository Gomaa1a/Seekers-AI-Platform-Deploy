import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, config, logger, redisClient } from '../config';
import { CACHE_KEYS } from '../utils/constants';
import { AdminUser, AdminLoginInput, AdminJwtPayload, AdminRole } from '../types';

export class AdminAuthService {
  /**
   * Admin login
   */
  async login(input: AdminLoginInput): Promise<{
    admin: Omit<AdminUser, 'password_hash'>;
    token: string;
    expiresIn: number;
  }> {
    // Find admin
    const admin = await db.queryOne<AdminUser>(
      `SELECT * FROM admin_users WHERE email = $1`,
      [input.email.toLowerCase()]
    );

    if (!admin) {
      throw new Error('Invalid email or password');
    }

    if (admin.status !== 'active') {
      throw new Error('Your admin account has been disabled');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(input.password, admin.password_hash);

    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    await db.query(
      'UPDATE admin_users SET last_login_at = NOW() WHERE id = $1',
      [admin.id]
    );

    // Generate admin token
    const token = this.generateAdminToken(admin.id, admin.email, admin.role);
    const expiresIn = this.parseExpiresIn(config.jwt.adminExpiresIn);

    // Cache session
    await redisClient.setJson(
      CACHE_KEYS.ADMIN_SESSION(admin.id),
      { role: admin.role },
      expiresIn
    );

    // Log activity
    await this.logAdminActivity(admin.id, 'login', null, null, {});

    logger.info('Admin logged in', { adminId: admin.id, email: admin.email, role: admin.role });

    // Return admin without password hash
    const { password_hash, ...adminWithoutPassword } = admin;

    return {
      admin: adminWithoutPassword,
      token,
      expiresIn,
    };
  }

  /**
   * Admin logout
   */
  async logout(adminId: string): Promise<void> {
    await redisClient.del(CACHE_KEYS.ADMIN_SESSION(adminId));
    logger.info('Admin logged out', { adminId });
  }

  /**
   * Get current admin info
   */
  async getCurrentAdmin(adminId: string): Promise<Omit<AdminUser, 'password_hash'>> {
    const admin = await db.queryOne<AdminUser>(
      'SELECT * FROM admin_users WHERE id = $1',
      [adminId]
    );

    if (!admin) {
      throw new Error('Admin not found');
    }

    const { password_hash, ...adminWithoutPassword } = admin;
    return adminWithoutPassword;
  }

  /**
   * Create new admin (superadmin only)
   */
  async createAdmin(
    creatorId: string,
    email: string,
    password: string,
    fullName: string,
    role: AdminRole,
    phone?: string
  ): Promise<Omit<AdminUser, 'password_hash'>> {
    // Check if email exists
    const existing = await db.queryOne(
      'SELECT id FROM admin_users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existing) {
      throw new Error('Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, config.security.bcryptRounds);

    const result = await db.queryOne<AdminUser>(
      `INSERT INTO admin_users (email, password_hash, full_name, role, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [email.toLowerCase(), passwordHash, fullName, role, phone || null]
    );

    if (!result) {
      throw new Error('Failed to create admin');
    }

    // Log activity
    await this.logAdminActivity(creatorId, 'create_admin', 'admin_user', result.id, {
      email,
      role,
    });

    logger.info('New admin created', {
      creatorId,
      newAdminId: result.id,
      role,
    });

    const { password_hash, ...adminWithoutPassword } = result;
    return adminWithoutPassword;
  }

  /**
   * Update admin
   */
  async updateAdmin(
    adminId: string,
    updaterId: string,
    updates: {
      fullName?: string;
      phone?: string;
      role?: AdminRole;
      isActive?: boolean;
    }
  ): Promise<Omit<AdminUser, 'password_hash'>> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.fullName !== undefined) {
      setClauses.push(`full_name = $${paramIndex++}`);
      values.push(updates.fullName);
    }

    if (updates.phone !== undefined) {
      setClauses.push(`phone = $${paramIndex++}`);
      values.push(updates.phone);
    }

    if (updates.role !== undefined) {
      setClauses.push(`role = $${paramIndex++}`);
      values.push(updates.role);
    }

    if (updates.isActive !== undefined) {
      setClauses.push(`status = $${paramIndex++}`);
      values.push(updates.isActive ? 'active' : 'inactive');
    }

    if (setClauses.length === 0) {
      throw new Error('No updates provided');
    }

    values.push(adminId);

    const result = await db.queryOne<AdminUser>(
      `UPDATE admin_users SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (!result) {
      throw new Error('Admin not found');
    }

    // Log activity
    await this.logAdminActivity(updaterId, 'update_admin', 'admin_user', adminId, updates);

    logger.info('Admin updated', { adminId, updaterId, updates });

    const { password_hash, ...adminWithoutPassword } = result;
    return adminWithoutPassword;
  }

  /**
   * Change admin password
   */
  async changePassword(
    adminId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const admin = await db.queryOne<{ password_hash: string }>(
      'SELECT password_hash FROM admin_users WHERE id = $1',
      [adminId]
    );

    if (!admin) {
      throw new Error('Admin not found');
    }

    const isValid = await bcrypt.compare(currentPassword, admin.password_hash);

    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    const newPasswordHash = await bcrypt.hash(newPassword, config.security.bcryptRounds);

    await db.query(
      'UPDATE admin_users SET password_hash = $1 WHERE id = $2',
      [newPasswordHash, adminId]
    );

    // Invalidate session
    await redisClient.del(CACHE_KEYS.ADMIN_SESSION(adminId));

    logger.info('Admin password changed', { adminId });
  }

  /**
   * List all admins
   */
  async listAdmins(): Promise<Omit<AdminUser, 'password_hash'>[]> {
    const admins = await db.queryAll<AdminUser>(
      'SELECT * FROM admin_users ORDER BY created_at DESC'
    );

    return admins.map(({ password_hash, ...admin }) => admin);
  }

  /**
   * Generate admin JWT token
   */
  private generateAdminToken(adminId: string, email: string, role: AdminRole): string {
    const payload: AdminJwtPayload = {
      adminId,
      email,
      role,
      type: 'admin_access',
    };

    // @ts-ignore - jwt.sign accepts string for expiresIn like "8h"
    return jwt.sign(payload, config.jwt.adminSecret, {
      expiresIn: config.jwt.adminExpiresIn,
    });
  }

  /**
   * Parse expires in string to seconds
   */
  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 28800; // Default 8 hours

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 28800;
    }
  }

  /**
   * Log admin activity
   */
  private async logAdminActivity(
    adminId: string,
    action: string,
    resourceType: string | null,
    resourceId: string | null,
    details: Record<string, any>
  ): Promise<void> {
    await db.query(
      `INSERT INTO activity_logs (user_type, admin_id, action, resource_type, resource_id, details)
       VALUES ('admin', $1, $2, $3, $4, $5)`,
      [adminId, action, resourceType, resourceId, JSON.stringify(details)]
    );
  }
}

export const adminAuthService = new AdminAuthService();
export default adminAuthService;
