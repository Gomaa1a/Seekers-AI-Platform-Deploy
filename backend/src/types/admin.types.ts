// ============================================
// Admin Types (Seekers Dashboard)
// ============================================

import { Organization, SubscriptionStatus, SubscriptionTier } from './organization.types';
import { WorkflowRequest, AddonRequest } from './workflow.types';
import { FacebookPage, InstagramAccount } from './meta.types';

// ============================================
// Client Overview for Admin
// ============================================

export interface ClientOverview extends Organization {
  owner_email: string;
  owner_name: string;
  pages_count: number;
  instagram_count: number;
  knowledge_bases_count: number;
  pending_requests_count: number;
  active_workflows_count: number;
  total_conversations: number;
  last_activity_at: Date | null;
}

export interface ClientDetails {
  organization: Organization;
  owner: {
    id: string;
    email: string;
    fullName: string;
    phone: string | null;
    lastLogin: Date | null;
  };
  pages: FacebookPage[];
  instagramAccounts: InstagramAccount[];
  workflowRequests: WorkflowRequest[];
  addonRequests: AddonRequest[];
  stats: ClientStats;
}

export interface ClientStats {
  totalConversations: number;
  conversationsThisMonth: number;
  averageResponseTime: number;
  botResponseRate: number;
  leadsGenerated: number;
}

// ============================================
// Admin Dashboard Types
// ============================================

export interface AdminDashboardStats {
  totalClients: number;
  activeClients: number;
  newClientsThisMonth: number;
  
  totalPages: number;
  totalInstagramAccounts: number;
  
  pendingWorkflowRequests: number;
  pendingAddonRequests: number;
  
  totalConversationsToday: number;
  totalConversationsThisMonth: number;
  
  webhookSuccessRate: number;
  averageResponseTime: number;
  
  revenueThisMonth: number;
  subscriptionsByTier: Record<SubscriptionTier, number>;
  
  // Extended stats
  organizations?: {
    total: number;
    active: number;
    newThisMonth: number;
    byPlan: Record<string, number>;
  };
  workflowRequests?: {
    pending: number;
    inProgress: number;
    completed: number;
    avgCompletionTime: number;
  };
  addons?: {
    pending: number;
    totalRequested: number;
    mostRequested: Array<{ name: string; count: number }>;
  };
  recentActivity?: RecentActivity[];
}

export interface RecentActivity {
  type: 'new_client' | 'meta_connected' | 'workflow_requested' | 'addon_requested' | 'workflow_completed';
  organizationId: string;
  organizationName: string;
  description: string;
  timestamp: Date;
}

// ============================================
// Admin Filters
// ============================================

export interface ClientsFilter {
  search?: string;
  subscriptionTier?: SubscriptionTier;
  subscriptionStatus?: SubscriptionStatus;
  metaConnected?: boolean;
  hasWorkflowRequests?: boolean;
  assignedAdminId?: string;
  industry?: string;
  sortBy?: 'created_at' | 'name' | 'last_activity';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface WorkflowRequestsFilter {
  status?: string;
  priority?: string;
  assignedTo?: string;
  organizationId?: string;
  requestType?: string;
  sortBy?: 'created_at' | 'priority' | 'status';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// ============================================
// Admin Actions
// ============================================

export interface AssignWebhookInput {
  organizationId: string;
  workflowRequestId: string;
  workflowType: string;
  n8nWebhookUrl: string;
  n8nWorkflowId?: string;
  knowledgeBaseId?: string;
  connectToPages?: string[];
  connectToInstagram?: string[];
}

export interface UpdateClientSubscriptionInput {
  subscriptionTier?: SubscriptionTier;
  subscriptionStatus?: SubscriptionStatus;
  subscriptionEndsAt?: Date;
}

export interface AdminNoteInput {
  note: string;
}

// ============================================
// Paginated Response
// ============================================

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}
