import { Test } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { vi } from 'vitest';
import { setupApp } from '../src/setup-app.js';

export async function createTestApp() {
  vi.resetModules();
  const { AppModule } = await import('../src/app.module.js');
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleFixture.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter(),
  );
  setupApp(app);
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}
