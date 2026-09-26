import { createTestApp } from './create-test-app.js';

describe('OpenAPI', () => {
  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL =
      'postgres://finance:finance@127.0.0.1:1/finance';
  });

  it('serves the documentation UI at GET /docs', async () => {
    const app = await createTestApp();

    const response = await app.inject({ method: 'GET', url: '/docs' });

    expect(response.statusCode).toBe(200);
    await app.close();
  });

  it('includes GET /health in the OpenAPI document', async () => {
    const app = await createTestApp();

    const response = await app.inject({ method: 'GET', url: '/docs-json' });
    const document = response.json() as {
      paths?: Record<string, { get?: unknown }>;
    };

    expect(response.statusCode).toBe(200);
    expect(document.paths?.['/health']?.get).toBeDefined();
    await app.close();
  });
});
