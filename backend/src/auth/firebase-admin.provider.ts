import type { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import type { Env } from '../config/env.validation.js';

export const FIREBASE_AUTH = Symbol('FIREBASE_AUTH');

export const firebaseAuthProvider: Provider = {
  provide: FIREBASE_AUTH,
  useFactory: (config: ConfigService<Env, true>): Auth => {
    // firebase-admin keeps a process-global app registry — reuse the default app if one already
    // exists (e.g. across repeated TestingModule instantiations in the e2e suite) rather than
    // re-initializing, which firebase-admin otherwise rejects.
    if (getApps().length > 0) return getAuth(getApp());
    const serviceAccount = JSON.parse(config.get('FIREBASE_SERVICE_ACCOUNT', { infer: true }));
    const app = initializeApp({ credential: cert(serviceAccount) });
    return getAuth(app);
  },
  inject: [ConfigService],
};
