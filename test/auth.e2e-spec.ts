import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Client } from 'pg';
import { createTestApp } from './create-test-app.js';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

const execFileAsync = promisify(execFile);
const testDatabaseUrl =
  'postgres://finance:finance@localhost:5433/finance_test';

async function prepareDatabase() {
  const client = new Client({
    connectionString: 'postgres://finance:finance@localhost:5433/finance',
  });
  await client.connect();
  const existing = await client.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    ['finance_test'],
  );
  if (existing.rowCount === 0) {
    await client.query('CREATE DATABASE finance_test');
  }
  await client.end();

  const testClient = new Client({ connectionString: testDatabaseUrl });
  await testClient.connect();
  await testClient.query(`
    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'users'
      ) THEN
        TRUNCATE TABLE users, profile_permissions, profiles, permissions;
      END IF;
    END $$;
  `);
  await testClient.end();
}

function cookieValue(setCookie: string | string[] | undefined) {
  const header = Array.isArray(setCookie) ? setCookie.join(';') : (setCookie ?? '');
  return header.match(/refresh_token=([^;]+)/)?.[1];
}

describe('auth access', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    await execFileAsync('docker', ['compose', 'up', '-d', '--wait'], {
      cwd: process.cwd(),
    });
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = testDatabaseUrl;
    process.env.REDIS_URL = 'redis://127.0.0.1:6379';
    process.env.JWT_ACCESS_SECRET = 'test-access-secret-with-32-characters';
    process.env.ADMIN_EMAIL = 'admin@finance.test';
    process.env.ADMIN_PASSWORD = 'password-admin';
    await prepareDatabase();
    app = await createTestApp();
  }, 60_000);

  afterAll(async () => {
    await app.close();
  });

  it('seeds one admin and does not seed a second time', async () => {
    const first = await login('admin@finance.test', 'password-admin');
    const listed = await app.inject({
      method: 'GET',
      url: '/users',
      headers: { authorization: `Bearer ${first.accessToken}` },
    });
    expect(listed.statusCode).toBe(200);
    expect(listed.json()).toEqual([
      expect.objectContaining({
        email: 'admin@finance.test',
        profile: expect.objectContaining({ name: 'Admin' }),
      }),
    ]);

    await app.close();
    app = await createTestApp();
    const second = await app.inject({
      method: 'GET',
      url: '/users',
      headers: { authorization: `Bearer ${first.accessToken}` },
    });
    expect(second.statusCode).toBe(200);
    expect(second.json()).toHaveLength(1);
  });

  it('registers a Usuario and rejects a duplicate email', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: 'ana@finance.test',
        password: 'password-ana',
        name: 'Ana',
      },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      email: 'ana@finance.test',
      name: 'Ana',
      profile: { name: 'Usuario' },
    });
    expect(created.json()).not.toHaveProperty('passwordHash');

    const session = await login('ana@finance.test', 'password-ana');
    expect(session.accessToken).toEqual(expect.any(String));

    const duplicate = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: 'ana@finance.test',
        password: 'password-ana',
        name: 'Ana',
      },
    });
    expect(duplicate.statusCode).toBe(409);
  });

  it('rejects a short password', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: 'short@finance.test',
        password: 'short',
        name: 'Short',
      },
    });
    expect(response.statusCode).toBe(400);
  });

  it('returns the same 401 for an unknown email and a wrong password', async () => {
    const unknown = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'missing@finance.test', password: 'password-admin' },
    });
    const wrong = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'admin@finance.test', password: 'not-the-password' },
    });
    expect(unknown.statusCode).toBe(401);
    expect(wrong.statusCode).toBe(401);
    expect(unknown.json()).toEqual(wrong.json());
    expect(unknown.json()).toEqual({
      statusCode: 401,
      message: 'Credenciais inválidas',
    });
  });

  it('rotates the refresh cookie and rejects the previous one', async () => {
    const session = await login('admin@finance.test', 'password-admin');
    const refreshed = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      headers: { cookie: `refresh_token=${session.refreshToken}` },
    });
    expect(refreshed.statusCode).toBe(200);
    expect(refreshed.json()).toEqual({
      accessToken: expect.any(String),
      expiresIn: 900,
    });
    const nextRefresh = cookieValue(refreshed.headers['set-cookie']);
    expect(nextRefresh).toBeTruthy();
    expect(nextRefresh).not.toBe(session.refreshToken);

    const reused = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      headers: { cookie: `refresh_token=${session.refreshToken}` },
    });
    expect(reused.statusCode).toBe(401);
  });

  it('rejects the access token after logout', async () => {
    const session = await login('admin@finance.test', 'password-admin');
    const logout = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      headers: {
        authorization: `Bearer ${session.accessToken}`,
        cookie: `refresh_token=${session.refreshToken}`,
      },
    });
    expect(logout.statusCode).toBe(204);

    const me = await app.inject({
      method: 'GET',
      url: '/me',
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    expect(me.statusCode).toBe(401);
  });

  it('lets the authenticated user edit their own name and password and blocks profile changes', async () => {
    const session = await login('ana@finance.test', 'password-ana');
    const updated = await app.inject({
      method: 'PATCH',
      url: '/me',
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: { name: 'Ana Souza', password: 'password-ana-2' },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({ name: 'Ana Souza' });
    expect(updated.json()).not.toHaveProperty('passwordHash');

    const next = await login('ana@finance.test', 'password-ana-2');
    expect(next.accessToken).toEqual(expect.any(String));

    const rejected = await app.inject({
      method: 'PATCH',
      url: '/me',
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: { email: 'other@finance.test' },
    });
    expect(rejected.statusCode).toBe(400);

    const profileRejected = await app.inject({
      method: 'PATCH',
      url: '/me',
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: { profileId: '00000000-0000-4000-8000-000000000000' },
    });
    expect(profileRejected.statusCode).toBe(400);
  });

  it('forbids Usuario on admin routes and allows the seeded Admin', async () => {
    const usuario = await login('ana@finance.test', 'password-ana-2');
    const forbidden = await app.inject({
      method: 'GET',
      url: '/users',
      headers: { authorization: `Bearer ${usuario.accessToken}` },
    });
    expect(forbidden.statusCode).toBe(403);

    const admin = await login('admin@finance.test', 'password-admin');
    const allowed = await app.inject({
      method: 'GET',
      url: '/profiles',
      headers: { authorization: `Bearer ${admin.accessToken}` },
    });
    expect(allowed.statusCode).toBe(200);
    expect(allowed.json()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Admin' }),
        expect.objectContaining({ name: 'Usuario' }),
      ]),
    );
  });

  it('lets Admin use the identity catalog and blocks system profile changes', async () => {
    const admin = await login('admin@finance.test', 'password-admin');
    const auth = { authorization: `Bearer ${admin.accessToken}` };

    const createdUser = await app.inject({
      method: 'POST',
      url: '/users',
      headers: auth,
      payload: {
        email: 'bia@finance.test',
        password: 'password-bia',
        name: 'Bia',
      },
    });
    expect(createdUser.statusCode).toBe(201);
    expect(createdUser.json()).toMatchObject({
      profile: { name: 'Usuario' },
    });

    const renamed = await app.inject({
      method: 'PATCH',
      url: `/users/${createdUser.json().id}`,
      headers: auth,
      payload: { name: 'Beatriz' },
    });
    expect(renamed.statusCode).toBe(200);

    const createdProfile = await app.inject({
      method: 'POST',
      url: '/profiles',
      headers: auth,
      payload: { name: 'Analista' },
    });
    expect(createdProfile.statusCode).toBe(201);
    const analistaId = createdProfile.json().id as string;

    const assigned = await app.inject({
      method: 'PATCH',
      url: `/users/${createdUser.json().id}`,
      headers: auth,
      payload: { profileId: analistaId },
    });
    expect(assigned.statusCode).toBe(200);
    expect(assigned.json()).toMatchObject({
      profile: { id: analistaId, name: 'Analista' },
    });

    const profiles = await app.inject({
      method: 'GET',
      url: '/profiles',
      headers: auth,
    });
    const usuario = (
      profiles.json() as Array<{ id: string; name: string }>
    ).find((profile) => profile.name === 'Usuario');
    const adminProfile = (
      profiles.json() as Array<{ id: string; name: string }>
    ).find((profile) => profile.name === 'Admin');

    const deleteSystem = await app.inject({
      method: 'DELETE',
      url: `/profiles/${usuario?.id}`,
      headers: auth,
    });
    expect(deleteSystem.statusCode).toBe(409);

    const renameSystem = await app.inject({
      method: 'PATCH',
      url: `/profiles/${adminProfile?.id}`,
      headers: auth,
      payload: { name: 'Outro' },
    });
    expect(renameSystem.statusCode).toBe(409);

    const deleteInUse = await app.inject({
      method: 'DELETE',
      url: `/profiles/${analistaId}`,
      headers: auth,
    });
    expect(deleteInUse.statusCode).toBe(409);
  });

  it('returns 503 on login when redis is down', async () => {
    process.env.REDIS_URL = 'redis://127.0.0.1:1';
    const isolated = await createTestApp();
    const response = await isolated.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'admin@finance.test', password: 'password-admin' },
    });
    expect(response.statusCode).toBe(503);
    await isolated.close();
    process.env.REDIS_URL = 'redis://127.0.0.1:6379';
  });

  async function login(email: string, password: string) {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      accessToken: expect.any(String),
      expiresIn: 900,
    });
    const refreshToken = cookieValue(response.headers['set-cookie']);
    expect(refreshToken).toBeTruthy();
    expect(String(response.headers['set-cookie'])).toContain('HttpOnly');
    return { accessToken: response.json().accessToken as string, refreshToken };
  }
});
