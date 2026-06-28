import { db, logger, config } from '../config';
import { geminiService } from './gemini.service';

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
  systemPrompt?: string;
  language?: string;
  channel?: AgentChannel;
  channels?: AgentChannel[];
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

/**
 * Validate + de-duplicate a list of channels. Throws on an unknown channel.
 */
function normalizeChannels(channels?: AgentChannel[]): AgentChannel[] {
  if (!channels || channels.length === 0) return [];
  const seen = new Set<AgentChannel>();
  for (const c of channels) {
    if (!CHANNELS.includes(c)) throw new Error(`Invalid channel: ${c}`);
    seen.add(c);
  }
  return Array.from(seen);
}

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
    const channels = normalizeChannels(input.channels);
    // Primary channel: explicit `channel`, else first of `channels`, else web.
    const primaryChannel = input.channel || channels[0] || 'web';

    const agent = await db.queryOne<AiAgent>(
      `INSERT INTO ai_agents
         (organization_id, name, description, business_type, tone, greeting, language,
          channel, channels, knowledge, knowledge_base_id, emotion_detection, lead_extraction, human_handoff, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        organizationId,
        input.name.trim(),
        input.description || null,
        input.businessType || null,
        input.tone || 'friendly',
        input.greeting || null,
        input.language || 'auto',
        primaryChannel,
        channels,
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

    const channels =
      input.channels !== undefined ? normalizeChannels(input.channels) : undefined;
    // Keep the primary `channel` consistent with the selected channels.
    const primaryChannel =
      input.channel ?? (channels && channels.length > 0 ? channels[0] : undefined);

    const fieldMap: Record<string, any> = {
      name: input.name,
      description: input.description,
      business_type: input.businessType,
      tone: input.tone,
      greeting: input.greeting,
      system_prompt: input.systemPrompt,
      language: input.language,
      channel: primaryChannel,
      channels: channels,
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
   * Resolve everything the agent "knows": its inline knowledge text PLUS the
   * content of a linked knowledge base (if any). This is what makes attaching
   * a Knowledge Base actually change the agent's answers.
   */
  private async resolveKnowledge(agent: AiAgent): Promise<string> {
    const parts: string[] = [];
    if (agent.knowledge && agent.knowledge.trim()) {
      parts.push(agent.knowledge.trim());
    }
    if (agent.knowledge_base_id) {
      try {
        const kb = await db.queryOne<{ name: string; content: string }>(
          `SELECT name, content FROM knowledge_bases
            WHERE id = $1 AND organization_id = $2 AND is_active = true`,
          [agent.knowledge_base_id, agent.organization_id]
        );
        if (kb?.content && kb.content.trim()) {
          parts.push(`# ${kb.name}\n${kb.content.trim()}`);
        }
      } catch (error) {
        logger.error('Failed to load linked knowledge base for agent', {
          agentId: agent.id,
          knowledgeBaseId: agent.knowledge_base_id,
          error,
        });
      }
    }
    return parts.join('\n\n');
  }

  /**
   * Build the agent's system prompt from its persona + resolved knowledge.
   */
  private buildSystemPrompt(agent: AiAgent, knowledge: string): string {
    const lines: string[] = [];

    // Persona: use the AI-generated/edited system prompt when present,
    // otherwise fall back to a templated persona from the agent's fields.
    if (agent.system_prompt && agent.system_prompt.trim()) {
      lines.push(agent.system_prompt.trim());
      lines.push(
        'Always reply in the same language the customer uses (Egyptian Arabic or English), matching their dialect.'
      );
    } else {
      lines.push(
        `You are "${agent.name}", an AI customer-support agent${
          agent.business_type ? ` for ${agent.business_type}` : ''
        }.`,
        `Tone of voice: ${agent.tone}. Always reply in the same language the customer uses (Egyptian Arabic or English), matching their dialect.`,
        'Keep replies short, warm, professional, and helpful — like a real team member on chat.'
      );
    }

    lines.push(
      // Guardrails — always enforced, even with a custom persona.
      'Never invent facts, prices, discounts, offers, or availability. State ONLY what appears in the knowledge below.',
      'If a customer asks for a price/service that is not offered, or requests an unrealistic discount or a token price (e.g. paying 1 EGP), politely decline and explain you follow the official approved pricing — then offer to help them properly.',
      'Do not make promises, medical/legal claims, or commitments that are not supported by the knowledge below.'
    );
    if (agent.greeting) lines.push(`Your greeting style: "${agent.greeting}"`);
    if (agent.human_handoff) {
      lines.push(
        'If you cannot answer from the knowledge below, do not guess — politely offer to connect the customer to a human team member.'
      );
    }
    if (agent.lead_extraction) {
      lines.push(
        'When the customer shows interest or asks to proceed, naturally collect their full name, mobile number, and preferred branch/location so the team can follow up — ask warmly, one detail at a time.'
      );
    }
    lines.push(
      '',
      'Answer ONLY using the knowledge below. If the answer is not here, say you will check with the team rather than inventing it.',
      '----- KNOWLEDGE BASE -----',
      knowledge.trim() || '(No knowledge has been added yet.)'
    );
    return lines.join('\n');
  }

  /**
   * Offline preview reply — used when no LLM key is configured so the
   * "test before connecting" flow always works in the demo.
   */
  private mockReply(agent: AiAgent, message: string, knowledge: string): string {
    const kb = knowledge.trim();
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
   * Core reply generation shared by the in-app playground and the live
   * channels. Uses Claude (cheap-but-good: Haiku 4.5 by default) when an
   * ANTHROPIC_API_KEY is configured, otherwise a knowledge-based mock.
   */
  private async produceReply(
    agent: AiAgent,
    message: string,
    history: { role: 'user' | 'assistant'; content: string }[]
  ): Promise<{ reply: string; mode: 'live' | 'preview' }> {
    // Merge inline knowledge + linked knowledge base so the agent answers
    // from everything it has been given.
    const knowledge = await this.resolveKnowledge(agent);
    const systemPrompt = this.buildSystemPrompt(agent, knowledge);

    // 1) Claude (cheap-but-good) when an Anthropic key is configured.
    if (config.ai.anthropicApiKey) {
      try {
        const Anthropic = (await import('@anthropic-ai/sdk')).default;
        const client = new Anthropic({ apiKey: config.ai.anthropicApiKey });
        const response = await client.messages.create({
          model: config.ai.anthropicModel,
          max_tokens: 1024,
          system: systemPrompt,
          messages: [
            ...history.map((m) => ({ role: m.role, content: m.content })),
            { role: 'user' as const, content: message },
          ],
        });
        const reply = response.content
          .filter((b: any) => b.type === 'text')
          .map((b: any) => b.text)
          .join('\n')
          .trim();
        if (reply) return { reply, mode: 'live' };
      } catch (error) {
        logger.error('Agent reply (Claude) failed, trying Gemini/preview', {
          agentId: agent.id,
          error,
        });
      }
    }

    // 2) Gemini reply engine (works with just a GEMINI_API_KEY).
    if (geminiService.isConfigured) {
      const reply = await geminiService.generateChatReply(systemPrompt, history, message);
      if (reply) return { reply, mode: 'live' };
    }

    // 3) Offline keyword fallback so the demo always answers.
    return { reply: this.mockReply(agent, message, knowledge), mode: 'preview' };
  }

  /**
   * Generate a test reply for the in-app playground.
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

    const result = await this.produceReply(agent, message, history);

    // Count the interaction toward the agent's stats
    await db.query(
      `UPDATE ai_agents SET message_count = message_count + 1
       WHERE id = $1 AND organization_id = $2`,
      [id, organizationId]
    );

    return result;
  }

  /**
   * Find the active agent that should answer on a given channel for an org.
   * Prefers an agent that lists the channel in its `channels` array (or matches
   * the legacy primary `channel`); falls back to any active agent.
   */
  async getActiveAgentForChannel(
    organizationId: string,
    channel: AgentChannel
  ): Promise<AiAgent | null> {
    return db.queryOne<AiAgent>(
      `SELECT * FROM ai_agents
        WHERE organization_id = $1
          AND status = 'active'
          AND ($2 = ANY(channels) OR channel = $2 OR channels = '{}')
        ORDER BY ($2 = ANY(channels) OR channel = $2) DESC, updated_at DESC
        LIMIT 1`,
      [organizationId, channel]
    );
  }

  /**
   * Generate a live reply for a real customer message and count it.
   * Returns just the reply text (the live path always sends something).
   */
  async generateReply(
    agent: AiAgent,
    message: string,
    history: { role: 'user' | 'assistant'; content: string }[] = []
  ): Promise<string> {
    const { reply } = await this.produceReply(agent, message, history);
    await db.query(
      `UPDATE ai_agents SET message_count = message_count + 1 WHERE id = $1`,
      [agent.id]
    );
    return reply;
  }

  /**
   * Generate a persona (system prompt) for the agent from its current details
   * and save it. Uses Gemini; throws if no AI is configured.
   */
  async generatePersona(id: string, organizationId: string): Promise<AiAgent> {
    const agent = await this.getById(id, organizationId);
    if (!agent) {
      throw new Error('Agent not found');
    }
    const persona = await geminiService.generatePersona({
      name: agent.name,
      businessType: agent.business_type,
      tone: agent.tone,
      greeting: agent.greeting,
      knowledge: agent.knowledge,
    });
    if (!persona) {
      throw new Error('Could not generate a persona right now. Check the AI configuration.');
    }
    return this.update(id, organizationId, { systemPrompt: persona });
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
