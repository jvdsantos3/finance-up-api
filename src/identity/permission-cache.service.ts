import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { Redis } from 'ioredis';
import { DRIZZLE, type Database } from '../database/database.module.js';
import {
  profilePermissions,
  users,
} from '../database/schema/identity.js';
import { REDIS, useRedis } from '../redis/redis.module.js';

const CACHE_TTL_SECONDS = 60;

@Injectable()
export class PermissionCacheService {
  constructor(
    @Inject(DRIZZLE) private readonly database: Database,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async keysForUser(userId: string): Promise<string[]> {
    const cacheKey = this.cacheKey(userId);
    const cached = await useRedis(this.redis, () => this.redis.get(cacheKey));
    if (cached) {
      return JSON.parse(cached) as string[];
    }

    const rows = await this.database
      .select({ permissionKey: profilePermissions.permissionKey })
      .from(users)
      .innerJoin(
        profilePermissions,
        eq(users.profileId, profilePermissions.profileId),
      )
      .where(eq(users.id, userId));
    const keys = rows.map((row) => row.permissionKey);
    await useRedis(this.redis, () =>
      this.redis.set(cacheKey, JSON.stringify(keys), 'EX', CACHE_TTL_SECONDS),
    );
    return keys;
  }

  async forgetUser(userId: string) {
    await useRedis(this.redis, () => this.redis.del(this.cacheKey(userId)));
  }

  async forgetProfile(profileId: string) {
    const rows = await this.database
      .select({ id: users.id })
      .from(users)
      .where(eq(users.profileId, profileId));
    await Promise.all(rows.map((row) => this.forgetUser(row.id)));
  }

  private cacheKey(userId: string) {
    return `auth:perms:${userId}`;
  }
}
