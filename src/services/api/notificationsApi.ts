import { authedFetch } from './client';

export type DevicePlatform = 'android' | 'ios';

export function registerToken(token: string, platform: DevicePlatform): Promise<{ registered: boolean }> {
  return authedFetch('/notifications/register-token', { method: 'POST', body: JSON.stringify({ token, platform }) });
}

export function deleteToken(token: string): Promise<{ deleted: boolean }> {
  return authedFetch('/notifications/register-token', { method: 'DELETE', body: JSON.stringify({ token }) });
}

export interface AdminUserResult {
  id: string;
  name: string | null;
  email: string | null;
}

export type SendNotificationTarget = { kind: 'all' } | { kind: 'user'; userIds: string[] };

/** Admin-only (backend 403s anyone whose profile isn't user_type='admin'). */
export async function searchUsers(query: string): Promise<AdminUserResult[]> {
  const result = await authedFetch<{ users: AdminUserResult[] }>(`/notifications/admin/users?q=${encodeURIComponent(query)}`);
  return result.users;
}

/** Admin-only. Total registered devices across all users — shown as the "All users" recipient-count preview. */
export async function getDeviceCount(): Promise<number> {
  const result = await authedFetch<{ count: number }>('/notifications/admin/device-count');
  return result.count;
}

/** Admin-only. */
export function sendNotification(
  title: string,
  body: string,
  target: SendNotificationTarget,
): Promise<{ sent: number; failed: number }> {
  return authedFetch('/notifications/admin/send', {
    method: 'POST',
    body: JSON.stringify(
      target.kind === 'all' ? { title, body, target: 'all' } : { title, body, target: 'user', userIds: target.userIds },
    ),
  });
}
