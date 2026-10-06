import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
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
    const db = { query: vi.fn().mockResolvedValue([{ id: 'user-1' }]) } as unknown as DatabaseService;
    const service = new AuthService(makeConfig(), jwt, db, firebaseAuth as unknown as Auth);
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

  it('refresh() rejects a valid refresh token once the profile has been deleted', async () => {
    const firebaseAuth = { verifyIdToken: vi.fn() };
    const db = { query: vi.fn().mockResolvedValue([]) } as unknown as DatabaseService;
    const service = new AuthService(makeConfig(), jwt, db, firebaseAuth as unknown as Auth);
    const refreshToken = jwt.sign({ sub: 'user-1', tokenVersion: 1 }, { secret: ENV.JWT_REFRESH_SECRET, expiresIn: '30d' });

    await expect(service.refresh(refreshToken)).rejects.toThrow(UnauthorizedException);
  });

  describe('deleteAccount()', () => {
    const profileRow = { id: 'user-1', firebase_uid: 'firebase-uid-1' };

    function setup(uid: string, deleteUser = vi.fn().mockResolvedValue(undefined)) {
      const txQuery = vi.fn().mockResolvedValue([]);
      const transaction = vi.fn(async (fn: (q: typeof txQuery) => Promise<unknown>) => fn(txQuery));
      const db = { query: vi.fn().mockResolvedValue([profileRow]), transaction } as unknown as DatabaseService;
      const firebaseAuth = { verifyIdToken: vi.fn().mockResolvedValue({ uid }), deleteUser };
      const service = new AuthService(makeConfig(), jwt, db, firebaseAuth as unknown as Auth);
      return { service, transaction, txQuery, deleteUser };
    }

    it('deletes every user-scoped table, children first, then the profile and the Firebase user', async () => {
      const { service, txQuery, deleteUser } = setup('firebase-uid-1');

      await service.deleteAccount('user-1', 'fresh-token');

      const statements = txQuery.mock.calls.map((c) => c[0] as string);
      expect(statements).toEqual([
        'DELETE FROM transactions WHERE user_id = $1',
        'DELETE FROM udhaar_entries WHERE user_id = $1',
        'DELETE FROM categories WHERE user_id = $1',
        'DELETE FROM udhaar_people WHERE user_id = $1',
        'DELETE FROM profiles WHERE id = $1',
      ]);
      expect(txQuery.mock.calls.every((c) => (c[1] as unknown[])[0] === 'user-1')).toBe(true);
      expect(deleteUser).toHaveBeenCalledWith('firebase-uid-1');
    });

    it('refuses a fresh token for a different Google account', async () => {
      const { service, transaction } = setup('someone-else');

      await expect(service.deleteAccount('user-1', 'fresh-token')).rejects.toThrow(ForbiddenException);
      expect(transaction).not.toHaveBeenCalled();
    });

    it('refuses an invalid re-auth token', async () => {
      const { service, transaction } = setup('firebase-uid-1');
      (service as unknown as { firebaseAuth: { verifyIdToken: ReturnType<typeof vi.fn> } }).firebaseAuth.verifyIdToken.mockRejectedValue(new Error('bad'));

      await expect(service.deleteAccount('user-1', 'garbage')).rejects.toThrow(UnauthorizedException);
      expect(transaction).not.toHaveBeenCalled();
    });

    it('still succeeds when removing the Firebase user fails after the data is gone', async () => {
      const { service, txQuery } = setup('firebase-uid-1', vi.fn().mockRejectedValue(new Error('network')));

      await expect(service.deleteAccount('user-1', 'fresh-token')).resolves.toBeUndefined();
      expect(txQuery).toHaveBeenCalledTimes(5);
    });
  });
});
