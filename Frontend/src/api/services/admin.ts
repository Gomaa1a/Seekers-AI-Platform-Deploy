import { adminClient } from '../client';
import type {
  AdminDashboardStats,
  AdminClient,
  WorkflowRequest,
  N8nWorkflow,
  PlatformAnalytics,
  PaginatedResponse,
} from '../../types';

// ============================================
// Request Types
// ============================================

export interface ListClientsParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export interface ListWorkflowRequestsParams {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
  organizationId?: string;
}

export interface AssignWorkflowData {
  n8n_workflow_id: string;
  webhook_url: string;
  channels: {
    facebook_messenger?: boolean;
    instagram_dm?: boolean;
    facebook_comments?: boolean;
    instagram_comments?: boolean;
  };
}

export interface UpdateWorkflowRequestStatusData {
  status: string;
  notes?: string;
}

// ============================================
// Admin Service
// Aligned with backend admin.routes.ts
// Admin routes are at /api/admin/* and adminClient baseURL is /api/admin
// ============================================

export const adminService = {
  // ============================================
  // Dashboard
  // ============================================

  async getDashboardStats(): Promise<AdminDashboardStats> {
    const response = await adminClient.get<AdminDashboardStats>('/dashboard');
    // Backend returns { stats, recentNotifications }
    const data = response.data as any;
    return data?.stats || data;
  },

  // ============================================
  // Client/Organization Management
  // Backend uses /organizations, not /clients
  // ============================================

  async listClients(params: ListClientsParams = {}): Promise<PaginatedResponse<AdminClient>> {
    const response = await adminClient.get<PaginatedResponse<AdminClient>>('/organizations', {
      params: {
        page: params.page,
        limit: params.limit,
        status: params.status,
        search: params.search,
      },
    });
    return response.data;
  },

  async getClient(id: string): Promise<any> {
    const response = await adminClient.get(`/organizations/${id}`);
    return response.data;
  },

  async updateClient(id: string, data: Partial<any>): Promise<AdminClient> {
    const response = await adminClient.put<AdminClient>(`/organizations/${id}`, data);
    return response.data;
  },

  // Alias for pages
  async getAllClients(): Promise<{ data: any[] }> {
    const response = await this.listClients({ limit: 100 });
    return { data: response.data || [] };
  },

  // ============================================
  // Workflow Request Management
  // ============================================

  async listWorkflowRequests(params: ListWorkflowRequestsParams = {}): Promise<PaginatedResponse<WorkflowRequest>> {
    const response = await adminClient.get<PaginatedResponse<WorkflowRequest>>('/workflow-requests', {
      params: {
        page: params.page,
        limit: params.limit,
        status: params.status,
        priority: params.priority,
        organizationId: params.organizationId,
      },
    });
    return response.data;
  },

  async getWorkflowRequest(id: string): Promise<WorkflowRequest> {
    const response = await adminClient.get<WorkflowRequest>(`/workflow-requests/${id}`);
    return response.data;
  },

  async updateWorkflowRequestStatus(id: string, data: UpdateWorkflowRequestStatusData): Promise<WorkflowRequest> {
    const response = await adminClient.put<WorkflowRequest>(`/workflow-requests/${id}`, data);
    return response.data;
  },

  async assignWorkflow(requestId: string, data: AssignWorkflowData): Promise<WorkflowRequest> {
    const response = await adminClient.put<WorkflowRequest>(`/workflow-requests/${requestId}`, {
      ...data,
      status: 'in_progress',
    });
    return response.data;
  },

  // Alias for pages
  async getPendingWorkflowRequests(): Promise<{ data: any[] }> {
    const response = await this.listWorkflowRequests({ status: 'pending' });
    return { data: response.data || [] };
  },

  async getWorkflowRequestDetails(id: string): Promise<{ data: any }> {
    const response = await this.getWorkflowRequest(id);
    return { data: response };
  },

  async fulfillWorkflowRequest(id: string, data: AssignWorkflowData): Promise<{ data: any }> {
    const response = await this.assignWorkflow(id, data);
    return { data: response };
  },

  // ============================================
  // N8n Workflow Management
  // Backend uses /workflows, not /n8n-workflows
  // ============================================

  async listN8nWorkflows(): Promise<N8nWorkflow[]> {
    const response = await adminClient.get<N8nWorkflow[]>('/workflows');
    // May be wrapped in data property
    const data = response.data;
    return Array.isArray(data) ? data : (data as any)?.workflows || [];
  },

  async createN8nWorkflow(data: any): Promise<N8nWorkflow> {
    const response = await adminClient.post<N8nWorkflow>('/workflows', data);
    return response.data;
  },

  async updateN8nWorkflow(id: string, data: any): Promise<N8nWorkflow> {
    const response = await adminClient.put<N8nWorkflow>(`/workflows/${id}`, data);
    return response.data;
  },

  async deleteN8nWorkflow(id: string): Promise<void> {
    await adminClient.delete(`/workflows/${id}`);
  },

  // Alias for pages
  async getN8nWorkflows(): Promise<{ data: any[] }> {
    const response = await this.listN8nWorkflows();
    return { data: response || [] };
  },

  // ============================================
  // Platform Analytics
  // Uses the analytics routes under /api/analytics/admin/*
  // These are mounted on the analytics router, not admin router
  // ============================================

  async getPlatformAnalytics(): Promise<PlatformAnalytics> {
    // Admin analytics are at /api/analytics/admin/dashboard
    const { default: apiClient } = await import('../client');
    const response = await apiClient.get<PlatformAnalytics>('/analytics/admin/dashboard');
    return response.data;
  },

  // ============================================
  // Platform Settings
  // ============================================

  async getPlatformSettings(): Promise<any> {
    const response = await adminClient.get('/settings');
    return response.data || {};
  },

  async updatePlatformSettings(settings: any): Promise<void> {
    await adminClient.put('/settings', settings);
  },

  async getPlatformConfig(): Promise<{ data: any }> {
    const response = await this.getPlatformSettings();
    return { data: response };
  },

  async updatePlatformConfig(config: any): Promise<void> {
    await this.updatePlatformSettings(config);
  },

  async setMaintenanceMode(enabled: boolean): Promise<void> {
    await this.updatePlatformSettings({ maintenance_mode: enabled });
  },
};

export default adminService;
