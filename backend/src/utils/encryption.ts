import crypto from 'crypto';
import { config } from '../config';

const ALGORITHM = config.encryption.algorithm;
const KEY = Buffer.from(config.encryption.key, 'hex');

/**
 * Encrypt a string value
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt an encrypted string
 */
export function decrypt(encryptedData: string): string {
  const parts = encryptedData.split(':');
  
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Generate a random token
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a secure random string for OAuth state
 */
export function generateOAuthState(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Hash a string using SHA256
 */
export function hashString(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

/**
 * Generate a secure slug from a string
 */
export function generateSlug(text: string): string {
  const baseSlug = text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  const randomSuffix = crypto.randomBytes(4).toString('hex');
  return `${baseSlug}-${randomSuffix}`;
}

/**
 * Verify HMAC signature (for Meta webhooks)
 */
export function verifyHmacSignature(
  signature: string,
  payload: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  const providedSignature = signature.replace('sha256=', '');
  
  return crypto.timingSafeEqual(
    Buffer.from(providedSignature),
    Buffer.from(expectedSignature)
  );
}

export default {
  encrypt,
  decrypt,
  generateToken,
  generateOAuthState,
  hashString,
  generateSlug,
  verifyHmacSignature,
};
