// ============================================
// Meta Integration Types
// ============================================

export interface MetaToken {
  id: string;
  organization_id: string;
  user_id: string;
  access_token: string; // Encrypted
  token_type: 'user_token';
  expires_at: Date | null;
  scopes: string[];
  meta_user_id: string | null;
  meta_user_name: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface FacebookPage {
  id: string;
  organization_id: string;
  page_id: string;
  page_name: string | null;
  // Actual DB columns (001_initial_schema.sql):
  access_token_encrypted: string; // Encrypted
  category: string | null;
  picture_url: string | null;
  token_expires_at: Date | null;
  is_active: boolean;
  webhook_subscribed: boolean;
  created_at: Date;
  updated_at: Date;
  // Legacy/optional aliases kept for backward-compat with older code paths:
  page_category?: string | null;
  page_access_token?: string;
  page_picture_url?: string | null;
  page_link?: string | null;
  followers_count?: number | null;
}

export interface InstagramAccount {
  id: string;
  organization_id: string;
  facebook_page_id: string;
  // Actual DB columns:
  instagram_id: string;
  access_token_encrypted: string;
  username: string | null;
  is_active: boolean;
  webhook_subscribed: boolean;
  profile_picture_url: string | null;
  followers_count: number | null;
  created_at: Date;
  updated_at: Date;
  // Legacy/optional alias:
  instagram_business_account_id?: string;
}

// ============================================
// Meta OAuth Types
// ============================================

export interface MetaOAuthState {
  organizationId: string;
  userId: string;
  timestamp: number;
  nonce: string;
}

export interface MetaTokenExchangeResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface MetaLongLivedTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number; // ~60 days in seconds
}

export interface MetaUserInfo {
  id: string;
  name: string;
  email?: string;
}

export interface MetaPageInfo {
  id: string;
  name: string;
  access_token: string;
  category?: string;
  link?: string;
  picture?: {
    data: {
      url: string;
    };
  };
  instagram_business_account?: {
    id: string;
    username: string;
    profile_picture_url?: string;
    followers_count?: number;
  };
}

export interface MetaPagesResponse {
  data: MetaPageInfo[];
  paging?: {
    cursors: {
      before: string;
      after: string;
    };
    next?: string;
  };
}

// ============================================
// Meta Webhook Types
// ============================================

export type WebhookPlatform = 'facebook' | 'instagram';
export type WebhookEventType = 
  | 'messages' 
  | 'message_echoes'
  | 'messaging_postbacks'
  | 'feed' 
  | 'comments'
  | 'mention';

export interface WebhookEvent {
  id: string;
  organization_id: string | null;
  event_type: string;
  platform: WebhookPlatform;
  platform_id: string | null;
  payload: Record<string, any>;
  processed: boolean;
  routed_to_n8n: boolean;
  n8n_workflow_id: string | null;
  n8n_response_status: number | null;
  error_message: string | null;
  retry_count: number;
  created_at: Date;
  processed_at: Date | null;
}

export interface FacebookWebhookBody {
  object: 'page';
  entry: FacebookWebhookEntry[];
}

export interface FacebookWebhookEntry {
  id: string; // Page ID
  time: number;
  changes?: FacebookWebhookChange[];
  messaging?: FacebookMessagingEvent[];
}

export interface FacebookWebhookChange {
  field: string;
  value: Record<string, any>;
}

export interface FacebookMessagingEvent {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: {
    mid: string;
    text?: string;
    attachments?: any[];
  };
  postback?: {
    title: string;
    payload: string;
  };
}

export interface InstagramWebhookBody {
  object: 'instagram';
  entry: InstagramWebhookEntry[];
}

export interface InstagramWebhookEntry {
  id: string; // Instagram Account ID
  time: number;
  changes?: InstagramWebhookChange[];
  messaging?: InstagramMessagingEvent[];
}

export interface InstagramWebhookChange {
  field: string;
  value: Record<string, any>;
}

export interface InstagramMessagingEvent {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: {
    mid: string;
    text?: string;
    attachments?: any[];
  };
}

// ============================================
// Connect Page Input Types
// ============================================

export interface ConnectPageInput {
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  pageCategory?: string;
  pageLink?: string;
  pagePictureUrl?: string;
  instagramAccount?: {
    id: string;
    username: string;
    profilePictureUrl?: string;
    followersCount?: number;
  };
}

export interface DisconnectPageInput {
  pageId: string;
}
