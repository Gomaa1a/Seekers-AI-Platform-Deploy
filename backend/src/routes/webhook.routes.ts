import { Router } from 'express';
import crypto from 'crypto';
import { webhookRouterService } from '../services';
import { enqueueWebhook } from '../workers/webhookProcessor';
import { config, logger } from '../config';
import { asyncHandler } from '../utils/helpers';

const router = Router();

/**
 * @route   GET /api/webhooks/meta
 * @desc    Verify Meta webhook subscription
 * @access  Public
 */
router.get(
  '/meta',
  asyncHandler(async (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === config.meta.webhookVerifyToken) {
      logger.info('Meta webhook verified');
      res.status(200).send(challenge);
    } else {
      logger.warn('Meta webhook verification failed', { mode, token });
      res.sendStatus(403);
    }
  })
);

/**
 * @route   POST /api/webhooks/meta
 * @desc    Receive Meta webhook events
 * @access  Public (with signature verification)
 */
router.post(
  '/meta',
  asyncHandler(async (req, res) => {
    // Verify signature
    const signature = req.headers['x-hub-signature-256'] as string;
    
    if (!verifyMetaSignature(req.body, signature)) {
      logger.warn('Invalid Meta webhook signature');
      res.sendStatus(401);
      return;
    }

    const body = req.body;

    // Respond immediately to acknowledge receipt
    res.sendStatus(200);

    // Process asynchronously
    processMetaWebhook(body).catch((error) => {
      logger.error('Error processing Meta webhook', { error });
    });
  })
);

/**
 * @route   GET /api/webhooks/instagram
 * @desc    Verify Instagram webhook subscription
 * @access  Public
 */
router.get(
  '/instagram',
  asyncHandler(async (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === config.meta.webhookVerifyToken) {
      logger.info('Instagram webhook verified');
      res.status(200).send(challenge);
    } else {
      logger.warn('Instagram webhook verification failed', { mode, token });
      res.sendStatus(403);
    }
  })
);

/**
 * @route   POST /api/webhooks/instagram
 * @desc    Receive Instagram webhook events
 * @access  Public (with signature verification)
 */
router.post(
  '/instagram',
  asyncHandler(async (req, res) => {
    // Verify signature
    const signature = req.headers['x-hub-signature-256'] as string;
    
    if (!verifyMetaSignature(req.body, signature)) {
      logger.warn('Invalid Instagram webhook signature');
      res.sendStatus(401);
      return;
    }

    const body = req.body;

    // Respond immediately to acknowledge receipt
    res.sendStatus(200);

    // Process asynchronously
    processInstagramWebhook(body).catch((error) => {
      logger.error('Error processing Instagram webhook', { error });
    });
  })
);

/**
 * Verify Meta webhook signature
 */
