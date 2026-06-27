import { db, logger } from '../config';

// ============================================
// Types
// ============================================

export type AgentTone =
  | 'friendly'
  | 'professional'
  | 'casual'
  | 'formal'
  | 'empathetic';
export type AgentChannel = 'web' | 'facebook' | 'instagram' | 'whatsapp';
export type AgentStatus = 'draft' | 'active' | 'paused';

export interface AiAgent {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  business_type: string | null;
  tone: AgentTone;
  greeting: string | null;
  language: string;
  channel: AgentChannel;
  channel_connected: boolean;
  knowledge: string | null;
  knowledge_base_id: string | null;
  status: AgentStatus;
  emotion_detection: boolean;
  lead_extraction: boolean;
  human_handoff: boolean;
  message_count: number;
  activated_at: Date | null;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateAgentInput {
  name: string;
  description?: string;
  businessType?: string;
  tone?: AgentTone;
  greeting?: string;
  language?: string;
  channel?: AgentChannel;
  knowledge?: string;
  knowledgeBaseId?: string | null;
  emotionDetection?: boolean;
  leadExtraction?: boolean;
  humanHandoff?: boolean;
}

export type UpdateAgentInput = Partial<CreateAgentInput> & {
  channelConnected?: boolean;
};

const TONES: AgentTone[] = ['friendly', 'professional', 'casual', 'formal', 'empathetic'];
const CHANNELS: AgentChannel[] = ['web', 'facebook', 'instagram', 'whatsapp'];

export class AgentService {
  /**
   * List all agents for an organization (newest first)
   */
  async getAll(organizationId: string): Promise<AiAgent[]> {
    return db.queryAll<AiAgent>(
      `SELECT * FROM ai_agents WHERE organization_id = $1 ORDER BY created_at DESC`,
      [organizationId]
    );
  }

  /**
   * Get a single agent scoped to the organization
   */
  async getById(id: string, organizationId: string): Promise<AiAgent | null> {
    return db.queryOne<AiAgent>(
      `SELECT * FROM ai_agents WHERE id = $1 AND organization_id = $2`,
      [id, organizationId]
    );
  }

  /**
   * Create a new agent (starts as a draft)
   */
  async create(
    organizationId: string,
    userId: string,
    input: CreateAgentInput
  ): Promise<AiAgent> {
    if (!input.name || !input.name.trim()) {
      throw new Error('Agent name is required');
    }
    if (input.tone && !TONES.includes(input.tone)) {
      throw new Error('Invalid tone');
    }
    if (input.channel && !CHANNELS.includes(input.channel)) {
      throw new Error('Invalid channel');
    }

    const agent = await db.queryOne<AiAgent>(
      `INSERT INTO ai_agents
         (organization_id, name, description, business_type, tone, greeting, language,
          channel, knowledge, knowledge_base_id, emotion_detection, lead_extraction, human_handoff, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        organizationId,
        input.name.trim(),
        input.description || null,
        input.businessType || null,
        input.tone || 'friendly',
        input.greeting || null,
        input.language || 'auto',
        input.channel || 'web',
        input.knowledge || null,
        input.knowledgeBaseId || null,
        input.emotionDetection ?? true,
        input.leadExtraction ?? true,
        input.humanHandoff ?? true,
        userId,
      ]
    );

    if (!agent) {
      throw new Error('Failed to create agent');
    }

    logger.info('AI agent created', { id: agent.id, organizationId });
    return agent;
  }

  /**
   * Partial update of an agent
   */
  async update(
    id: string,
    organizationId: string,
    input: UpdateAgentInput
  ): Promise<AiAgent> {
    const current = await this.getById(id, organizationId);
    if (!current) {
      throw new Error('Agent not found');
    }

    const fieldMap: Record<string, any> = {
      name: input.name,
      description: input.description,
      business_type: input.businessType,
      tone: input.tone,
      greeting: input.greeting,
      language: input.language,
      channel: input.channel,
      knowledge: input.knowledge,
      knowledge_base_id: input.knowledgeBaseId,
      channel_connected: input.channelConnected,
      emotion_detection: input.emotionDetection,
      lead_extraction: input.leadExtraction,
      human_handoff: input.humanHandoff,
    };

    const updates: string[] = [];
    const values: any[] = [];
    let i = 1;
    for (const [column, value] of Object.entries(fieldMap)) {
      if (value !== undefined) {
        updates.push(`${column} = $${i++}`);
        values.push(value);
      }
    }

    if (updates.length === 0) {
      return current;
    }

    values.push(id, organizationId);
    const updated = await db.queryOne<AiAgent>(
      `UPDATE ai_agents SET ${updates.join(', ')}
       WHERE id = $${i++} AND organization_id = $${i}
       RETURNING *`,
      values
    );

    if (!updated) {
      throw new Error('Failed to update agent');
    }
    return updated;
  }

  /**
   * Flip an agent's lifecycle status (draft/active/paused).
   * Going live requires a connected channel.
   */
  async setStatus(
    id: string,
    organizationId: string,
    status: AgentStatus
  ): Promise<AiAgent> {
    const current = await this.getById(id, organizationId);
    if (!current) {
      throw new Error('Agent not found');
    }

    if (status === 'active' && !current.channel_connected) {
      throw new Error('Connect a channel before activating this agent');
    }

    const activatedAt =
      status === 'active' && !current.activated_at ? new Date() : current.activated_at;

    const updated = await db.queryOne<AiAgent>(
      `UPDATE ai_agents SET status = $1, activated_at = $2
       WHERE id = $3 AND organization_id = $4
       RETURNING *`,
      [status, activatedAt, id, organizationId]
    );

    if (!updated) {
      throw new Error('Failed to update agent status');
    }

    logger.info('AI agent status changed', { id, organizationId, status });
    return updated;
  }

  /**
   * Delete an agent
   */
  async delete(id: string, organizationId: string): Promise<void> {
    const result = await db.query(
      `DELETE FROM ai_agents WHERE id = $1 AND organization_id = $2`,
      [id, organizationId]
    );
    if (result.rowCount === 0) {
      throw new Error('Agent not found');
    }
  }

  /**
   * Build the agent's system prompt from its persona + knowledge.
   */
  private buildSystemPrompt(agent: AiAgent): string {
    const lines = [
      `You are "${agent.name}", an AI customer-support agent${
        agent.business_type ? ` for ${agent.business_type}` : ''
      }.`,
      `Tone of voice: ${agent.tone}. Reply in the same language the customer uses (Arabic or English).`,
      'Keep replies short, warm, and helpful.',
    ];
    if (agent.greeting) lines.push(`Your greeting style: "${agent.greeting}"`);
    if (agent.human_handoff) {
      lines.push(
        'If you cannot answer from the knowledge below, politely offer to connect the customer to a human team member.'
      );
    }
    if (agent.lead_extraction) {
      lines.push(
        'If the customer shows buying intent, naturally ask for their name and contact so the sales team can follow up.'
      );
    }
    lines.push(
      '',
      'Answer ONLY using the knowledge below. Do not invent facts that are not here.',
      '----- KNOWLEDGE BASE -----',
      agent.knowledge?.trim() || '(No knowledge has been added yet.)'
    );
    return lines.join('\n');
  }

  /**
   * Offline preview reply — used when no LLM key is configured so the
   * "test before connecting" flow always works in the demo.
   */
  private mockReply(agent: AiAgent, message: string): string {
    const kb = agent.knowledge?.trim() || '';
    if (kb) {
      const sentences = kb
        .split(/[\n.]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const words = message
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length > 3);
      const hit = sentences.find((s) =>
        words.some((w) => s.toLowerCase().includes(w))
      );
      if (hit) return `${hit}.`;
      return `Thanks for reaching out! I don't have that exact detail yet — let me connect you with a team member who can help.`;
    }
    return `Hi! I'm ${agent.name}. I'm still being trained — add some knowledge and I'll be able to answer questions like this.`;
  }

