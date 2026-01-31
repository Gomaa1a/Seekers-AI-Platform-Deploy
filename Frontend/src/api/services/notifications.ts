import apiClient from '../client';
import type { Notification } from '../../types';

// ============================================
// Request Types
// ============================================

export interface ListNotificationsParams {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

// ============================================
// Notifications Service
// Aligned with backend routes in notification.routes.ts
// ============================================

export const notificationService = {
  // List notifications for current user
  // Backend: GET /api/notifications?unreadOnly=true&page=1&limit=50
  async list(params: ListNotificationsParams = {}): Promise<{ data: Notification[] }> {
    const response = await apiClient.get<any>('/notifications', {
      params: {
        unreadOnly: params.unreadOnly || false,
        page: params.page || 1,
        limit: params.limit || 50,
      },
    });
    const data = response.data;
    return { data: Array.isArray(data) ? data : data?.notifications || [] };
  },

  // Mark single notification as read
  // Backend: PUT /api/notifications/:id/read
  async markAsRead(id: string): Promise<Notification> {
    const response = await apiClient.put<Notification>(`/notifications/${id}/read`);
    return response.data;
  },

  // Mark all notifications as read
  // Backend: PUT /api/notifications/read-all
  async markAllAsRead(): Promise<void> {
    await apiClient.put('/notifications/read-all');
  },
};

export default notificationService;
