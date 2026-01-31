// ============================================
// Authentication Types
// ============================================

export interface User {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  avatar_url: string | null;
  status: 'active' | 'inactive' | 'suspended' | 'pending_verification';
  email_verified: boolean;
  email_verified_at: Date | null;
  last_login_at: Date | null;
  password_reset_token: string | null;
  password_reset_expires: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface AdminUser {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: AdminRole;
  status: 'active' | 'inactive' | 'suspended';
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export type AdminRole = 'superadmin' | 'admin' | 'support';

export interface JwtPayload {
  userId: string;
  email: string;
  organizationId?: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export interface AdminJwtPayload {
  adminId: string;
  email: string;
  role: AdminRole;
  type: 'admin_access';
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  organizationName: string;
  phone?: string;
  industry?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AdminLoginInput {
  email: string;
  password: string;
}

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
}

// Request extensions
export interface AuthenticatedRequest {
  user?: {
    userId: string;
    email: string;
    organizationId: string;
  };
}

export interface AdminAuthenticatedRequest {
  admin?: {
    adminId: string;
    email: string;
    role: AdminRole;
  };
}
