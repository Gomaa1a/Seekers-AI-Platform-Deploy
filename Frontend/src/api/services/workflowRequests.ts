import apiClient from '../client';
import type {
  WorkflowRequest,
  CreateWorkflowRequestRequest,
  Addon,
} from '../../types';

// ============================================
// Request Types
// ============================================

export interface ListWorkflowRequestsParams {
  status?: WorkflowRequest['status'];
  priority?: WorkflowRequest['priority'];
}

export interface UpdateWorkflowRequestData {
  title?: string;
  description?: string;
  priority?: WorkflowRequest['priority'];
}

export interface SendMessageData {
  message: string;
}

// ============================================
// Workflow Requests Service
// Aligned with backend routes in workflowRequest.routes.ts
// ============================================

export const workflowRequestService = {
  // Get all workflow requests for the organization
  // Backend: GET /api/workflow-requests
  async list(): Promise<{ data: WorkflowRequest[] }> {
    const response = await apiClient.get<WorkflowRequest[]>('/workflow-requests');
    return { data: response.data || [] };
  },

  // Get single workflow request
  // Backend: GET /api/workflow-requests/:id
  async get(id: string): Promise<WorkflowRequest> {
    const response = await apiClient.get<WorkflowRequest>(`/workflow-requests/${id}`);
    return response.data;
  },

  // Create workflow request
  // Backend: POST /api/workflow-requests
  async create(data: CreateWorkflowRequestRequest): Promise<WorkflowRequest> {
    const response = await apiClient.post<WorkflowRequest>('/workflow-requests', data);
    return response.data;
  },

  // Get all add-on requests
  // Backend: GET /api/workflow-requests/addons/list
  async getAddonRequests(): Promise<any[]> {
    const response = await apiClient.get('/workflow-requests/addons/list');
    return response.data || [];
  },

  // Get specific add-on request
  // Backend: GET /api/workflow-requests/addons/:id
  async getAddonRequest(id: string): Promise<any> {
    const response = await apiClient.get(`/workflow-requests/addons/${id}`);
    return response.data;
  },

  // Create add-on request
  // Backend: POST /api/workflow-requests/addons
  async createAddonRequest(data: any): Promise<any> {
    const response = await apiClient.post('/workflow-requests/addons', data);
    return response.data;
  },

  // Get available add-ons
  // Backend: GET /api/workflow-requests/addons/available
  async getAvailableAddons(): Promise<Addon[]> {
    const response = await apiClient.get<Addon[]>('/workflow-requests/addons/available');
    return response.data || [];
  },
};

export default workflowRequestService;
