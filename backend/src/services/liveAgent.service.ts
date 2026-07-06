import { db, redis, logger } from '../config';
import { agentService } from './agent.service';
import { geminiService } from './gemini.service';
import { metaService } from './meta.service';
import { tokenService } from './token.service';
import { scheduleAgentFlush, AgentFlushKey } from '../workers/agentBuffer.worker';

type Platform = 'facebook' | 'instagram';

interface MetaAttachment {
  type?: string; // image | audio | video | file
  payload?: { url?: string };
}

interface IncomingMessage {
  platform: Platform;
  assetId: string; // page id / instagram id that received it
  senderId: string; // customer
  senderName?: string;
  text?: string;
  attachments?: MetaAttachment[];
  messageId?: string;
}

interface PageRow {
  id: string;
  organization_id: string;
  page_name: string;
}

/**
 * Drives the in-app AI agent on live Facebook & Instagram conversations:
 * buffer → understand media → generate reply → send → persist.
 */
export class LiveAgentService {
  private bufferKey(platform: Platform, assetId: string, senderId: string): string {
    return `agentbuf:${platform}:${assetId}:${senderId}`;
  }

  /**
   * Queue an incoming message and (re)schedule the debounced flush.
   */
  async bufferIncoming(msg: IncomingMessage): Promise<void> {
    const key = this.bufferKey(msg.platform, msg.assetId, msg.senderId);
    try {
      await redis.rpush(key, JSON.stringify(msg));
      // Safety TTL so a never-flushed buffer can't leak forever.
      await redis.expire(key, 600);
    } catch (error) {
      logger.error('Failed to buffer incoming message', { key, error });
      return;
    }
    const flushKey: AgentFlushKey = {
      platform: msg.platform,
      assetId: msg.assetId,
      senderId: msg.senderId,
    };
    await scheduleAgentFlush(flushKey);
  }

  /**
   * Process a buffered burst: build one combined customer turn, reply, send, persist.
   */
  async flush(key: AgentFlushKey): Promise<void> {
    const { platform, assetId, senderId } = key;
    const listKey = this.bufferKey(platform, assetId, senderId);

    let raw: string[] = [];
    try {
      raw = await redis.lrange(listKey, 0, -1);
      await redis.del(listKey);
    } catch (error) {
      logger.error('Failed to read message buffer', { listKey, error });
      return;
    }
    if (raw.length === 0) return;

    const messages: IncomingMessage[] = raw
      .map((r) => {
        try {
          return JSON.parse(r) as IncomingMessage;
        } catch {
          return null;
        }
      })
      .filter((m): m is IncomingMessage => !!m);
    if (messages.length === 0) return;

    const page = await this.getPage(assetId, platform);
    if (!page) {
      logger.warn('No connected page/account for live agent flush', { assetId, platform });
      return;
    }

    const agent = await agentService.getActiveAgentForChannel(page.organization_id, platform);
    if (!agent) {
      logger.debug('No active agent for org/channel; skipping native reply', {
        organizationId: page.organization_id,
        platform,
      });
      return;
    }

    // Build a single combined customer message from the burst, turning
    // voice notes and images into text via Gemini 2.5 Flash.
    const combined = await this.composeCustomerMessage(messages);
    if (!combined.trim()) return;

    const senderName = messages.find((m) => m.senderName)?.senderName;
    const conversation = await this.findOrCreateConversation(
      page,
      platform,
      assetId,
      senderId,
      senderName
    );

    const history = await this.loadHistory(conversation.id);

    // Persist what the customer sent (the resolved combined text).
    await this.recordMessage(conversation.id, 'inbound', combined, messages);

    const startedAt = Date.now();
    let reply: string;
    try {
      reply = await agentService.generateReply(agent, combined, history);
    } catch (error) {
      logger.error('Live agent failed to generate reply', { agentId: agent.id, error });
      return;
    }
    if (!reply || !reply.trim()) return;

    const token = await this.getSendToken(platform, assetId, page.id);
    if (!token) {
      logger.error('No access token available to send reply', { assetId, platform });
      return;
    }

    const sent = await metaService.sendMessage(token, senderId, reply);
    if (!sent) {
      logger.error('Failed to deliver agent reply', { assetId, platform, senderId });
      return;
    }

    await this.recordMessage(
      conversation.id,
      'outbound',
      reply,
      [],
      Date.now() - startedAt
    );
    logger.info('Live agent replied', {
      organizationId: page.organization_id,
      platform,
      conversationId: conversation.id,
    });
  }

  /**
   * Turn a burst of raw messages (text + attachments) into one text turn.
   */
  private async composeCustomerMessage(messages: IncomingMessage[]): Promise<string> {
    const parts: string[] = [];
    for (const m of messages) {
      if (m.text && m.text.trim()) parts.push(m.text.trim());

      for (const att of m.attachments || []) {
        const url = att.payload?.url;
        if (!url) continue;
        const type = (att.type || '').toLowerCase();
        if (type === 'audio') {
          const text = await geminiService.transcribeAudio(url);
          parts.push(text ? `[voice message] ${text}` : '[voice message the agent could not transcribe]');
        } else if (type === 'image') {
          const desc = await geminiService.describeImage(url);
          parts.push(desc ? `[image] ${desc}` : '[the customer sent an image]');
        } else if (type) {
          parts.push(`[the customer sent a ${type} attachment]`);
        }
      }
    }
    return parts.join('\n');
  }

