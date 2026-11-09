import { apiFetch } from '@/lib/api';
import { getApiBaseUrl } from '@/lib/api-base';

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

export type NotificationPage = { items: AppNotification[]; unread: number; hasMore: boolean };

export const notificationsApi = {
  list: (before?: string) =>
    apiFetch<NotificationPage>(
      `/notifications?limit=20${before ? `&before=${encodeURIComponent(before)}` : ''}`,
    ),
  markRead: (id: string) =>
    apiFetch<{ unread: number }>(`/notifications/${id}/read`, { method: 'POST' }),
  markAllRead: () => apiFetch<{ unread: number }>('/notifications/read-all', { method: 'POST' }),
  streamUrl: () => `${getApiBaseUrl()}/notifications/stream`,
};
