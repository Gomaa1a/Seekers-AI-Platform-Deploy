// ============================================
// Seekers AI Platform - Type Definitions
// Matching Backend API Types
// ============================================

import type { ReactNode } from 'react';

// ============================================
// BASE TYPES
// ============================================

export type UUID = string;
export type Timestamp = string;

// Pagination
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============================================
// USER & AUTH TYPES
// ============================================

export interface User {
  id: UUID;
  email: string;
  name: string;
  phone?: string;
  avatar_url?: string;
  organization_id: UUID;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  is_active: boolean;
  email_verified: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
  last_login?: Timestamp;
}

export interface AdminUser {
  id: UUID;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'support';
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
  last_login?: Timestamp;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse extends AuthTokens {
  user: User;
}

export interface AdminLoginResponse extends AuthTokens {
  admin: AdminUser;
}

export interface RegisterResponse extends AuthTokens {
  user: User;
  organization: Organization;
}

// ============================================
// ORGANIZATION TYPES
// ============================================

export type SubscriptionPlan = 'free' | 'starter' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'active' | 'trial' | 'suspended' | 'cancelled';

export interface Organization {
  id: UUID;
  name: string;
  slug: string;
  industry?: string;
  website?: string;
  logo_url?: string;
  
  // Subscription
  subscription_plan: SubscriptionPlan;
  subscription_status: SubscriptionStatus;
  trial_ends_at?: Timestamp;
  
  // Settings
  settings: OrganizationSettings;
  
