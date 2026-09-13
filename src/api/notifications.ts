import { apiClient } from "./client";

export interface NotificationOut {
  id: string;
  channel: string;
  priority: string;
  title: string;
  body: string;
  status: string;
  read: boolean;
  created_at: string;
}

export const getMyNotifications = async (unreadOnly = false): Promise<NotificationOut[]> => {
  const response = await apiClient.get<NotificationOut[]>("/api/notifications/me", {
    params: { unread_only: unreadOnly },
  });
  return response.data;
};

export const markNotificationRead = async (id: string): Promise<NotificationOut> => {
  const response = await apiClient.patch<NotificationOut>(`/api/notifications/${id}/read`);
  return response.data;
};
