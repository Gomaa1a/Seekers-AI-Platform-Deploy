import apiClient, { adminClient, TokenManager } from '../client';
import type {
  User,
  AdminUser,
  LoginResponse,
  AdminLoginResponse,
  RegisterResponse,
  Organization
} from '../../types';

// ============================================
// Request Types
// ============================================

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AdminLoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone?: string;
  organization: {
    name: string;
    industry?: string;
    website?: string;
  };
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  token: string;
  password: string;
}

// ============================================
// Auth Service
// ============================================

export const authService = {
  // Client Authentication
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
    return response.data;
  },

  async register(data: RegisterData): Promise<RegisterResponse> {
    // Map frontend shape to backend expected shape
    const response = await apiClient.post<RegisterResponse>('/auth/register', {
      email: data.email,
      password: data.password,
      fullName: data.name,
      organizationName: data.organization.name,
      phone: data.phone,
      industry: data.organization.industry,
    });
    return response.data;
  },

  // Backend: GET /api/auth/me → { user, organization }
  async getProfile(): Promise<{
    user: User & {
      first_name?: string;
      last_name?: string;
      job_title?: string | null;
      timezone?: string | null;
      two_factor_enabled?: boolean;
    };
    organization: Organization;
  }> {
    const response = await apiClient.get('/auth/me');
    return response.data as any;
  },

  // Backend: PUT /api/auth/me
  async updateProfile(data: {
    fullName?: string;
    phone?: string;
    jobTitle?: string;
    timezone?: string;
    avatarUrl?: string;
  }): Promise<User> {
    const response = await apiClient.put('/auth/me', data);
    return (response.data as any)?.user;
  },

  // Two-factor authentication (backend: /api/auth/2fa/*)
  async get2FAStatus(): Promise<boolean> {
    const response = await apiClient.get('/auth/2fa/status');
    return Boolean((response.data as any)?.twoFactorEnabled);
  },

  async setup2FA(): Promise<{ qrCodeDataUrl: string; manualEntryKey: string }> {
    const response = await apiClient.post('/auth/2fa/setup');
    return response.data as any;
  },

  async enable2FA(token: string): Promise<{ backupCodes: string[] }> {
    const response = await apiClient.post('/auth/2fa/enable', { token });
    return response.data as any;
  },

  async disable2FA(token: string): Promise<void> {
    await apiClient.post('/auth/2fa/disable', { token });
  },

  async changePassword(data: ChangePasswordData): Promise<void> {
    await apiClient.post('/auth/change-password', data);
  },

  async forgotPassword(data: ForgotPasswordData): Promise<void> {
    await apiClient.post('/auth/forgot-password', data);
  },

  async resetPassword(data: ResetPasswordData): Promise<void> {
    await apiClient.post('/auth/reset-password', {
      token: data.token,
      newPassword: data.password,
    });
  },

  async verifyEmail(token: string): Promise<void> {
    await apiClient.get(`/auth/verify-email/${token}`);
  },

  async resendVerification(email: string): Promise<void> {
    await apiClient.post('/auth/send-verification', { email });
  },

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const user = TokenManager.getUser();
    const response = await apiClient.post('/auth/refresh', {
      refreshToken,
      userId: user?.id,
      organizationId: user?.organization_id,
    });
    return response.data;
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },

  // Admin Authentication
  async adminLogin(credentials: AdminLoginCredentials): Promise<AdminLoginResponse> {
    const response = await apiClient.post<AdminLoginResponse>('/admin/auth/login', credentials);
    return response.data;
  },

  async getAdminProfile(): Promise<AdminUser> {
    const response = await adminClient.get<AdminUser>('/auth/me');
    return response.data;
  },

  async adminRefreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const response = await apiClient.post('/admin/auth/refresh', { refreshToken });
    return response.data;
  },
};

export default authService;