  /**
   * Generate a test reply for the in-app playground.
   * Uses Claude when ANTHROPIC_API_KEY is set, otherwise a knowledge-based mock.
   */
  async generateTestReply(
    id: string,
    organizationId: string,
    message: string,
    history: { role: 'user' | 'assistant'; content: string }[] = []
  ): Promise<{ reply: string; mode: 'live' | 'preview' }> {
    const agent = await this.getById(id, organizationId);
    if (!agent) {
      throw new Error('Agent not found');
    }
    if (!message || !message.trim()) {
      throw new Error('Message is required');
    }

    let reply: string;
    let mode: 'live' | 'preview';

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      try {
        const Anthropic = (await import('@anthropic-ai/sdk')).default;
        const client = new Anthropic({ apiKey });
        const response = await client.messages.create({
          model: process.env.ANTHROPIC_MODEL || 'claude-opus-4-8',
          max_tokens: 1024,
          system: this.buildSystemPrompt(agent),
          messages: [
            ...history.map((m) => ({ role: m.role, content: m.content })),
            { role: 'user' as const, content: message },
          ],
        });
        reply = response.content
          .filter((b: any) => b.type === 'text')
          .map((b: any) => b.text)
          .join('\n')
          .trim();
        if (!reply) reply = this.mockReply(agent, message);
        mode = 'live';
      } catch (error) {
        logger.error('Agent test (Claude) failed, falling back to preview', {
          error,
        });
        reply = this.mockReply(agent, message);
        mode = 'preview';
      }
    } else {
      reply = this.mockReply(agent, message);
      mode = 'preview';
    }

    // Count the interaction toward the agent's stats
    await db.query(
      `UPDATE ai_agents SET message_count = message_count + 1
       WHERE id = $1 AND organization_id = $2`,
      [id, organizationId]
    );

    return { reply, mode };
  }

  /**
   * Aggregate stats for dashboard cards
   */
  async getStats(organizationId: string): Promise<{
    total: number;
    active: number;
    draft: number;
    totalMessages: number;
  }> {
    const row = await db.queryOne<{
      total: string;
      active: string;
      draft: string;
      total_messages: string;
    }>(
      `SELECT
         COUNT(*)                                          AS total,
         COUNT(*) FILTER (WHERE status = 'active')         AS active,
         COUNT(*) FILTER (WHERE status = 'draft')          AS draft,
         COALESCE(SUM(message_count), 0)                   AS total_messages
       FROM ai_agents WHERE organization_id = $1`,
      [organizationId]
    );

    return {
      total: parseInt(row?.total || '0', 10),
      active: parseInt(row?.active || '0', 10),
      draft: parseInt(row?.draft || '0', 10),
      totalMessages: parseInt(row?.total_messages || '0', 10),
    };
  }
}

export const agentService = new AgentService();
export default agentService;
