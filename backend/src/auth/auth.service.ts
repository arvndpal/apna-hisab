import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Auth } from 'firebase-admin/auth';
import { DatabaseService } from '../database/database.service.js';
import type { Env } from '../config/env.validation.js';
import { profileFromRow, type Profile, type ProfileRow } from './profile.types.js';
import { FIREBASE_AUTH } from './firebase-admin.provider.js';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface RefreshTokenPayload {
  sub: string;
  tokenVersion: number;
}

interface FirebaseIdentity {
  uid: string;
  email: string | null;
  name: string | null;
  picture: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly jwt: JwtService,
    private readonly db: DatabaseService,
    @Inject(FIREBASE_AUTH) private readonly firebaseAuth: Auth,
  ) {}

  /** Verifies the Firebase ID token the app got after Google Sign-In, upserts the profile, issues our own JWTs. */
  async signInWithGoogle(firebaseIdToken: string): Promise<{ tokens: TokenPair; profile: Profile }> {
    const identity = await this.verifyFirebaseIdToken(firebaseIdToken);
    const profile = await this.upsertProfile(identity);
    const tokens = this.issueTokens(profile.id);
    return { tokens, profile };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    let payload: RefreshTokenPayload;
    try {
      payload = this.jwt.verify<RefreshTokenPayload>(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }
    return this.issueTokens(payload.sub);
  }

  async getProfile(userId: string): Promise<Profile> {
    const rows = await this.db.query<ProfileRow>('SELECT * FROM profiles WHERE id = $1', [userId]);
    if (!rows[0]) throw new UnauthorizedException('Profile not found');
    return profileFromRow(rows[0]);
  }

  private async verifyFirebaseIdToken(idToken: string): Promise<FirebaseIdentity> {
    let decoded;
    try {
      decoded = await this.firebaseAuth.verifyIdToken(idToken);
    } catch {
      throw new UnauthorizedException('Invalid sign-in token');
    }
    return { uid: decoded.uid, email: decoded.email ?? null, name: decoded.name ?? null, picture: decoded.picture ?? null };
  }

  private async upsertProfile(identity: FirebaseIdentity): Promise<Profile> {
    const existing = await this.db.query<ProfileRow>('SELECT * FROM profiles WHERE firebase_uid = $1', [identity.uid]);

    if (existing[0]) {
      const rows = await this.db.query<ProfileRow>(
        `UPDATE profiles SET email = $1, name = $2, avatar_url = $3, updated_at = now()
         WHERE id = $4
         RETURNING *`,
        [identity.email, identity.name, identity.picture, existing[0].id],
      );
      if (!rows[0]) throw new UnauthorizedException('Could not update profile');
      return profileFromRow(rows[0]);
    }

    const rows = await this.db.query<ProfileRow>(
      `INSERT INTO profiles (firebase_uid, email, name, avatar_url, language)
       VALUES ($1, $2, $3, $4, 'en')
       RETURNING *`,
      [identity.uid, identity.email, identity.name, identity.picture],
    );
    if (!rows[0]) throw new UnauthorizedException('Could not create profile');
    return profileFromRow(rows[0]);
  }

  private issueTokens(userId: string): TokenPair {
    const accessToken = this.jwt.sign(
      { sub: userId },
      { secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }), expiresIn: this.config.get('JWT_ACCESS_TTL', { infer: true }) },
    );
    const refreshToken = this.jwt.sign(
      { sub: userId, tokenVersion: 1 },
      { secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }), expiresIn: this.config.get('JWT_REFRESH_TTL', { infer: true }) },
    );
    return { accessToken, refreshToken };
  }
}
