// ============================================
// Application Constants
// ============================================

// Subscription Tiers
export const SUBSCRIPTION_TIERS = {
  TRIAL: 'trial',
  STARTER: 'starter',
  PROFESSIONAL: 'professional',
  ENTERPRISE: 'enterprise',
} as const;

// Subscription Limits by Tier
export const TIER_LIMITS = {
  trial: {
    maxPages: 1,
    maxInstagram: 1,
    maxKnowledgeBases: 2,
    maxWorkflows: 1,
    maxConversationsPerMonth: 100,
    trialDays: 14,
  },
  starter: {
    maxPages: 2,
    maxInstagram: 2,
    maxKnowledgeBases: 4,
    maxWorkflows: 2,
    maxConversationsPerMonth: 1000,
  },
  professional: {
    maxPages: 5,
    maxInstagram: 5,
    maxKnowledgeBases: 10,
    maxWorkflows: 5,
    maxConversationsPerMonth: 10000,
  },
  enterprise: {
    maxPages: -1, // Unlimited
    maxInstagram: -1,
    maxKnowledgeBases: -1,
    maxWorkflows: -1,
    maxConversationsPerMonth: -1,
  },
} as const;

// Workflow Types
export const WORKFLOW_TYPES = {
  FACEBOOK_COMMENTS: 'facebook_comments',
  INSTAGRAM_COMMENTS: 'instagram_comments',
  MESSENGER: 'messenger',
  INSTAGRAM_DM: 'instagram_dm',
} as const;

// Platform Types
export const PLATFORMS = {
  FACEBOOK: 'facebook',
  INSTAGRAM: 'instagram',
} as const;

// Admin Roles
export const ADMIN_ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  SUPPORT: 'support',
} as const;

// Request Statuses
export const REQUEST_STATUS = {
  PENDING: 'pending',
  IN_REVIEW: 'in_review',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
} as const;

// Priority Levels
export const PRIORITY_LEVELS = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

// Add-on Types
export const ADDON_TYPES = {
  GOOGLE_SHEETS: 'google_sheets',
  WHATSAPP_NOTIFICATION: 'whatsapp_notification',
  EMAIL_NOTIFICATION: 'email_notification',
  CRM_INTEGRATION: 'crm_integration',
  SLACK_NOTIFICATION: 'slack_notification',
  TELEGRAM_NOTIFICATION: 'telegram_notification',
  CUSTOM_WEBHOOK: 'custom_webhook',
  ANALYTICS_EXPORT: 'analytics_export',
  LEAD_SCORING: 'lead_scoring',
} as const;

// Notification Types (Admin)
export const ADMIN_NOTIFICATION_TYPES = {
  NEW_CLIENT: 'new_client',
  META_CONNECTED: 'meta_connected',
  WORKFLOW_REQUESTED: 'workflow_requested',
  ADDON_REQUESTED: 'addon_requested',
  KNOWLEDGE_BASE_UPDATED: 'knowledge_base_updated',
  SUBSCRIPTION_EXPIRING: 'subscription_expiring',
  PAYMENT_RECEIVED: 'payment_received',
  SUPPORT_TICKET: 'support_ticket',
  SYSTEM_ALERT: 'system_alert',
} as const;

// Notification Types (Client)
export const CLIENT_NOTIFICATION_TYPES = {
  WELCOME: 'welcome',
  META_CONNECTED_SUCCESS: 'meta_connected_success',
  WORKFLOW_APPROVED: 'workflow_approved',
  WORKFLOW_REJECTED: 'workflow_rejected',
  WORKFLOW_COMPLETED: 'workflow_completed',
  ADDON_CONFIGURED: 'addon_configured',
  SUBSCRIPTION_REMINDER: 'subscription_reminder',
  MAINTENANCE_SCHEDULED: 'maintenance_scheduled',
  NEW_FEATURE: 'new_feature',
} as const;

