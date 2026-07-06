import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import { config, logger } from '../config';
import {
  MetaTokenExchangeResponse,
  MetaLongLivedTokenResponse,
  MetaUserInfo,
  MetaPageInfo,
  MetaPagesResponse,
} from '../types';

export class MetaService {
  private api: AxiosInstance;
  private readonly APP_ID = config.meta.appId;
  private readonly APP_SECRET = config.meta.appSecret;
  private readonly REDIRECT_URI = config.meta.redirectUri;
  private readonly API_VERSION = config.meta.apiVersion;
  private readonly REQUIRED_SCOPES = config.meta.requiredScopes;

  constructor() {
    this.api = axios.create({
      baseURL: config.meta.graphApiBaseUrl,
      timeout: 30000,
    });
  }

  /**
   * Sign an OAuth state value (CSRF protection). The state carries the
   * organizationId plus an expiry, HMAC-signed with the app secret so the
   * callback can prove the flow started on our server for that org.
   * Format: base64url("orgId|expiresAtMs|hmac")
   */
  signState(organizationId: string): string {
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes
    const payload = `${organizationId}|${expiresAt}`;
    const sig = crypto
      .createHmac('sha256', this.APP_SECRET)
      .update(payload)
      .digest('hex');
    return Buffer.from(`${payload}|${sig}`).toString('base64url');
  }

  /**
   * Verify a signed OAuth state. Returns the organizationId, or null when
   * the state is malformed, tampered with, or expired.
   */
  verifyState(state: string): string | null {
    try {
      const decoded = Buffer.from(state, 'base64url').toString('utf8');
      const [organizationId, expiresAtStr, sig] = decoded.split('|');
      if (!organizationId || !expiresAtStr || !sig) return null;

      const payload = `${organizationId}|${expiresAtStr}`;
      const expected = crypto
        .createHmac('sha256', this.APP_SECRET)
        .update(payload)
        .digest('hex');

      const valid = crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
      if (!valid) return null;
      if (Date.now() > parseInt(expiresAtStr, 10)) return null;

      return organizationId;
    } catch {
      return null;
    }
  }

