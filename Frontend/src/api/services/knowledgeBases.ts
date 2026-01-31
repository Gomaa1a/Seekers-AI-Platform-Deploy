import apiClient from '../client';
import type {
  KnowledgeBase,
  CreateKnowledgeBaseRequest,
  UpdateKnowledgeBaseRequest,
} from '../../types';

// ============================================
// Request Types
// ============================================

export interface ListKnowledgeBasesParams {
  type?: KnowledgeBase['type'];
}

export interface AddDocumentData {
  title: string;
  content: string;
  source_type?: 'manual' | 'file' | 'url';
  source_url?: string;
}

// ============================================
// Knowledge Base Service
// Aligned with backend routes in knowledgeBase.routes.ts
// ============================================

export const knowledgeBaseService = {
  // Get all knowledge bases for the organization
  // Backend: GET /api/knowledge-bases?type=chatbot|comments
  async getAll(type?: string): Promise<KnowledgeBase[]> {
    const response = await apiClient.get<KnowledgeBase[]>('/knowledge-bases', {
      params: type ? { type } : undefined,
    });
    return response.data || [];
  },

  // Alias for paginated list (returns same data wrapped)
  async list(params: ListKnowledgeBasesParams = {}): Promise<{ data: KnowledgeBase[] }> {
    const data = await this.getAll(params.type);
    return { data };
  },

  // Get single knowledge base
  // Backend: GET /api/knowledge-bases/:id
  async get(id: string): Promise<KnowledgeBase> {
    const response = await apiClient.get<KnowledgeBase>(`/knowledge-bases/${id}`);
    return response.data;
  },

  // Create knowledge base
  // Backend: POST /api/knowledge-bases
  async create(data: CreateKnowledgeBaseRequest): Promise<KnowledgeBase> {
    const response = await apiClient.post<KnowledgeBase>('/knowledge-bases', data);
    return response.data;
  },

  // Update knowledge base
  // Backend: PUT /api/knowledge-bases/:id
  async update(id: string, data: UpdateKnowledgeBaseRequest): Promise<KnowledgeBase> {
    const response = await apiClient.put<KnowledgeBase>(`/knowledge-bases/${id}`, data);
    return response.data;
  },

  // Delete knowledge base
  // Backend: DELETE /api/knowledge-bases/:id
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/knowledge-bases/${id}`);
  },

  // Toggle knowledge base active status
  // Backend: PUT /api/knowledge-bases/:id/toggle
  async toggle(id: string, isActive: boolean): Promise<KnowledgeBase> {
    const response = await apiClient.put<KnowledgeBase>(`/knowledge-bases/${id}/toggle`, { isActive });
    return response.data;
  },

  // Get version history
  // Backend: GET /api/knowledge-bases/:id/history
  async getHistory(id: string, limit: number = 10, offset: number = 0): Promise<any[]> {
    const response = await apiClient.get(`/knowledge-bases/${id}/history`, {
      params: { limit, offset },
    });
    return response.data || [];
  },

  // Restore a specific version
  // Backend: POST /api/knowledge-bases/:id/restore/:versionId
  async restoreVersion(id: string, versionId: string): Promise<KnowledgeBase> {
    const response = await apiClient.post<KnowledgeBase>(`/knowledge-bases/${id}/restore/${versionId}`);
    return response.data;
  },
};

export default knowledgeBaseService;