// Meta Webhook Fields
export const META_WEBHOOK_FIELDS = {
  FACEBOOK_PAGE: [
    'feed',
    'comments',
    'messages',
    'message_echoes',
    'messaging_postbacks',
    'messaging_referrals',
  ],
  INSTAGRAM: [
    'comments',
    'messages',
    'messaging_postbacks',
    'mention',
  ],
} as const;

// Activity Log Actions
export const ACTIVITY_ACTIONS = {
  LOGIN: 'login',
  LOGOUT: 'logout',
  REGISTER: 'register',
  PAGE_CONNECTED: 'page_connected',
  PAGE_DISCONNECTED: 'page_disconnected',
  INSTAGRAM_CONNECTED: 'instagram_connected',
  INSTAGRAM_DISCONNECTED: 'instagram_disconnected',
  KB_CREATED: 'kb_created',
  KB_UPDATED: 'kb_updated',
  KB_DELETED: 'kb_deleted',
  WORKFLOW_REQUESTED: 'workflow_requested',
  WORKFLOW_ASSIGNED: 'workflow_assigned',
  WORKFLOW_ACTIVATED: 'workflow_activated',
  ADDON_REQUESTED: 'addon_requested',
  ADDON_CONFIGURED: 'addon_configured',
  SETTINGS_UPDATED: 'settings_updated',
  META_CONNECTED: 'meta_connected',
  META_DISCONNECTED: 'meta_disconnected',
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Cache Keys
export const CACHE_KEYS = {
  USER_SESSION: (userId: string) => `session:user:${userId}`,
  ADMIN_SESSION: (adminId: string) => `session:admin:${adminId}`,
  OAUTH_STATE: (state: string) => `oauth:state:${state}`,
  ORG_SETTINGS: (orgId: string) => `org:settings:${orgId}`,
  PAGE_TOKEN: (pageId: string) => `page:token:${pageId}`,
  RATE_LIMIT: (identifier: string) => `ratelimit:${identifier}`,
} as const;

// Cache TTL (in seconds)
export const CACHE_TTL = {
  SESSION: 7 * 24 * 60 * 60, // 7 days
  OAUTH_STATE: 10 * 60, // 10 minutes
  ORG_SETTINGS: 60 * 60, // 1 hour
  PAGE_TOKEN: 24 * 60 * 60, // 24 hours
  RATE_LIMIT: 15 * 60, // 15 minutes
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Authentication required',
  FORBIDDEN: 'Access denied',
  NOT_FOUND: 'Resource not found',
  VALIDATION_FAILED: 'Validation failed',
  RATE_LIMITED: 'Too many requests',
  SERVER_ERROR: 'Internal server error',
  META_TOKEN_EXPIRED: 'Meta access token has expired',
  WEBHOOK_FAILED: 'Webhook delivery failed',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  REGISTERED: 'Registration successful',
  LOGGED_IN: 'Login successful',
  LOGGED_OUT: 'Logout successful',
  PAGE_CONNECTED: 'Facebook page connected successfully',
  INSTAGRAM_CONNECTED: 'Instagram account connected successfully',
  KB_CREATED: 'Knowledge base created successfully',
  KB_UPDATED: 'Knowledge base updated successfully',
  WORKFLOW_REQUESTED: 'Workflow request submitted successfully',
  ADDON_REQUESTED: 'Add-on request submitted successfully',
} as const;

export default {
  SUBSCRIPTION_TIERS,
  TIER_LIMITS,
  WORKFLOW_TYPES,
  PLATFORMS,
  ADMIN_ROLES,
  REQUEST_STATUS,
  PRIORITY_LEVELS,
  ADDON_TYPES,
  ADMIN_NOTIFICATION_TYPES,
  CLIENT_NOTIFICATION_TYPES,
  META_WEBHOOK_FIELDS,
  ACTIVITY_ACTIONS,
  HTTP_STATUS,
  CACHE_KEYS,
  CACHE_TTL,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
};
