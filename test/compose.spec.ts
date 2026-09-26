import { readFileSync } from 'node:fs';

describe('docker compose', () => {
  it('publishes the same postgres credentials as .env.example', () => {
    const env = readFileSync('.env.example', 'utf8');
    const compose = readFileSync('docker-compose.yml', 'utf8');
    const databaseUrl = env
      .split('\n')
      .find((line) => line.startsWith('DATABASE_URL='))
      ?.slice('DATABASE_URL='.length);

    const url = new URL(databaseUrl ?? '');

    expect(url.username).toBe('finance');
    expect(url.password).toBe('finance');
    expect(url.hostname).toBe('localhost');
    expect(url.port).toBe('5432');
    expect(url.pathname).toBe('/finance');
    expect(compose).toContain(`POSTGRES_USER: ${url.username}`);
    expect(compose).toContain(`POSTGRES_PASSWORD: ${url.password}`);
    expect(compose).toContain(`POSTGRES_DB: ${url.pathname.slice(1)}`);
    expect(compose).toContain(`${url.port}:5432`);
  });
});
