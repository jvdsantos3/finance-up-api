import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { promisify } from 'node:util';
import { createTestApp } from './create-test-app.js';

const execFileAsync = promisify(execFile);
const unreachableDatabaseUrl = 'postgres://finance:finance@127.0.0.1:1/finance';

function exampleDatabaseUrl() {
  const line = readFileSync('.env.example', 'utf8')
    .split('\n')
    .find((entry) => entry.startsWith('DATABASE_URL='));
  return line?.slice('DATABASE_URL='.length) ?? '';
}

describe('GET /health', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await execFileAsync('docker', ['compose', 'up', '-d', '--wait'], {
      cwd: process.cwd(),
    });
  }, 60_000);

  it('returns 200 when postgres accepts connections', async () => {
    process.env.DATABASE_URL = exampleDatabaseUrl();
    const app = await createTestApp();

    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok', database: 'up' });
    await app.close();
  });

  it('returns 503 when postgres is unreachable', async () => {
    process.env.DATABASE_URL = unreachableDatabaseUrl;
    const app = await createTestApp();

    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ status: 'error', database: 'down' });
    await app.close();
  });
});
