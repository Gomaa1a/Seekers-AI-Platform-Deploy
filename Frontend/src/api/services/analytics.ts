import apiClient from '../client';
import type { DashboardStats, AnalyticsData } from '../../types';

// ============================================
// Request Types
// ============================================

export interface AnalyticsParams {
  days?: number;
}

export interface ListConversationsParams {
  page?: number;
  limit?: number;
  platform?: string;
  search?: string;
}

// ============================================
// Analytics Service
// Aligned with backend routes in analytics.routes.ts
// ============================================

export interface EngagementOverview {
  messageVolume: Array<{ date: string; ai: number; human: number; inbound: number }>;
  totals: {
    received: number;
    aiReplies: number;
    humanReplies: number;
    aiEfficiency: number;
  };
  conversations: { total: number; active: number; dms: number; comments: number };
  platforms: Array<{ platform: string; conversations: number; messages: number }>;
}

export const analyticsService = {
  // Engagement overview for the client analytics page
  // Backend: GET /api/analytics/overview?days=30
  async getEngagementOverview(days: number = 30): Promise<EngagementOverview> {
    const response = await apiClient.get('/analytics/overview', { params: { days } });
    return response.data;
  },

  // Get organization analytics (overview)
  // Backend: GET /api/analytics?days=30
  async getAnalytics(params: AnalyticsParams = {}): Promise<AnalyticsData> {
    const response = await apiClient.get<AnalyticsData>('/analytics', {
      params: { days: params.days || 30 },
    });
    return response.data;
  },

  // Alias for dashboard stats - uses same endpoint
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await apiClient.get('/analytics', {
      params: { days: 30 },
    });
    return response.data;
  },

  // Get daily message statistics
  // Backend: GET /api/analytics/messages?days=30
  async getMessageStats(days: number = 30): Promise<any> {
    const response = await apiClient.get('/analytics/messages', {
      params: { days },
    });
    return response.data;
  },

  // Get daily conversation statistics
  // Backend: GET /api/analytics/conversations?days=30
  async getConversationStats(days: number = 30): Promise<any> {
    const response = await apiClient.get('/analytics/conversations', {
      params: { days },
    });
    return response.data;
  },

  // Get daily workflow trigger statistics
  // Backend: GET /api/analytics/workflows?days=30
  async getWorkflowStats(days: number = 30): Promise<any> {
    const response = await apiClient.get('/analytics/workflows', {
      params: { days },
    });
    return response.data;
  },

  // Get platform breakdown
  // Backend: GET /api/analytics/platforms
  async getPlatformBreakdown(): Promise<any> {
    const response = await apiClient.get('/analytics/platforms');
    return response.data;
  },
};

export default analyticsService;