  // Timestamps
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface OrganizationSettings {
  ai_tone?: 'professional' | 'friendly' | 'concise' | 'detailed';
  timezone?: string;
  default_language?: string;
  notification_email?: string;
  auto_reply_enabled?: boolean;
  business_hours?: {
    enabled: boolean;
    schedule: Record<string, { start: string; end: string; enabled: boolean }>;
  };
}

export interface OrganizationStats {
  total_conversations: number;
  total_messages: number;
  active_workflows: number;
  knowledge_bases_count: number;
  connected_pages_count: number;
  ai_resolution_rate: number;
  mrr: number;
}

// ============================================
// META CONNECTION TYPES
// ============================================

export type MetaPlatform = 'facebook' | 'instagram';
export type MetaConnectionStatus = 'active' | 'expired' | 'revoked' | 'error';

export interface MetaConnection {
  id: UUID;
  organization_id: UUID;
  platform: MetaPlatform;
  platform_user_id: string;
  platform_username?: string;
  access_token_encrypted: string;
  token_expires_at?: Timestamp;
  status: MetaConnectionStatus;
  scopes: string[];
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface MetaPage {
  id: UUID;
  organization_id: UUID;
  meta_connection_id: UUID;
  page_id: string;
  page_name: string;
  platform: MetaPlatform;
  access_token_encrypted: string;
  is_active: boolean;
  profile_picture_url?: string;
  followers_count?: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface MetaConnectionStatusResponse {
  connected: boolean;
  platforms: {
    facebook: { connected: boolean; pages: MetaPage[] };
    instagram: { connected: boolean; pages: MetaPage[] };
  };
  last_sync?: Timestamp;
}

// ============================================
// KNOWLEDGE BASE TYPES
// ============================================

export type KnowledgeBaseType = 'chatbot' | 'comments' | 'general';
export type KnowledgeBaseStatus = 'processing' | 'ready' | 'error';

export interface KnowledgeBase {
  id: UUID;
  organization_id: UUID;
  name: string;
  description?: string;
  type: KnowledgeBaseType;
  status: KnowledgeBaseStatus;
  
  // Content stats
  word_count: number;
  document_count: number;
  last_trained_at?: Timestamp;
  
  // Settings
  settings: KnowledgeBaseSettings;
  
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface KnowledgeBaseSettings {
  language?: string;
  response_style?: 'concise' | 'detailed' | 'conversational';
  include_sources?: boolean;
  max_response_length?: number;
}

export interface KnowledgeBaseDocument {
  id: UUID;
  knowledge_base_id: UUID;
  title: string;
  content: string;
  source_type: 'manual' | 'file' | 'url';
  source_url?: string;
  word_count: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface CreateKnowledgeBaseRequest {
  name: string;
  description?: string;
  type: KnowledgeBaseType;
  content?: string;
  settings?: KnowledgeBaseSettings;
}

export interface UpdateKnowledgeBaseRequest {
  name?: string;
  description?: string;
  content?: string;
  settings?: KnowledgeBaseSettings;
}

// ============================================
// WORKFLOW REQUEST TYPES
// ============================================

export type WorkflowRequestStatus = 
  | 'pending'
  | 'reviewing'
  | 'in_progress'
  | 'testing'
  | 'completed'
  | 'rejected';

export type WorkflowRequestPriority = 'low' | 'medium' | 'high' | 'urgent';

export type WorkflowType = 
  | 'facebook_messenger_bot'
  | 'instagram_dm_bot'
  | 'facebook_comments'
  | 'instagram_comments'
  | 'lead_capture'
  | 'keyword_automation'
  | 'custom';

export interface WorkflowRequest {
  id: UUID;
  organization_id: UUID;
  
  // Request details
  title: string;
  description: string;
  workflow_type: WorkflowType;
  
  // Status tracking
  status: WorkflowRequestStatus;
  priority: WorkflowRequestPriority;
  
  // Linked resources
  knowledge_base_ids: UUID[];
  page_ids: UUID[];
  addon_ids: UUID[];
  
  // Assignment
  assigned_admin_id?: UUID;
  assigned_admin?: AdminUser;
  
  // n8n workflow (assigned by admin)
  n8n_workflow_id?: UUID;
  webhook_url?: string;
  
  // Timestamps
  created_at: Timestamp;
  updated_at: Timestamp;
  completed_at?: Timestamp;
}

export interface CreateWorkflowRequestRequest {
  title: string;
  description: string;
  workflow_type: WorkflowType;
  knowledge_base_ids?: UUID[];
  page_ids?: UUID[];
  addon_ids?: UUID[];
  priority?: WorkflowRequestPriority;
}

export interface WorkflowRequestMessage {
  id: UUID;
  workflow_request_id: UUID;
  sender_type: 'client' | 'admin';
  sender_id: UUID;
  sender_name: string;
  message: string;
  created_at: Timestamp;
}

// ============================================
// N8N WORKFLOW TYPES (Admin)
// ============================================

export interface N8nWorkflow {
  id: UUID;
  name: string;
  description?: string;
  n8n_workflow_id: string;
  webhook_path: string;
  is_template: boolean;
  workflow_type: WorkflowType;
  status: 'active' | 'inactive' | 'deprecated';
  deployments_count: number;
  success_rate: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// ============================================
// ADD-ON TYPES
// ============================================

export type AddonStatus = 'active' | 'available' | 'coming_soon';

export interface Addon {
  id: UUID;
  name: string;
  description: string;
  icon: string;
  price_monthly: number;
  status: AddonStatus;
  features: string[];
  created_at: Timestamp;
}

export interface OrganizationAddon {
  id: UUID;
  organization_id: UUID;
  addon_id: UUID;
  addon: Addon;
  is_active: boolean;
  activated_at: Timestamp;
  configuration?: Record<string, any>;
}

// ============================================
// NOTIFICATION TYPES
// ============================================

export type NotificationType = 
  | 'workflow_status'
  | 'meta_token_expiry'
  | 'system_alert'
  | 'new_message'
  | 'subscription_alert';

export interface Notification {
  id: UUID;
  organization_id?: UUID;
  user_id?: UUID;
  admin_id?: UUID;
  
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  
  read: boolean;
  read_at?: Timestamp;
  created_at: Timestamp;
}

// ============================================
// ANALYTICS TYPES
// ============================================

export interface DashboardStats {
  conversations: {
    total: number;
    today: number;
    trend: number;
  };
  messages: {
    total: number;
    ai_handled: number;
    human_escalated: number;
  };
  resolution_rate: number;
  avg_response_time: number;
  active_workflows: number;
}

export interface AnalyticsData {
  period: 'day' | 'week' | 'month' | 'year';
  data_points: {
    date: string;
    conversations: number;
    messages: number;
    ai_resolutions: number;
    human_escalations: number;
  }[];
  totals: {
    conversations: number;
    messages: number;
    ai_resolution_rate: number;
  };
}

export interface PlatformAnalytics {
  mrr: number;
  mrr_growth: number;
  total_organizations: number;
  active_organizations: number;
  total_workflows: number;
  api_uptime: number;
  system_load: number;
}

// ============================================
// CONVERSATION TYPES
// ============================================

export type ConversationPlatform = 'facebook_messenger' | 'instagram_dm' | 'facebook_comments' | 'instagram_comments';
export type ConversationStatus = 'active' | 'resolved' | 'escalated';

export interface Conversation {
  id: UUID;
  organization_id: UUID;
  page_id: UUID;
  platform: ConversationPlatform;
  
  // External user
  external_user_id: string;
  external_user_name?: string;
  external_user_avatar?: string;
  
  // Status
  status: ConversationStatus;
  last_message_at: Timestamp;
  
  // AI handling
  ai_handled: boolean;
  escalated_at?: Timestamp;
  
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Message {
  id: UUID;
  conversation_id: UUID;
  sender_type: 'user' | 'ai' | 'human_agent';
  content: string;
  metadata?: Record<string, any>;
  created_at: Timestamp;
}

// ============================================
// ADMIN TYPES
// ============================================

export interface AdminDashboardStats {
  mrr: number;
  mrr_trend: number;
  active_workflows: number;
  workflows_trend: number;
  global_uptime: number;
  new_tenants: number;
  tenants_trend: number;
}

export interface AdminIssue {
  id: UUID;
  organization_id: UUID;
  organization_name: string;
  issue_type: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: Timestamp;
}

export interface AdminClient {
  id: UUID;
  name: string;
  slug: string;
  subscription_plan: SubscriptionPlan;
  subscription_status: SubscriptionStatus;
  mrr: number;
  usage_percentage: number;
  created_at: Timestamp;
  owner: {
    id: UUID;
    name: string;
    email: string;
  };
}

// ============================================
// FORM/UI HELPER TYPES
// ============================================

export interface SelectOption {
  value: string;
  label: string;
}

export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => ReactNode;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

// ============================================
// LEGACY TYPES (for backward compatibility)
// ============================================

// Keep these for components that still use old naming
export type { KnowledgeBase as KnowledgeBaseItem };
export type { WorkflowRequest as WorkflowRequestItem };