function verifyMetaSignature(payload: any, signature: string): boolean {
  if (!signature) return false;

  const expectedSignature = crypto
    .createHmac('sha256', config.meta.appSecret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return signature === `sha256=${expectedSignature}`;
}

/**
 * Process Facebook/Messenger webhook events
 */
async function processMetaWebhook(body: any): Promise<void> {
  const object = body.object;

  if (object !== 'page') {
    logger.debug('Ignoring non-page webhook', { object });
    return;
  }

  const entries = body.entry || [];

  for (const entry of entries) {
    const pageId = entry.id;

    // Process messaging events
    const messaging = entry.messaging || [];
    for (const event of messaging) {
      await processMessagingEvent(pageId, event);
    }

    // Process feed events (comments, reactions, etc.)
    const changes = entry.changes || [];
    for (const change of changes) {
      await processFeedEvent(pageId, change);
    }
  }
}

/**
 * Process Instagram webhook events
 */
async function processInstagramWebhook(body: any): Promise<void> {
  const object = body.object;

  if (object !== 'instagram') {
    logger.debug('Ignoring non-instagram webhook', { object });
    return;
  }

  const entries = body.entry || [];

  for (const entry of entries) {
    const instagramId = entry.id;

    // Process messaging events
    const messaging = entry.messaging || [];
    for (const event of messaging) {
      await processInstagramMessagingEvent(instagramId, event);
    }

    // Process other events (comments, mentions, etc.)
    const changes = entry.changes || [];
    for (const change of changes) {
      await processInstagramChangeEvent(instagramId, change);
    }
  }
}

/**
 * Process Facebook Messenger events
 */
async function processMessagingEvent(pageId: string, event: any): Promise<void> {
  const senderId = event.sender?.id;
  const recipientId = event.recipient?.id;
  const timestamp = event.timestamp;

  if (event.message) {
    // Text or media message - queue for async processing
    await enqueueWebhook({
      platform: 'facebook',
      eventType: 'messages',
      assetId: pageId,
      payload: {
        type: 'message',
        senderId,
        recipientId,
        timestamp,
        message: event.message,
      },
      receivedAt: new Date().toISOString(),
    });
  } else if (event.postback) {
    // Postback from buttons - queue for async processing
    await enqueueWebhook({
      platform: 'facebook',
      eventType: 'messaging_postbacks',
      assetId: pageId,
      payload: {
        type: 'postback',
        senderId,
        recipientId,
        timestamp,
        postback: event.postback,
      },
      receivedAt: new Date().toISOString(),
    });
  } else if (event.delivery) {
    // Delivery confirmation
    logger.debug('Message delivery confirmation', { pageId, senderId });
  } else if (event.read) {
    // Read receipt
    logger.debug('Message read receipt', { pageId, senderId });
  }
}

/**
 * Process Facebook feed events (comments, reactions)
 */
async function processFeedEvent(pageId: string, change: any): Promise<void> {
  const field = change.field;
  const value = change.value;

  if (field === 'feed') {
    const item = value.item;

    if (item === 'comment') {
      await enqueueWebhook({
        platform: 'facebook',
        eventType: 'comments',
        assetId: pageId,
        payload: {
          type: 'comment',
          commentId: value.comment_id,
          postId: value.post_id,
          parentId: value.parent_id,
          from: value.from,
          message: value.message,
          verb: value.verb,
          createdTime: value.created_time,
        },
        receivedAt: new Date().toISOString(),
      });
    } else if (item === 'reaction') {
      logger.debug('Reaction event', { pageId, value });
    } else if (item === 'post') {
      logger.debug('Post event', { pageId, verb: value.verb });
    }
  }
}

/**
 * Process Instagram DM events
 */
async function processInstagramMessagingEvent(instagramId: string, event: any): Promise<void> {
  const senderId = event.sender?.id;
  const recipientId = event.recipient?.id;
  const timestamp = event.timestamp;

  if (event.message) {
    await enqueueWebhook({
      platform: 'instagram',
      eventType: 'messages',
      assetId: instagramId,
      payload: {
        type: 'message',
        senderId,
        recipientId,
        timestamp,
        message: event.message,
      },
      receivedAt: new Date().toISOString(),
    });
  }
}

/**
 * Process Instagram change events (comments, mentions, story replies)
 */
async function processInstagramChangeEvent(instagramId: string, change: any): Promise<void> {
  const field = change.field;
  const value = change.value;

  if (field === 'comments') {
    await enqueueWebhook({
      platform: 'instagram',
      eventType: 'comments',
      assetId: instagramId,
      payload: {
        type: 'comment',
        mediaId: value.media?.id,
        commentId: value.id,
        text: value.text,
        from: value.from,
        timestamp: value.timestamp,
      },
      receivedAt: new Date().toISOString(),
    });
  } else if (field === 'mentions') {
    await enqueueWebhook({
      platform: 'instagram',
      eventType: 'mention',
      assetId: instagramId,
      payload: {
        type: 'mention',
        mediaId: value.media_id,
        commentId: value.comment_id,
      },
      receivedAt: new Date().toISOString(),
    });
  }
}

export default router;
