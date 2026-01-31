// Export all types from a central location
export * from './auth.types';
export * from './organization.types';
export * from './meta.types';
export * from './workflow.types';
export * from './notification.types';
export * from './admin.types';
export * from './billing.types';

// Import Express augmentation (side-effect import)
import './express.d';

// ============================================
// Common Types
// ============================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DateRangeParams {
  startDate?: Date | string;
  endDate?: Date | string;
}

// ============================================
// Express Extensions
// ============================================

import { Request } from 'express';
import { JwtPayload, AdminJwtPayload, AdminRole } from './auth.types';

export interface TypedRequest<T = any> extends Request {
  body: T;
}

// Re-export the Express augmentation types for convenience
// The actual augmentation is in express.d.ts
export type AuthRequest = Request;
export type AdminRequest = Request;

// ============================================
// Service Response Types
// ============================================

export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: number;
}

// ============================================
// Queue Job Types
// ============================================

export interface WebhookJobData {
  platform: 'facebook' | 'instagram';
  eventType: string;
  assetId: string;
  payload: Record<string, any>;
  receivedAt: string;
}

export interface NotificationJobData {
  type: 'admin' | 'client';
  notificationId: string;
  channels: ('email' | 'websocket' | 'push')[];
}

export interface TokenRefreshJobData {
  tokenId: string;
  organizationId: string;
  tokenType: 'user' | 'page';
}

// ============================================
// Analytics Types
// ============================================

export interface AnalyticsSummary {
  totalConversations: number;
  totalMessages: number;
  activeWorkflows: number;
  connectedPages: number;
  dateRange: {
    from: Date;
    to: Date;
  };
}

export interface OrganizationAnalytics {
  organizationId: string;
  dateRange: {
    from: Date;
    to: Date;
  };
  conversations: {
    total: number;
    active: number;
    resolved: number;
    avgDuration: number;
  };
  messages: {
    totalReceived: number;
    totalSent: number;
    avgResponseTime: number;
    byPlatform: Record<string, number>;
  };
  workflows: {
    active: number;
    totalTriggers: number;
    successRate: number;
    byType: Record<string, number>;
  };
  pages: {
    facebook: number;
    instagram: number;
    active: number;
  };
}
