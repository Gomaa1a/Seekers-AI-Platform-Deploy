// API Services Index - Export all services
export { apiClient, adminClient, TokenManager } from './client';

// Auth
export { authService } from './services/auth';
export type { LoginCredentials, AdminLoginCredentials, RegisterData } from './services/auth';

// Organization
export { organizationService } from './services/organization';
export type { UpdateOrganizationData, InviteTeamMemberData } from './services/organization';

// Meta
export { metaService } from './services/meta';
export type { OAuthCallbackData, UpdatePageData } from './services/meta';

// Knowledge Bases
export { knowledgeBaseService } from './services/knowledgeBases';
export { knowledgeBaseService as knowledgeBasesService } from './services/knowledgeBases';
export type { ListKnowledgeBasesParams, AddDocumentData } from './services/knowledgeBases';

// Workflow Requests
export { workflowRequestService } from './services/workflowRequests';
export { workflowRequestService as workflowRequestsService } from './services/workflowRequests';
export type { ListWorkflowRequestsParams, UpdateWorkflowRequestData, SendMessageData } from './services/workflowRequests';

// Notifications
export { notificationService } from './services/notifications';
export type { ListNotificationsParams } from './services/notifications';

// Analytics
export { analyticsService } from './services/analytics';
export type { AnalyticsParams, ListConversationsParams } from './services/analytics';

// Admin
export { adminService } from './services/admin';
export type { ListClientsParams, AssignWorkflowData } from './services/admin';
