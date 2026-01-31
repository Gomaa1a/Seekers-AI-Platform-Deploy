import apiClient from '../client';
import type {
  Organization,
  OrganizationSettings,
} from '../../types';

// ============================================
// Request Types
// ============================================

export interface UpdateOrganizationData {
  name?: string;
  industry?: string;
  website?: string;
  logo_url?: string;
  settings?: Partial<OrganizationSettings>;
}

export interface InviteTeamMemberData {
  email: string;
  name: string;
  role: 'admin' | 'editor' | 'viewer';
}

// ============================================
// Organization Service
// Aligned with backend routes in organization.routes.ts
// ============================================

export const organizationService = {
  // Get current organization
  // Backend: GET /api/organization
  async getOrganization(): Promise<Organization> {
    const response = await apiClient.get<Organization>('/organization');
    return response.data;
  },

  // Update organization
  // Backend: PUT /api/organization
  async updateOrganization(data: UpdateOrganizationData): Promise<Organization> {
    const response = await apiClient.put<Organization>('/organization', data);
    return response.data;
  },

  // Get connected pages (Facebook & Instagram)
  // Backend: GET /api/organization/pages
  async getConnectedPages(): Promise<{ facebook: any[]; instagram: any[] }> {
    const response = await apiClient.get('/organization/pages');
    return response.data;
  },

  // Toggle Facebook page active status
  // Backend: PUT /api/organization/pages/facebook/:id/toggle
  async toggleFacebookPage(id: string, isActive: boolean): Promise<any> {
    const response = await apiClient.put(`/organization/pages/facebook/${id}/toggle`, { isActive });
    return response.data;
  },

  // Get all workflows for the organization
  // Backend: GET /api/organization/workflows
  async getWorkflows(): Promise<any[]> {
    const response = await apiClient.get('/organization/workflows');
    return response.data;
  },

  // Get onboarding status
  // Backend: GET /api/organization/onboarding
  async getOnboarding(): Promise<{
    steps: any[];
    progress: number;
    completedSteps: number;
    totalSteps: number;
    isComplete: boolean;
  }> {
    const response = await apiClient.get('/organization/onboarding');
    return response.data;
  },

  // Get organization settings
  // Backend: GET /api/organization (returns settings in org object)
  async getSettings(): Promise<OrganizationSettings> {
    const response = await apiClient.get<Organization>('/organization');
    return response.data.settings || { language: 'en', notifications: true };
  },

  // Update organization settings
  // Backend: PUT /api/organization
  async updateSettings(settings: Partial<OrganizationSettings>): Promise<OrganizationSettings> {
    const response = await apiClient.put<Organization>('/organization', { settings });
    return response.data.settings || { language: 'en', notifications: true };
  },
};

export default organizationService;
