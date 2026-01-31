// ============================================
// Notification Types
// ============================================

export type AdminNotificationType =
  | 'new_client'
  | 'new_signup'
  | 'meta_connected'
  | 'page_connected'
  | 'workflow_requested'
  | 'addon_requested'
  | 'knowledge_base_updated'
  | 'subscription_expiring'
  | 'payment_received'
  | 'support_ticket'
  | 'system_alert'
  | 'token_expiring'
  | 'token_refresh_failed'
  | 'webhook_failed';

export type ClientNotificationType =
  | 'welcome'
  | 'meta_connected_success'
  | 'workflow_approved'
  | 'workflow_rejected'
  | 'workflow_completed'
  | 'addon_configured'
  | 'subscription_reminder'
  | 'maintenance_scheduled'
  | 'new_feature'
  | 'token_expiring'
  | 'settings_updated'
  | 'webhook_updated'
  | 'plan_changed'
  | 'trial_started'
  | 'trial_ending'
  | 'trial_ended'
  | 'usage_warning'
  | 'usage_limit';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface AdminNotification {
  id: string;
  type: AdminNotificationType;
  title: string;
  message: string;
  organization_id: string | null;
  workflow_request_id: string | null;
  addon_request_id: string | null;
  target_admin_id: string | null;
  is_read: boolean;
  read_by: string | null;
  read_at: Date | null;
  priority: NotificationPriority;
  metadata: Record<string, any>;
  created_at: Date;
}

export interface ClientNotification {
  id: string;
  organization_id: string;
  user_id: string;
  type: ClientNotificationType;
  title: string;
  message: string;
  is_read: boolean;
  read_at: Date | null;
  metadata: Record<string, any>;
  created_at: Date;
}

export interface CreateAdminNotificationInput {
  type: AdminNotificationType;
  title: string;
  message: string;
  organizationId?: string;
  workflowRequestId?: string;
  addonRequestId?: string;
  targetAdminId?: string;
  priority?: NotificationPriority;
  metadata?: Record<string, any>;
}

export interface CreateClientNotificationInput {
  organizationId: string;
  userId: string;
  type: ClientNotificationType;
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

// Backward compatibility aliases
export type Notification = ClientNotification;
export type CreateNotificationInput = CreateClientNotificationInput;
export type AdminNotificationInput = CreateAdminNotificationInput;

// ============================================
// Conversation Types
// ============================================

export type ConversationPlatform = 'facebook' | 'instagram';
export type ConversationType = 'comment' | 'message' | 'reply';

export interface Conversation {
  id: string;
  organization_id: string;
  platform: ConversationPlatform;
  conversation_type: ConversationType;
  platform_conversation_id: string | null;
  platform_post_id: string | null;
  sender_id: string | null;
  sender_name: string | null;
  sender_profile_pic: string | null;
  message_text: string | null;
  message_type: string | null;
  bot_responded: boolean;
  bot_response_text: string | null;
  response_time_ms: number | null;
  handled_by_workflow_id: string | null;
  is_lead: boolean;
  lead_data: Record<string, any>;
  metadata: Record<string, any>;
  created_at: Date;
}

export interface CreateConversationInput {
  organizationId: string;
  platform: ConversationPlatform;
  conversationType: ConversationType;
  platformConversationId?: string;
  platformPostId?: string;
  senderId?: string;
  senderName?: string;
  senderProfilePic?: string;
  messageText?: string;
  messageType?: string;
  metadata?: Record<string, any>;
}

export interface UpdateConversationInput {
  botResponded?: boolean;
  botResponseText?: string;
  responseTimeMs?: number;
  handledByWorkflowId?: string;
  isLead?: boolean;
  leadData?: Record<string, any>;
}
