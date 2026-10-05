/** Fetch wrapper for this app's own NestJS backend (docs/ARCHITECTURE.md §0) — never Supabase directly. */
import { BACKEND_URL } from '@env';
import * as session from '../auth/session';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string | string[] };
    if (Array.isArray(body.message)) return body.message.join(', ');
    return body.message ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

/** Unauthenticated call — used only for POST /auth/google and POST /auth/refresh. */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) throw new ApiError(res.status, await parseError(res));
  return res.json() as Promise<T>;
}

/** Authenticated call — attaches the stored access token; on 401 refreshes once and retries once. */
export async function authedFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const tokens = await session.getTokens();
  if (!tokens) throw new ApiError(401, 'Not signed in');

  const call = (accessToken: string) =>
    fetch(`${BACKEND_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}`, ...init?.headers },
    });

  let res = await call(tokens.accessToken);

  if (res.status === 401) {
    try {
      const refreshed = await apiFetch<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });
      await session.saveTokens(refreshed);
      res = await call(refreshed.accessToken);
    } catch {
      await session.clearTokens();
      throw new ApiError(401, 'Session expired');
    }
  }

  if (!res.ok) throw new ApiError(res.status, await parseError(res));
  return res.json() as Promise<T>;
}
