import { envSchema } from './env.schema.js';

describe('envSchema', () => {
  it('fails when DATABASE_URL is missing', () => {
    const result = envSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it('fails when DATABASE_URL is empty', () => {
    const result = envSchema.safeParse({ DATABASE_URL: '' });

    expect(result.success).toBe(false);
  });

  it('fails when REDIS_URL is missing', () => {
    const result = envSchema.safeParse({
      DATABASE_URL: 'postgres://finance:finance@localhost:5433/finance',
      JWT_ACCESS_SECRET: 'test-access-secret-with-32-characters',
      ADMIN_EMAIL: 'admin@finance.test',
      ADMIN_PASSWORD: 'password-admin',
    });

    expect(result.success).toBe(false);
  });
});
