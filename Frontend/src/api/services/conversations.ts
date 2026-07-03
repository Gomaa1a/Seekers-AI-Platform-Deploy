import apiClient from '../client';

// ============================================
// Conversations Service
// Aligned with backend routes in conversation.routes.ts
// ============================================

export interface ConversationSummary {
  id: string;
  platform: 'facebook' | 'instagram';
  customer_id: string;
  customer_name: string | null;
  customer_profile_pic: string | null;
  status: string;
  message_count: number;
  last_message_at: string;
  started_at: string;
  last_message: string | null;
  last_message_direction: 'inbound' | 'outbound' | null;
}

export interface ConversationMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  message_type: string;
  content: string | null;
  attachments: unknown[];
  handled_by: 'ai' | 'human' | null;
  created_at: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export const conversationsService = {
  // Backend: GET /api/conversations
  async list(platform?: string): Promise<ApiEnvelope<ConversationSummary[]>> {
    const response = await apiClient.get('/conversations', {
      params: platform ? { platform } : {},
    });
    return response.data;
  },

  // Backend: GET /api/conversations/:id/messages
  async messages(conversationId: string): Promise<ApiEnvelope<ConversationMessage[]>> {
    const response = await apiClient.get(`/conversations/${conversationId}/messages`);
    return response.data;
  },

  // Backend: POST /api/conversations/:id/messages  (human agent reply)
  async send(conversationId: string, text: string): Promise<ApiEnvelope<ConversationMessage>> {
    const response = await apiClient.post(`/conversations/${conversationId}/messages`, { text });
    return response.data;
  },
};

export default conversationsService;
