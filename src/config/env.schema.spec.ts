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
});
