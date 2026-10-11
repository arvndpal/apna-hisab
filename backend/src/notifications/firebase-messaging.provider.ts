import type { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';
import type { Env } from '../config/env.validation.js';

export const FIREBASE_MESSAGING = Symbol('FIREBASE_MESSAGING');

/**
 * Same app-reuse pattern as auth/firebase-admin.provider.ts — firebase-admin keeps a process-global
 * app registry, so whichever of the two providers (this one or AuthModule's) initializes first
 * wins; the other just attaches to the same app via getApp() rather than re-initializing, which
 * firebase-admin otherwise rejects.
 */
export const firebaseMessagingProvider: Provider = {
  provide: FIREBASE_MESSAGING,
  useFactory: (config: ConfigService<Env, true>): Messaging => {
    if (getApps().length > 0) return getMessaging(getApp());
    const serviceAccount = JSON.parse(config.get('FIREBASE_SERVICE_ACCOUNT', { infer: true }));
    const app = initializeApp({ credential: cert(serviceAccount) });
    return getMessaging(app);
  },
  inject: [ConfigService],
};
