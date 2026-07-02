import apiClient from '../client';

// ============================================
// Types (aligned with backend ai_agents)
// ============================================

export type AgentTone =
  | 'friendly'
  | 'professional'
  | 'casual'
  | 'formal'
  | 'empathetic';
export type AgentChannel = 'web' | 'facebook' | 'instagram' | 'whatsapp';
export type AgentStatus = 'draft' | 'active' | 'paused';
// 'platform' = Seekers' shared AI. Anything else = the client's own LLM key.
export type LlmProvider = 'platform' | 'anthropic' | 'openai' | 'gemini' | 'custom';

export interface AiAgent {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  business_type: string | null;
  tone: AgentTone;
  greeting: string | null;
  system_prompt: string | null;
  language: string;
  channel: AgentChannel;
  channels: AgentChannel[];
  channel_connected: boolean;
  knowledge: string | null;
  knowledge_base_id: string | null;
  status: AgentStatus;
  emotion_detection: boolean;
  lead_extraction: boolean;
  human_handoff: boolean;
  message_count: number;
  activated_at: string | null;
  created_at: string;
  updated_at: string;
  // BYO-LLM — the API key itself is write-only and never returned
  llm_provider: LlmProvider;
  llm_model: string | null;
  llm_base_url: string | null;
  llm_key_set: boolean;
}

export interface CreateAgentData {
  name: string;
  description?: string;
  businessType?: string;
  tone?: AgentTone;
  greeting?: string;
  systemPrompt?: string;
  language?: string;
  channel?: AgentChannel;
  channels?: AgentChannel[];
  knowledge?: string;
  knowledgeBaseId?: string | null;
  emotionDetection?: boolean;
  leadExtraction?: boolean;
  humanHandoff?: boolean;
  // BYO-LLM: pass llmApiKey to set the org's own key, null to clear it
  llmProvider?: LlmProvider;
  llmModel?: string | null;
  llmApiKey?: string | null;
  llmBaseUrl?: string | null;
}

export type UpdateAgentData = Partial<CreateAgentData> & {
  channelConnected?: boolean;
};

export interface AgentStats {
  total: number;
  active: number;
  draft: number;
  totalMessages: number;
}

// ============================================
// Agent Service
// Aligned with backend routes in agent.routes.ts
// ============================================

export const agentService = {
  // GET /api/agents
  async list(): Promise<AiAgent[]> {
    const response = await apiClient.get<AiAgent[]>('/agents');
    return response.data || [];
  },

  // GET /api/agents/stats
  async stats(): Promise<AgentStats> {
    const response = await apiClient.get<AgentStats>('/agents/stats');
    return response.data;
  },

  // GET /api/agents/:id
  async get(id: string): Promise<AiAgent> {
    const response = await apiClient.get<AiAgent>(`/agents/${id}`);
    return response.data;
  },

  // POST /api/agents
  async create(data: CreateAgentData): Promise<AiAgent> {
    const response = await apiClient.post<AiAgent>('/agents', data);
    return response.data;
  },

  // PUT /api/agents/:id
  async update(id: string, data: UpdateAgentData): Promise<AiAgent> {
    const response = await apiClient.put<AiAgent>(`/agents/${id}`, data);
    return response.data;
  },

  // POST /api/agents/:id/test  — chat with the agent before connecting a channel
  async test(
    id: string,
    message: string,
    history: { role: 'user' | 'assistant'; content: string }[] = []
  ): Promise<{ reply: string; mode: 'live' | 'preview' }> {
    const response = await apiClient.post<{ reply: string; mode: 'live' | 'preview' }>(
      `/agents/${id}/test`,
      { message, history }
    );
    return response.data;
  },

  // POST /api/agents/:id/connect
  async connectChannel(id: string, channel: AgentChannel): Promise<AiAgent> {
    const response = await apiClient.post<AiAgent>(`/agents/${id}/connect`, { channel });
    return response.data;
  },

  // POST /api/agents/:id/connect — connect one or more channels at once
  async connectChannels(id: string, channels: AgentChannel[]): Promise<AiAgent> {
    const response = await apiClient.post<AiAgent>(`/agents/${id}/connect`, {
      channel: channels[0],
      channels,
    });
    return response.data;
  },

  // POST /api/agents/:id/persona — AI-generate & save the agent's persona
  async generatePersona(id: string): Promise<AiAgent> {
    const response = await apiClient.post<AiAgent>(`/agents/${id}/persona`);
    return response.data;
  },

  // POST /api/agents/:id/activate
  async activate(id: string): Promise<AiAgent> {
    const response = await apiClient.post<AiAgent>(`/agents/${id}/activate`);
    return response.data;
  },

  // POST /api/agents/:id/pause
  async pause(id: string): Promise<AiAgent> {
    const response = await apiClient.post<AiAgent>(`/agents/${id}/pause`);
    return response.data;
  },

  // DELETE /api/agents/:id
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/agents/${id}`);
  },
};

export default agentService;
