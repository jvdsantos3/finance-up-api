import { execFile, spawn } from 'node:child_process';
import net from 'node:net';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

function childEnv(overrides: Record<string, string | undefined>) {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: 'test',
    ...overrides,
  };
  delete env.VITEST;
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete env[key];
    }
  }
  return env;
}

function runMain(env: NodeJS.ProcessEnv) {
  const child = spawn(process.execPath, ['dist/main.js'], {
    cwd: process.cwd(),
    env,
  });
  let output = '';
  child.stdout.on('data', (chunk: Buffer) => {
    output += chunk.toString();
  });
  child.stderr.on('data', (chunk: Buffer) => {
    output += chunk.toString();
  });
  const exited = new Promise<number | null>((resolve) => {
    child.on('exit', resolve);
  });
  const timeout = new Promise<number | null>((resolve) => {
    setTimeout(() => {
      child.kill();
      resolve(null);
    }, 10_000);
  });
  return Promise.race([exited, timeout]).then((code) => ({ code, output }));
}

describe('bootstrap', () => {
  beforeAll(async () => {
    await execFileAsync('pnpm', ['build'], { cwd: process.cwd() });
  }, 60_000);

  it('exits without listening when REDIS_URL is missing', async () => {
    const result = await runMain(
      childEnv({
        DATABASE_URL: 'postgres://finance:finance@127.0.0.1:1/finance',
        REDIS_URL: undefined,
        JWT_ACCESS_SECRET: 'test-access-secret-with-32-characters',
        ADMIN_EMAIL: 'admin@finance.test',
        ADMIN_PASSWORD: 'password-admin',
      }),
    );

    expect(result.code).not.toBe(0);
    expect(result.output).not.toContain('Nest application successfully started');
  });

  it('exits without listening when ADMIN_EMAIL is missing', async () => {
    const result = await runMain(
      childEnv({
        DATABASE_URL: 'postgres://finance:finance@127.0.0.1:1/finance',
        REDIS_URL: 'redis://127.0.0.1:6379',
        JWT_ACCESS_SECRET: 'test-access-secret-with-32-characters',
        ADMIN_EMAIL: undefined,
        ADMIN_PASSWORD: 'password-admin',
      }),
    );

    expect(result.code).not.toBe(0);
    expect(result.output).not.toContain('Nest application successfully started');
  });

  it('exits without listening when ADMIN_PASSWORD is missing', async () => {
    const result = await runMain(
      childEnv({
        DATABASE_URL: 'postgres://finance:finance@127.0.0.1:1/finance',
        REDIS_URL: 'redis://127.0.0.1:6379',
        JWT_ACCESS_SECRET: 'test-access-secret-with-32-characters',
        ADMIN_EMAIL: 'admin@finance.test',
        ADMIN_PASSWORD: undefined,
      }),
    );

    expect(result.code).not.toBe(0);
    expect(result.output).not.toContain('Nest application successfully started');
  });

  it('exits without listening when DATABASE_URL is missing', async () => {
    const result = await runMain(childEnv({ DATABASE_URL: undefined }));

    expect(result.code).not.toBe(0);
    expect(result.output).not.toContain('Nest application successfully started');
  });

  it('exits when the http port is already in use', async () => {
    const server = net.createServer();
    await new Promise<void>((resolve) => {
      server.listen(0, '0.0.0.0', () => resolve());
    });
    const address = server.address();
    if (address === null || typeof address === 'string') {
      throw new Error('failed to bind a local port');
    }

    const result = await runMain(
      childEnv({
        DATABASE_URL: 'postgres://finance:finance@127.0.0.1:1/finance',
        REDIS_URL: 'redis://127.0.0.1:6379',
        JWT_ACCESS_SECRET: 'test-access-secret-with-32-characters',
        ADMIN_EMAIL: 'admin@finance.test',
        ADMIN_PASSWORD: 'password-admin',
        PORT: String(address.port),
      }),
    );

    server.close();
    expect(result.code).not.toBe(0);
    expect(result.output).toContain('EADDRINUSE');
  });
});
