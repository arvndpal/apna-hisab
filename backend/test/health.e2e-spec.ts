import { describe, it, beforeEach, afterEach } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';

describe('Health (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /health returns ok', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        if (res.body.status !== 'ok') throw new Error('expected status ok');
      });
  });

  it('GET /auth/me without a token is rejected', () => {
    return request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('GET /sync/pull without a token is rejected', () => {
    return request(app.getHttpServer()).get('/sync/pull').query({ table: 'transactions' }).expect(401);
  });
});
