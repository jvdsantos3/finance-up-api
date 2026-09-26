import { createHash, randomUUID } from 'node:crypto';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Redis } from 'ioredis';
import { REDIS, useRedis } from '../redis/redis.module.js';
import {
  ACCESS_TTL_SECONDS,
  REFRESH_TTL_SECONDS,
} from './auth.constants.js';
import type { AccessPayload } from '../identity/access.guard.js';

@Injectable()
export class SessionService {
  constructor(
    private readonly jwt: JwtService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async issue(userId: string) {
    const jti = randomUUID();
    const refreshToken = randomUUID();
    const accessToken = await this.jwt.signAsync(
      { sub: userId, jti },
      { expiresIn: ACCESS_TTL_SECONDS },
    );
    await useRedis(this.redis, () =>
      this.redis.set(
        this.refreshKey(refreshToken),
        userId,
        'EX',
        REFRESH_TTL_SECONDS,
      ),
    );
    return {
      accessToken,
      expiresIn: ACCESS_TTL_SECONDS,
      refreshToken,
    };
  }

  async rotate(refreshToken: string) {
    const key = this.refreshKey(refreshToken);
    const userId = await useRedis(this.redis, () => this.redis.get(key));
    if (!userId) {
      throw new UnauthorizedException();
    }
    await useRedis(this.redis, () => this.redis.del(key));
    return this.issue(userId);
  }

  async revoke(accessToken: string, refreshToken?: string) {
    let payload: AccessPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessPayload>(accessToken);
    } catch {
      throw new UnauthorizedException();
    }
    const ttl = Math.max(payload.exp - Math.floor(Date.now() / 1000), 1);
    await useRedis(this.redis, () =>
      this.redis.set(`auth:blacklist:${payload.jti}`, '1', 'EX', ttl),
    );
    if (refreshToken) {
      await useRedis(this.redis, () =>
        this.redis.del(this.refreshKey(refreshToken)),
      );
    }
  }

  private refreshKey(refreshToken: string) {
    const hash = createHash('sha256').update(refreshToken).digest('hex');
    return `auth:refresh:${hash}`;
  }
}