  /**
   * Generate Meta OAuth URL with CSRF protection (state must come from signState)
   */
  generateAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.APP_ID,
      redirect_uri: this.REDIRECT_URI,
      state: state,
      scope: this.REQUIRED_SCOPES.join(','),
      response_type: 'code',
    });

    return `https://www.facebook.com/${this.API_VERSION}/dialog/oauth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for short-lived access token
   */
  async exchangeCodeForToken(code: string): Promise<MetaTokenExchangeResponse> {
    try {
      const response = await this.api.get('/oauth/access_token', {
        params: {
          client_id: this.APP_ID,
          client_secret: this.APP_SECRET,
          redirect_uri: this.REDIRECT_URI,
          code: code,
        },
      });

      logger.debug('Meta token exchange successful');
      return response.data;
    } catch (error: any) {
      logger.error('Meta token exchange failed', {
        error: error.response?.data || error.message,
      });
      throw new Error('Failed to exchange authorization code for access token');
    }
  }

  /**
   * Exchange short-lived token for long-lived token (60 days)
   */
  async getLongLivedToken(shortToken: string): Promise<MetaLongLivedTokenResponse> {
    try {
      const response = await this.api.get('/oauth/access_token', {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: this.APP_ID,
          client_secret: this.APP_SECRET,
          fb_exchange_token: shortToken,
        },
      });

      logger.debug('Long-lived token obtained');
      return response.data;
    } catch (error: any) {
      logger.error('Failed to get long-lived token', {
        error: error.response?.data || error.message,
      });
      throw new Error('Failed to exchange for long-lived token');
    }
  }

  /**
   * Get user info from Meta
   */
  async getUserInfo(userToken: string): Promise<MetaUserInfo> {
    try {
      const response = await this.api.get('/me', {
        params: {
          access_token: userToken,
          fields: 'id,name',
        },
      });

      return response.data;
    } catch (error: any) {
      logger.error('Failed to get Meta user info', {
        error: error.response?.data || error.message,
      });
      throw new Error('Failed to get user information from Meta');
    }
  }

  /**
   * Get user's Facebook Pages with Instagram accounts
   */
  async getUserPages(userToken: string): Promise<MetaPageInfo[]> {
    try {
      const response = await this.api.get<MetaPagesResponse>('/me/accounts', {
        params: {
          access_token: userToken,
          fields: 'id,name,access_token,category,link,picture,instagram_business_account{id,username,profile_picture_url,followers_count}',
        },
      });

      return response.data.data || [];
    } catch (error: any) {
      logger.error('Failed to get user pages', {
        error: error.response?.data || error.message,
      });
      throw new Error('Failed to retrieve Facebook pages');
    }
  }

  /**
   * Get page access token (already included in getUserPages, but useful for refresh)
   */
  async getPageAccessToken(userToken: string, pageId: string): Promise<string> {
    try {
      const response = await this.api.get(`/${pageId}`, {
        params: {
          access_token: userToken,
          fields: 'access_token',
        },
      });

      return response.data.access_token;
    } catch (error: any) {
      logger.error('Failed to get page access token', {
        pageId,
        error: error.response?.data || error.message,
      });
      throw new Error('Failed to get page access token');
    }
  }

  /**
   * Subscribe page to webhooks
   */
  async subscribePageWebhook(pageId: string, pageToken: string): Promise<boolean> {
    try {
      const response = await this.api.post(
        `/${pageId}/subscribed_apps`,
        {},
        {
          params: {
            // NOTE: 'comments' is NOT a valid Page field — Page comments arrive
            // via 'feed'. Including it makes Graph reject the whole call (#100),
            // leaving the Page subscribed to nothing.
            subscribed_fields: [
              'feed',
              'messages',
              'message_echoes',
              'messaging_postbacks',
              'message_deliveries',
              'message_reads',
              // Deliver events for threads owned by another app (handover
              // standby channel) so we can take thread control and reply.
              'standby',
            ].join(','),
            access_token: pageToken,
          },
        }
      );

      logger.info('Page webhook subscription successful', { pageId });
      return response.data.success === true;
    } catch (error: any) {
      logger.error('Failed to subscribe page webhook', {
        pageId,
        error: error.response?.data || error.message,
      });
      return false;
    }
  }

  /**
   * Unsubscribe page from webhooks
   */
  async unsubscribePageWebhook(pageId: string, pageToken: string): Promise<boolean> {
    try {
      const response = await this.api.delete(`/${pageId}/subscribed_apps`, {
        params: {
          access_token: pageToken,
        },
      });

      logger.info('Page webhook unsubscription successful', { pageId });
      return response.data.success === true;
    } catch (error: any) {
      logger.error('Failed to unsubscribe page webhook', {
        pageId,
        error: error.response?.data || error.message,
      });
      return false;
    }
  }

  /**
   * Subscribe Instagram account to webhooks
   */
  async subscribeInstagramWebhook(igAccountId: string, pageToken: string): Promise<boolean> {
    try {
      const response = await this.api.post(
        `/${igAccountId}/subscribed_apps`,
        {},
        {
          params: {
            subscribed_fields: ['comments', 'messages', 'messaging_postbacks'].join(','),
            access_token: pageToken,
          },
        }
      );

      logger.info('Instagram webhook subscription successful', { igAccountId });
      return response.data.success === true;
    } catch (error: any) {
      logger.error('Failed to subscribe Instagram webhook', {
        igAccountId,
        error: error.response?.data || error.message,
      });
      return false;
    }
  }

  /**
   * Debug token to check validity
   */
  async debugToken(inputToken: string, accessToken: string): Promise<{
    isValid: boolean;
    expiresAt: Date | null;
    scopes: string[];
    userId: string | null;
  }> {
    try {
      const response = await this.api.get('/debug_token', {
        params: {
          input_token: inputToken,
          access_token: accessToken,
        },
      });

      const data = response.data.data;
      return {
        isValid: data.is_valid,
        expiresAt: data.expires_at ? new Date(data.expires_at * 1000) : null,
        scopes: data.scopes || [],
        userId: data.user_id || null,
      };
    } catch (error: any) {
      logger.error('Token debug failed', {
        error: error.response?.data || error.message,
      });
      return {
        isValid: false,
        expiresAt: null,
        scopes: [],
        userId: null,
      };
    }
  }

  /**
   * Validate webhook signature from Meta.
   * Tries the Facebook app secret AND the separate Instagram app secret:
   * webhooks configured under the Instagram API use case are signed with the
   * Instagram app's own secret, not the Facebook app's.
   */
  validateWebhookSignature(signature: string, payload: string): boolean {
    if (!signature) return false;

    const providedSignature = signature.replace('sha256=', '');
    const secrets = [this.APP_SECRET, config.meta.instagramAppSecret].filter(
      (s): s is string => !!s
    );

    for (const secret of secrets) {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      try {
        if (
          crypto.timingSafeEqual(
            Buffer.from(providedSignature),
            Buffer.from(expectedSignature)
          )
        ) {
          return true;
        }
      } catch {
        // length mismatch — try the next secret
      }
    }

    return false;
  }

  /**
   * Send message via Messenger / Instagram DM.
   * On "(#100) not the thread owner" (subcode 2534037 — another app owns the
   * conversation via the Handover Protocol) we try to take thread control and
   * retry once. Taking control only succeeds when this app is the primary
   * receiver, but it is harmless to attempt otherwise.
   */
  async sendMessage(
    pageToken: string,
    recipientId: string,
    message: string
  ): Promise<boolean> {
    const attempt = async (): Promise<void> => {
      await this.api.post(
        '/me/messages',
        {
          recipient: { id: recipientId },
          message: { text: message },
        },
        {
          params: { access_token: pageToken },
        }
      );
    };

    try {
      await attempt();
      return true;
    } catch (error: any) {
      const errData = error.response?.data?.error;

      if (errData?.error_subcode === 2534037) {
        logger.warn('Thread owned by another app — taking thread control and retrying', {
          recipientId,
        });
        const took = await this.takeThreadControl(pageToken, recipientId);
        if (took) {
          try {
            await attempt();
            return true;
          } catch (retryError: any) {
            logger.error('Send failed even after taking thread control', {
              recipientId,
              error: retryError.response?.data || retryError.message,
            });
            return false;
          }
        }
      }

      logger.error('Failed to send message', {
        recipientId,
        error: error.response?.data || error.message,
      });
      return false;
    }
  }

  /**
   * Handover Protocol: take ownership of a conversation thread so this app
   * can reply. Succeeds only when the app is the page's primary receiver.
   */
  async takeThreadControl(pageToken: string, recipientId: string): Promise<boolean> {
    try {
      await this.api.post(
        '/me/take_thread_control',
        { recipient: { id: recipientId } },
        { params: { access_token: pageToken } }
      );
      logger.info('Thread control taken', { recipientId });
      return true;
    } catch (error: any) {
      logger.error('Failed to take thread control', {
        recipientId,
        error: error.response?.data || error.message,
      });
      return false;
    }
  }

  /**
   * Fetch a message sender's public profile so the inbox can show their real
   * social-media name and picture. Messenger PSIDs expose first/last name +
   * profile_pic; Instagram-scoped IDs expose name/username + profile_pic.
   * Best-effort: returns null when Meta declines (privacy settings, dev mode).
   */
  async getSenderProfile(
    pageToken: string,
    senderId: string,
    platform: 'facebook' | 'instagram'
  ): Promise<{ name: string | null; profilePic: string | null } | null> {
    try {
      const fields =
        platform === 'facebook'
          ? 'first_name,last_name,profile_pic'
          : 'name,username,profile_pic';
      const response = await this.api.get(`/${senderId}`, {
        params: { fields, access_token: pageToken },
      });
      const data = response.data || {};
      const name =
        platform === 'facebook'
          ? [data.first_name, data.last_name].filter(Boolean).join(' ') || null
          : data.name || data.username || null;
      return { name, profilePic: data.profile_pic || null };
    } catch (error: any) {
      logger.debug('Could not fetch sender profile', {
        senderId,
        platform,
        error: error.response?.data?.error?.message || error.message,
      });
      return null;
    }
  }

  /**
   * Reply to a comment.
   * The reply edge differs per platform: IG comments use /{id}/replies,
   * Facebook comments use /{id}/comments (/replies 400s with #100/33).
   */
  async replyToComment(
    pageToken: string,
    commentId: string,
    message: string,
    platform: 'facebook' | 'instagram' = 'instagram'
  ): Promise<boolean> {
    try {
      const edge = platform === 'facebook' ? 'comments' : 'replies';
      await this.api.post(
        `/${commentId}/${edge}`,
        { message },
        { params: { access_token: pageToken } }
      );

      return true;
    } catch (error: any) {
      logger.error('Failed to reply to comment', {
        commentId,
        error: error.response?.data || error.message,
      });
      return false;
    }
  }

  /**
   * Get the Instagram business account linked to a Facebook Page.
   * Callers pass the PAGE id — the IG account is resolved through the page's
   * instagram_business_account edge. (Querying the page id directly for IG
   * fields fails with "(#100) nonexisting field".)
   */
  async getInstagramAccount(
    pageId: string,
    pageToken: string
  ): Promise<{
    id: string;
    username: string;
    profilePictureUrl: string | null;
    followersCount: number;
  } | null> {
    try {
      const response = await this.api.get(`/${pageId}`, {
        params: {
          access_token: pageToken,
          fields: 'instagram_business_account{id,username,profile_picture_url,followers_count}',
        },
      });

      const ig = response.data.instagram_business_account;
      if (!ig) return null; // page has no linked IG professional account

      return {
        id: ig.id,
        username: ig.username,
        profilePictureUrl: ig.profile_picture_url || null,
        followersCount: ig.followers_count || 0,
      };
    } catch (error: any) {
      logger.error('Failed to get Instagram account', {
        pageId,
        error: error.response?.data || error.message,
      });
      return null;
    }
  }

  /**
   * Parse and verify a signed request from Meta
   * Used for deauthorization and data deletion callbacks
   */
  parseSignedRequest(signedRequest: string): { user_id: string; algorithm: string; issued_at: number } | null {
    try {
      const [encodedSig, payload] = signedRequest.split('.');
      
      if (!encodedSig || !payload) {
        logger.error('Invalid signed_request format');
        return null;
      }

      // Decode the payload
      const data = JSON.parse(
        Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
      );

      // Verify the signature
      const expectedSig = crypto
        .createHmac('sha256', this.APP_SECRET)
        .update(payload)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      if (encodedSig !== expectedSig) {
        logger.error('Signed request signature verification failed');
        return null;
      }

      if (data.algorithm?.toUpperCase() !== 'HMAC-SHA256') {
        logger.error('Unknown algorithm in signed request', { algorithm: data.algorithm });
        return null;
      }

      return {
        user_id: data.user_id,
        algorithm: data.algorithm,
        issued_at: data.issued_at,
      };
    } catch (error: any) {
      logger.error('Failed to parse signed request', { error: error.message });
      return null;
    }
  }
}

export const metaService = new MetaService();
export default metaService;
