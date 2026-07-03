import { Router } from 'express';
import { db, logger } from '../config';
import { metaService } from '../services/meta.service';
import { tokenService } from '../services/token.service';
import { authenticate } from '../middleware';
import { asyncHandler } from '../utils/helpers';

const router = Router();

/**
 * @route   GET /api/conversations
 * @desc    List the organization's conversations (latest first) with the
 *          last message preview for the inbox sidebar.
 * @access  Private
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const organizationId = req.user!.organizationId;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const platform = req.query.platform as string | undefined;

    const rows = await db.queryAll(
      `SELECT c.id,
              c.platform,
              c.customer_id,
              c.customer_name,
              c.customer_profile_pic,
              c.status,
              c.message_count,
              c.last_message_at,
              c.started_at,
              lm.content AS last_message,
              lm.direction AS last_message_direction
         FROM conversations c
         LEFT JOIN LATERAL (
           SELECT content, direction
             FROM messages m
            WHERE m.conversation_id = c.id
            ORDER BY m.created_at DESC
            LIMIT 1
         ) lm ON TRUE
        WHERE c.organization_id = $1
          AND ($2::text IS NULL OR c.platform = $2)
        ORDER BY c.last_message_at DESC
        LIMIT $3`,
      [organizationId, platform || null, limit]
    );

    res.json({ success: true, data: rows });
  })
);

/**
 * @route   GET /api/conversations/:id/messages
 * @desc    Get the full message history of one conversation (oldest first).
 * @access  Private
 */
router.get(
  '/:id/messages',
  authenticate,
  asyncHandler(async (req, res) => {
    const organizationId = req.user!.organizationId;
    const conversationId = req.params.id;

    const conversation = await db.queryOne<{ id: string }>(
      `SELECT id FROM conversations WHERE id = $1 AND organization_id = $2`,
      [conversationId, organizationId]
    );
    if (!conversation) {
      res.status(404).json({ success: false, error: 'Conversation not found' });
      return;
    }

    const rows = await db.queryAll(
      `SELECT id, direction, message_type, content, attachments, handled_by, created_at
         FROM messages
        WHERE conversation_id = $1
        ORDER BY created_at ASC
        LIMIT 500`,
      [conversationId]
    );

    res.json({ success: true, data: rows });
  })
);

/**
 * @route   POST /api/conversations/:id/messages
 * @desc    Human agent reply: send via the Meta Send API with the page token,
 *          then persist as an outbound human-handled message.
 * @access  Private
 */
router.post(
  '/:id/messages',
  authenticate,
  asyncHandler(async (req, res) => {
    const organizationId = req.user!.organizationId;
    const conversationId = req.params.id;
    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';

    if (!text) {
      res.status(400).json({ success: false, error: 'Message text is required' });
      return;
    }

    const conversation = await db.queryOne<{
      id: string;
      platform: 'facebook' | 'instagram';
      page_id: string;
      customer_id: string;
    }>(
      `SELECT id, platform, page_id, customer_id
         FROM conversations
        WHERE id = $1 AND organization_id = $2`,
      [conversationId, organizationId]
    );
    if (!conversation) {
      res.status(404).json({ success: false, error: 'Conversation not found' });
      return;
    }

    // Same token resolution as liveAgent.service: FB pages store their own
    // token; IG accounts store the linked page's token on their row.
    let sendToken: string | null = null;
    if (conversation.platform === 'facebook') {
      sendToken = await tokenService.getPageTokenById(conversation.page_id);
    } else {
      const row = await db.queryOne<{ access_token_encrypted: string }>(
        `SELECT access_token_encrypted FROM instagram_accounts WHERE id = $1`,
        [conversation.page_id]
      );
      if (row) {
        try {
          sendToken = tokenService.decryptToken(row.access_token_encrypted);
        } catch {
          sendToken = null;
        }
      }
    }
    if (!sendToken) {
      res.status(409).json({
        success: false,
        error: 'No access token for this conversation — reconnect the account',
      });
      return;
    }

    const sent = await metaService.sendMessage(sendToken, conversation.customer_id, text);
    if (!sent) {
      res.status(502).json({
        success: false,
        error: 'Meta rejected the message (outside 24h window or thread owned by another app)',
      });
      return;
    }

    const message = await db.queryOne(
      `INSERT INTO messages (conversation_id, direction, message_type, content, handled_by)
       VALUES ($1, 'outbound', 'text', $2, 'human')
       RETURNING id, direction, message_type, content, attachments, handled_by, created_at`,
      [conversationId, text]
    );
    await db.query(
      `UPDATE conversations
          SET message_count = message_count + 1, last_message_at = NOW()
        WHERE id = $1`,
      [conversationId]
    );

    logger.info('Human agent reply sent', { conversationId, organizationId });
    res.json({ success: true, data: message });
  })
);

export default router;
