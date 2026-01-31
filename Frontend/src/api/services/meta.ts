import apiClient from '../client';
import type {
  MetaPage,
  MetaConnectionStatusResponse,
} from '../../types';

// ============================================
// Request Types
// ============================================

export interface OAuthCallbackData {
  code: string;
  state?: string;
}

export interface UpdatePageData {
  is_active?: boolean;
}

// ============================================
// Meta Service
// Aligned with backend routes in meta.routes.ts
// ============================================

export const metaService = {
  // Get OAuth URL for Meta login
  // Backend: GET /api/meta/oauth/url -> { url }
  async getOAuthUrl(): Promise<{ url: string; state: string }> {
    const response = await apiClient.get<{ url: string }>('/meta/oauth/url');
    return { url: response.data.url || response.data as any, state: '' };
  },

  // Get connection status for organization
  // Backend: GET /api/meta/connection-status
  async getConnectionStatus(): Promise<MetaConnectionStatusResponse> {
    const response = await apiClient.get<any>('/meta/connection-status');
    const data = response.data;
    return {
      connected: data.metaConnected,
      platforms: {
        facebook: {
          connected: (data.facebookPages?.length || 0) > 0,
          pages: data.facebookPages || [],
        },
        instagram: {
          connected: (data.instagramAccounts?.length || 0) > 0,
          pages: data.instagramAccounts || [],
        },
      },
    };
  },

  // Get connected Facebook pages from Meta
  // Backend: GET /api/meta/pages
  async getPages(): Promise<MetaPage[]> {
    const response = await apiClient.get<MetaPage[]>('/meta/pages');
    return response.data || [];
  },

  // Connect a Facebook page
  // Backend: POST /api/meta/pages/:pageId/connect
  async connectPage(pageId: string): Promise<any> {
    const response = await apiClient.post(`/meta/pages/${pageId}/connect`);
    return response.data;
  },

  // Disconnect a Facebook page
  // Backend: DELETE /api/meta/pages/:id/disconnect
  async disconnectPage(id: string): Promise<void> {
    await apiClient.delete(`/meta/pages/${id}/disconnect`);
  },

  // Get Instagram accounts linked to connected pages
  // Backend: GET /api/meta/instagram
  async getInstagramAccounts(): Promise<any[]> {
    const response = await apiClient.get('/meta/instagram');
    return response.data || [];
  },

  // Connect an Instagram account
  // Backend: POST /api/meta/instagram/:instagramId/connect
  async connectInstagram(instagramId: string, facebookPageId: string): Promise<any> {
    const response = await apiClient.post(`/meta/instagram/${instagramId}/connect`, {
      facebookPageId,
    });
    return response.data;
  },

  // Disconnect an Instagram account
  // Backend: DELETE /api/meta/instagram/:id/disconnect
  async disconnectInstagram(id: string): Promise<void> {
    await apiClient.delete(`/meta/instagram/${id}/disconnect`);
  },
};

export default metaService;
