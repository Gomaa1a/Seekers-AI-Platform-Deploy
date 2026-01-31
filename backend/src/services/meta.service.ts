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
   * Generate Meta OAuth URL with CSRF protection
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
          fields: 'id,name,email',
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
            subscribed_fields: [
              'feed',
              'comments',
              'messages',
              'message_echoes',
              'messaging_postbacks',
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
   * Validate webhook signature from Meta
   */
  validateWebhookSignature(signature: string, payload: string): boolean {
    if (!signature) return false;

    const expectedSignature = crypto
      .createHmac('sha256', this.APP_SECRET)
      .update(payload)
      .digest('hex');

    const providedSignature = signature.replace('sha256=', '');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(providedSignature),
        Buffer.from(expectedSignature)
      );
    } catch {
      return false;
    }
  }

  /**
   * Send message via Messenger
   */
  async sendMessage(
    pageToken: string,
    recipientId: string,
    message: string
  ): Promise<boolean> {
    try {
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

      return true;
    } catch (error: any) {
      logger.error('Failed to send message', {
        recipientId,
        error: error.response?.data || error.message,
      });
      return false;
    }
  }

  /**
   * Reply to a comment
   */
  async replyToComment(
    pageToken: string,
    commentId: string,
    message: string
  ): Promise<boolean> {
    try {
      await this.api.post(
        `/${commentId}/replies`,
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
   * Get Instagram business account details
   */
  async getInstagramAccount(
    igAccountId: string,
    pageToken: string
  ): Promise<{
    id: string;
    username: string;
    profilePictureUrl: string | null;
    followersCount: number;
  } | null> {
    try {
      const response = await this.api.get(`/${igAccountId}`, {
        params: {
          access_token: pageToken,
          fields: 'id,username,profile_picture_url,followers_count',
        },
      });

      return {
        id: response.data.id,
        username: response.data.username,
        profilePictureUrl: response.data.profile_picture_url || null,
        followersCount: response.data.followers_count || 0,
      };
    } catch (error: any) {
      logger.error('Failed to get Instagram account', {
        igAccountId,
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
