/**
 * Two-Factor Authentication Service
 * Implements TOTP-based 2FA using speakeasy
 */

import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { db } from '../config/database';
import { logger } from '../config';

export interface TwoFactorSetup {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
}

export interface TwoFactorVerification {
  valid: boolean;
  delta?: number;
}

export class TwoFactorService {
  private readonly APP_NAME = 'Seekers AI';

  /**
   * Generate a new 2FA secret for a user
   */
  async generateSecret(userId: string, email: string): Promise<TwoFactorSetup> {
    const secret = speakeasy.generateSecret({
      name: `${this.APP_NAME}:${email}`,
      issuer: this.APP_NAME,
      length: 32,
    });

    if (!secret.otpauth_url) {
      throw new Error('Failed to generate OTP auth URL');
    }

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);

    // Store the secret temporarily (not enabled yet)
    await this.storeTempSecret(userId, secret.base32);

    logger.info('2FA secret generated', { userId });

    return {
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url,
      qrCodeDataUrl,
    };
  }

  /**
   * Verify a TOTP token and enable 2FA if valid
   */
  async verifyAndEnable(
    userId: string,
    token: string,
    userType: 'user' | 'admin' = 'user'
  ): Promise<TwoFactorVerification> {
    // Get the temporary secret
    const tempSecret = await this.getTempSecret(userId);
    
    if (!tempSecret) {
      logger.warn('2FA enable attempted without setup', { userId });
      return { valid: false };
    }

    // Verify the token
    const verified = speakeasy.totp.verify({
      secret: tempSecret,
      encoding: 'base32',
      token,
      window: 1, // Allow 1 step before/after for clock drift
    });

    if (!verified) {
      logger.warn('Invalid 2FA token during enable', { userId });
      return { valid: false };
    }

    // Enable 2FA - store the secret permanently
    await this.enableTwoFactor(userId, tempSecret, userType);
    
    // Clear the temporary secret
    await this.clearTempSecret(userId);

    logger.info('2FA enabled successfully', { userId, userType });

    return { valid: true };
  }

  /**
   * Verify a TOTP token for login
   */
  async verifyToken(
    userId: string,
    token: string,
    userType: 'user' | 'admin' = 'user'
  ): Promise<TwoFactorVerification> {
    const secret = await this.getSecret(userId, userType);
    
    if (!secret) {
      logger.warn('2FA verify attempted but not enabled', { userId });
      return { valid: false };
    }

    const verification = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!verification) {
      logger.warn('Invalid 2FA token during login', { userId });
      return { valid: false };
    }

    logger.debug('2FA token verified', { userId });
    return { valid: true };
  }

  /**
   * Check if 2FA is enabled for a user
   */
  async isTwoFactorEnabled(userId: string, userType: 'user' | 'admin' = 'user'): Promise<boolean> {
    const table = userType === 'admin' ? 'admin_users' : 'users';
    
    const result = await db.queryOne<{ two_factor_enabled: boolean }>(
      `SELECT two_factor_enabled FROM ${table} WHERE id = $1`,
      [userId]
    );

    return result?.two_factor_enabled ?? false;
  }

  /**
   * Disable 2FA for a user
   */
  async disableTwoFactor(
    userId: string,
    token: string,
    userType: 'user' | 'admin' = 'user'
  ): Promise<boolean> {
    // Verify the token first
    const verification = await this.verifyToken(userId, token, userType);
    
    if (!verification.valid) {
      return false;
    }

    const table = userType === 'admin' ? 'admin_users' : 'users';

    await db.query(
      `UPDATE ${table} 
       SET two_factor_enabled = FALSE, two_factor_secret = NULL, updated_at = NOW() 
       WHERE id = $1`,
      [userId]
    );

    logger.info('2FA disabled', { userId, userType });
    return true;
  }

  /**
   * Generate backup codes
   */
  async generateBackupCodes(userId: string, userType: 'user' | 'admin' = 'user'): Promise<string[]> {
    const codes: string[] = [];
    
    // Generate 10 backup codes
    for (let i = 0; i < 10; i++) {
      const code = this.generateRandomCode(8);
      codes.push(code);
    }

    // Hash and store the codes
    const hashedCodes = codes.map(code => 
      speakeasy.generateSecret({ length: 20 }).base32 + ':' + code.split('-').join('')
    );

    const table = userType === 'admin' ? 'admin_users' : 'users';

    await db.query(
      `UPDATE ${table} 
       SET two_factor_backup_codes = $1, updated_at = NOW() 
       WHERE id = $2`,
      [JSON.stringify(hashedCodes), userId]
    );

    logger.info('Backup codes generated', { userId, userType, count: codes.length });

    return codes;
  }

  /**
   * Verify a backup code
   */
  async verifyBackupCode(
    userId: string,
    code: string,
    userType: 'user' | 'admin' = 'user'
  ): Promise<boolean> {
    const table = userType === 'admin' ? 'admin_users' : 'users';

    const result = await db.queryOne<{ two_factor_backup_codes: string }>(
      `SELECT two_factor_backup_codes FROM ${table} WHERE id = $1`,
      [userId]
    );

    if (!result?.two_factor_backup_codes) {
      return false;
    }

    const hashedCodes: string[] = JSON.parse(result.two_factor_backup_codes);
    const normalizedCode = code.replace(/-/g, '').toUpperCase();
    
    // Find and remove the used code
    const codeIndex = hashedCodes.findIndex(hc => hc.includes(normalizedCode));
    
    if (codeIndex === -1) {
      return false;
    }

    // Remove the used code
    hashedCodes.splice(codeIndex, 1);

    await db.query(
      `UPDATE ${table} 
       SET two_factor_backup_codes = $1, updated_at = NOW() 
       WHERE id = $2`,
      [JSON.stringify(hashedCodes), userId]
    );

    logger.info('Backup code used', { userId, userType, remainingCodes: hashedCodes.length });

    return true;
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private async storeTempSecret(userId: string, secret: string): Promise<void> {
    // Store in a temporary table or Redis
    // For simplicity, we'll use a database column
    await db.query(
      `UPDATE users 
       SET two_factor_temp_secret = $1, updated_at = NOW() 
       WHERE id = $2`,
      [secret, userId]
    );
  }

  private async getTempSecret(userId: string): Promise<string | null> {
    const result = await db.queryOne<{ two_factor_temp_secret: string }>(
      'SELECT two_factor_temp_secret FROM users WHERE id = $1',
      [userId]
    );
    return result?.two_factor_temp_secret || null;
  }

  private async clearTempSecret(userId: string): Promise<void> {
    await db.query(
      'UPDATE users SET two_factor_temp_secret = NULL, updated_at = NOW() WHERE id = $1',
      [userId]
    );
  }

  private async enableTwoFactor(
    userId: string, 
    secret: string,
    userType: 'user' | 'admin'
  ): Promise<void> {
    const table = userType === 'admin' ? 'admin_users' : 'users';

    await db.query(
      `UPDATE ${table} 
       SET two_factor_enabled = TRUE, two_factor_secret = $1, updated_at = NOW() 
       WHERE id = $2`,
      [secret, userId]
    );
  }

  private async getSecret(userId: string, userType: 'user' | 'admin'): Promise<string | null> {
    const table = userType === 'admin' ? 'admin_users' : 'users';

    const result = await db.queryOne<{ two_factor_secret: string }>(
      `SELECT two_factor_secret FROM ${table} WHERE id = $1`,
      [userId]
    );

    return result?.two_factor_secret || null;
  }

  private generateRandomCode(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
      if (i > 0 && i % 4 === 0) code += '-';
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }
}

export const twoFactorService = new TwoFactorService();
