import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import type { Auth } from 'firebase-admin/auth';
import { AuthService } from './auth.service.js';
import { DatabaseService } from '../database/database.service.js';

const ENV: Record<string, string> = {
  JWT_ACCESS_SECRET: 'access-secret',
  JWT_REFRESH_SECRET: 'refresh-secret',
  JWT_ACCESS_TTL: '15m',
  JWT_REFRESH_TTL: '30d',
};

function makeConfig(): ConfigService {
  return { get: (key: string) => ENV[key] } as unknown as ConfigService;
}

/** `query` resolves with `existingRows` on the first call (the firebase_uid lookup) and `row` on the second (insert/update ... RETURNING). */
function makeDbStub(existingRows: Record<string, unknown>[], row: Record<string, unknown> | null) {
  const query = vi.fn().mockResolvedValueOnce(existingRows).mockResolvedValue(row ? [row] : []);
  return { query } as unknown as DatabaseService;
}

describe('AuthService', () => {
  let jwt: JwtService;

  beforeEach(() => {
    jwt = new JwtService();
  });

  it('rejects an invalid Firebase ID token', async () => {
    const firebaseAuth = { verifyIdToken: vi.fn().mockRejectedValue(new Error('bad token')) };
    const service = new AuthService(makeConfig(), jwt, makeDbStub([], null), firebaseAuth as unknown as Auth);

    await expect(service.signInWithGoogle('garbage')).rejects.toThrow(UnauthorizedException);
  });

  it('issues an access and refresh token for a signed-in profile', async () => {
    const profileRow = {
      id: 'user-1',
      firebase_uid: 'firebase-uid-1',
      email: 'a@b.com',
      name: 'A B',
      avatar_url: null,
      language: 'en',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    };
    const firebaseAuth = {
      verifyIdToken: vi.fn().mockResolvedValue({ uid: 'firebase-uid-1', email: 'a@b.com', name: 'A B', picture: null }),
    };
    const service = new AuthService(makeConfig(), jwt, makeDbStub([], profileRow), firebaseAuth as unknown as Auth);

    const { tokens, profile } = await service.signInWithGoogle('real-looking-token');

    expect(profile.id).toBe('user-1');
    expect(typeof tokens.accessToken).toBe('string');
    expect(typeof tokens.refreshToken).toBe('string');

    const decoded = jwt.decode(tokens.accessToken) as { sub: string };
    expect(decoded.sub).toBe('user-1');
  });

  it('updates (not inserts) when a profile already exists for that firebase_uid', async () => {
    const existing = { id: 'user-1', firebase_uid: 'firebase-uid-1' };
    const updated = {
      id: 'user-1',
      firebase_uid: 'firebase-uid-1',
      email: 'new@b.com',
      name: 'New Name',
      avatar_url: null,
      language: 'en',
      created_at: '',
      updated_at: '',
    };
    const firebaseAuth = {
      verifyIdToken: vi.fn().mockResolvedValue({ uid: 'firebase-uid-1', email: 'new@b.com', name: 'New Name', picture: null }),
    };
    const db = makeDbStub([existing], updated);
    const service = new AuthService(makeConfig(), jwt, db, firebaseAuth as unknown as Auth);

    const { profile } = await service.signInWithGoogle('token');

    expect(profile.email).toBe('new@b.com');
    expect((db.query as any).mock.calls[1][0]).toMatch(/^UPDATE profiles/);
  });

  it('refresh() rejects a garbage refresh token', async () => {
    const firebaseAuth = { verifyIdToken: vi.fn() };
    const service = new AuthService(makeConfig(), jwt, makeDbStub([], null), firebaseAuth as unknown as Auth);

    await expect(service.refresh('not-a-jwt')).rejects.toThrow(UnauthorizedException);
  });

  it('refresh() issues a new access token for a valid refresh token', async () => {
    const firebaseAuth = { verifyIdToken: vi.fn() };
    const service = new AuthService(makeConfig(), jwt, makeDbStub([], null), firebaseAuth as unknown as Auth);
    const refreshToken = jwt.sign({ sub: 'user-1', tokenVersion: 1 }, { secret: ENV.JWT_REFRESH_SECRET, expiresIn: '30d' });

    const tokens = await service.refresh(refreshToken);

    const decoded = jwt.decode(tokens.accessToken) as { sub: string };
    expect(decoded.sub).toBe('user-1');
  });

  it('refresh() rejects a refresh token signed with the wrong secret', async () => {
    const firebaseAuth = { verifyIdToken: vi.fn() };
    const service = new AuthService(makeConfig(), jwt, makeDbStub([], null), firebaseAuth as unknown as Auth);
    const forgedToken = jwt.sign({ sub: 'user-1', tokenVersion: 1 }, { secret: 'wrong-secret', expiresIn: '30d' });

    await expect(service.refresh(forgedToken)).rejects.toThrow(UnauthorizedException);
  });

  it('getProfile() throws when no row is found', async () => {
    const firebaseAuth = { verifyIdToken: vi.fn() };
    const db = { query: vi.fn().mockResolvedValue([]) } as unknown as DatabaseService;
    const service = new AuthService(makeConfig(), jwt, db, firebaseAuth as unknown as Auth);

    await expect(service.getProfile('missing-user')).rejects.toThrow(UnauthorizedException);
  });
});
