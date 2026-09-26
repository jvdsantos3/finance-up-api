import { Test } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { vi } from 'vitest';
import { setupApp } from '../src/setup-app.js';

export async function createTestApp() {
  process.env.REDIS_URL ??= 'redis://127.0.0.1:6379';
  process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-with-32-characters';
  process.env.ADMIN_EMAIL ??= 'admin@finance.test';
  process.env.ADMIN_PASSWORD ??= 'password-admin';
  process.env.FRONTEND_ORIGIN ??= 'http://localhost:5173';
  vi.resetModules();
  const { AppModule } = await import('../src/app.module.js');
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleFixture.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter(),
  );
  await setupApp(app);
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}