  private async getPage(assetId: string, platform: Platform): Promise<PageRow | null> {
    if (platform === 'facebook') {
      return db.queryOne<PageRow>(
        `SELECT id, organization_id, page_name
           FROM facebook_pages WHERE page_id = $1 AND is_active = true`,
        [assetId]
      );
    }
    return db.queryOne<PageRow>(
      `SELECT id, organization_id, username AS page_name
         FROM instagram_accounts WHERE instagram_id = $1 AND is_active = true`,
      [assetId]
    );
  }

  /**
   * Resolve the page access token used to call the Send API.
   * Instagram messaging is sent with the linked Facebook Page's token, which
   * we store on the instagram_accounts row.
   */
  private async getSendToken(
    platform: Platform,
    assetId: string,
    pageInternalId: string
  ): Promise<string | null> {
    if (platform === 'facebook') {
      return tokenService.getPageToken(assetId);
    }
    const row = await db.queryOne<{ access_token_encrypted: string }>(
      `SELECT access_token_encrypted FROM instagram_accounts WHERE id = $1`,
      [pageInternalId]
    );
    if (!row) return null;
    try {
      return tokenService.decryptToken(row.access_token_encrypted);
    } catch {
      return null;
    }
  }

  private async findOrCreateConversation(
    page: PageRow,
    platform: Platform,
    assetId: string,
    senderId: string,
    senderName?: string
  ): Promise<{ id: string }> {
    const platformConversationId = `${page.id}:${senderId}`;
    const existing = await db.queryOne<{ id: string; customer_name: string | null }>(
      `SELECT id, customer_name FROM conversations
        WHERE platform = $1 AND platform_conversation_id = $2`,
      [platform, platformConversationId]
    );
    if (existing) {
      await db.query(
        `UPDATE conversations
            SET last_message_at = NOW(), status = 'active'
          WHERE id = $1`,
        [existing.id]
      );
      // Backfill the real social-media name/picture on older conversations
      // created before profile fetching existed.
      if (!existing.customer_name) {
        await this.enrichCustomerProfile(existing.id, platform, assetId, page.id, senderId);
      }
      return existing;
    }

    const profile = await this.fetchSenderProfile(platform, assetId, page.id, senderId);

    const created = await db.queryOne<{ id: string }>(
      `INSERT INTO conversations
         (organization_id, platform, platform_conversation_id, page_id,
          customer_id, customer_name, customer_profile_pic)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        page.organization_id,
        platform,
        platformConversationId,
        page.id,
        senderId,
        profile?.name || senderName || null,
        profile?.profilePic || null,
      ]
    );
    if (!created) throw new Error('Failed to create conversation');
    return created;
  }

  /**
   * Look up the sender's public profile (real name + picture) with the page
   * token. Best-effort — inbox falls back to "Facebook/Instagram user".
   */
  private async fetchSenderProfile(
    platform: Platform,
    assetId: string,
    pageInternalId: string,
    senderId: string
  ): Promise<{ name: string | null; profilePic: string | null } | null> {
    const token = await this.getSendToken(platform, assetId, pageInternalId);
    if (!token) return null;
    return metaService.getSenderProfile(token, senderId, platform);
  }

  private async enrichCustomerProfile(
    conversationId: string,
    platform: Platform,
    assetId: string,
    pageInternalId: string,
    senderId: string
  ): Promise<void> {
    const profile = await this.fetchSenderProfile(platform, assetId, pageInternalId, senderId);
    if (!profile?.name && !profile?.profilePic) return;
    await db.query(
      `UPDATE conversations
          SET customer_name = COALESCE($2, customer_name),
              customer_profile_pic = COALESCE($3, customer_profile_pic)
        WHERE id = $1`,
      [conversationId, profile.name, profile.profilePic]
    );
  }

  private async loadHistory(
    conversationId: string
  ): Promise<{ role: 'user' | 'assistant'; content: string }[]> {
    const rows = await db.queryAll<{ direction: string; content: string }>(
      `SELECT direction, content FROM messages
        WHERE conversation_id = $1 AND content IS NOT NULL
        ORDER BY created_at DESC
        LIMIT 10`,
      [conversationId]
    );
    return rows
      .reverse()
      .map((r) => ({
        role: r.direction === 'inbound' ? ('user' as const) : ('assistant' as const),
        content: r.content,
      }));
  }

  private async recordMessage(
    conversationId: string,
    direction: 'inbound' | 'outbound',
    content: string,
    sourceMessages: IncomingMessage[],
    responseTimeMs?: number
  ): Promise<void> {
    const attachments = sourceMessages.flatMap((m) => m.attachments || []);
    const messageType =
      direction === 'inbound' && attachments.length > 0
        ? (attachments[0].type || 'text')
        : 'text';
    await db.query(
      `INSERT INTO messages
         (conversation_id, direction, message_type, content, attachments, handled_by, response_time_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        conversationId,
        direction,
        ['text', 'image', 'video', 'audio', 'file'].includes(messageType)
          ? messageType
          : 'text',
        content,
        JSON.stringify(attachments),
        direction === 'outbound' ? 'ai' : null,
        responseTimeMs ?? null,
      ]
    );
    await db.query(
      `UPDATE conversations
          SET message_count = message_count + 1, last_message_at = NOW()
        WHERE id = $1`,
      [conversationId]
    );
  }
}

export const liveAgentService = new LiveAgentService();
export default liveAgentService;
