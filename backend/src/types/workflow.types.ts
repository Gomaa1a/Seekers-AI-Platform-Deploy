// ============================================
// Knowledge Base Types
// ============================================

export type KnowledgeBaseType = 'chatbot' | 'comments';
export type ContentFormat = 'text' | 'markdown' | 'json';

export interface KnowledgeBase {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  type: KnowledgeBaseType;
  content: string;
  content_format: ContentFormat;
  version: number;
  is_active: boolean;
  attachments: KnowledgeBaseAttachment[];
  word_count: number | null;
  last_updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface KnowledgeBaseAttachment {
  filename: string;
  url: string;
  type: string;
  size: number;
}

export interface KnowledgeBaseHistory {
  id: string;
  knowledge_base_id: string;
  content: string;
  version: number;
  changed_by: string | null;
  change_reason: string | null;
  created_at: Date;
}

export interface CreateKnowledgeBaseInput {
  name: string;
  description?: string;
  type: KnowledgeBaseType;
  content: string;
  contentFormat?: ContentFormat;
}

export interface UpdateKnowledgeBaseInput {
  name?: string;
  description?: string;
  content?: string;
  contentFormat?: ContentFormat;
  isActive?: boolean;
  changeReason?: string;
}

// ============================================
// Workflow Request Types
// ============================================

export type WorkflowRequestType = 'chatbot' | 'comments' | 'both';
export type WorkflowRequestStatus = 'pending' | 'in_review' | 'in_progress' | 'completed' | 'rejected';
export type RequestPriority = 'low' | 'normal' | 'high' | 'urgent';
export type WorkflowPlatform = 
  | 'facebook_messenger' 
  | 'instagram_dm' 
  | 'facebook_comments' 
  | 'instagram_comments';

export interface WorkflowRequest {
  id: string;
  organization_id: string;
  request_type: WorkflowRequestType;
  title: string;
  description: string;
  platforms: WorkflowPlatform[];
  status: WorkflowRequestStatus;
  priority: RequestPriority;
  assigned_to: string | null;
  reviewed_by: string | null;
  reviewed_at: Date | null;
  admin_notes: string | null;
  rejection_reason: string | null;
  estimated_completion: Date | null;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateWorkflowRequestInput {
  requestType: WorkflowRequestType;
  title: string;
  description: string;
  platforms: WorkflowPlatform[];
}

export interface UpdateWorkflowRequestInput {
  status?: WorkflowRequestStatus;
  priority?: RequestPriority;
  assignedTo?: string;
  adminNotes?: string;
  rejectionReason?: string;
  estimatedCompletion?: Date;
}

// ============================================
// Add-on Request Types
// ============================================

export type AddonType = 
  | 'google_sheets' 
  | 'whatsapp_notification' 
  | 'email_notification' 
  | 'crm_integration'
  | 'slack_notification'
  | 'telegram_notification'
  | 'custom_webhook'
  | 'analytics_export'
  | 'lead_scoring';

export type AddonStatus = 'pending' | 'configured' | 'active' | 'disabled';

export interface AddonRequest {
  id: string;
  organization_id: string;
  workflow_request_id: string | null;
  addon_type: AddonType;
  addon_name: string;
  description: string | null;
  configuration: Record<string, any>;
  status: AddonStatus;
  setup_notes: string | null;
  configured_by: string | null;
  configured_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateAddonRequestInput {
  workflowRequestId?: string;
  addonType: AddonType;
  addonName: string;
  description?: string;
  configuration?: Record<string, any>;
}

export interface UpdateAddonRequestInput {
  status?: AddonStatus;
  configuration?: Record<string, any>;
  setupNotes?: string;
}

// ============================================
// n8n Workflow Types (Managed by Seekers)
// ============================================

export type N8nWorkflowType = 
  | 'facebook_comments' 
  | 'instagram_comments' 
  | 'messenger' 
  | 'instagram_dm';

export interface N8nWorkflow {
  id: string;
  organization_id: string;
  workflow_request_id: string | null;
  workflow_name: string;
  workflow_type: N8nWorkflowType;
  n8n_webhook_url: string;
  n8n_workflow_id: string | null;
  n8n_server_url: string;
  knowledge_base_id: string | null;
  is_active: boolean;
  is_production: boolean;
  last_triggered_at: Date | null;
  trigger_count: number;
  failure_count: number;
  custom_config: Record<string, any>;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface WorkflowConnection {
  id: string;
  workflow_id: string;
  facebook_page_id: string | null;
  instagram_account_id: string | null;
  is_active: boolean;
  created_at: Date;
}

export interface CreateN8nWorkflowInput {
  organizationId: string;
  workflowRequestId?: string;
  workflowName: string;
  workflowType: N8nWorkflowType;
  n8nWebhookUrl: string;
  n8nWorkflowId?: string;
  knowledgeBaseId?: string;
  customConfig?: Record<string, any>;
  // Aliases for legacy code
  name?: string;
  description?: string;
  platform?: string;
  webhookUrl?: string;
}

export interface UpdateN8nWorkflowInput {
  workflowName?: string;
  n8nWebhookUrl?: string;
  n8nWorkflowId?: string;
  knowledgeBaseId?: string;
  isActive?: boolean;
  isProduction?: boolean;
  customConfig?: Record<string, any>;
  // Aliases for legacy code
  name?: string;
  description?: string;
  webhookUrl?: string;
  configuration?: Record<string, any>;
}

export interface ConnectWorkflowInput {
  facebookPageId?: string;
  instagramAccountId?: string;
}

// ============================================
// Webhook Routing Types
// ============================================

export interface WebhookRouteLog {
  id: string;
  asset_id: string;
  platform: string;
  n8n_webhook_url: string | null;
  status: 'success' | 'failed' | 'timeout';
  response_time_ms: number | null;
  error_message: string | null;
  created_at: Date;
}

export interface WebhookRoutePayload {
  platform: 'facebook' | 'instagram';
  assetId: string;
  organizationId: string;
  workflowType: N8nWorkflowType;
  event: Record<string, any>;
  knowledgeBase?: {
    id: string;
    content: string;
    type: KnowledgeBaseType;
  };
  timestamp: string;
}
