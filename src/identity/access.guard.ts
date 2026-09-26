import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Inject } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { defineAbilityFor, allowsUnconditional } from './ability.js';
import { PermissionCacheService } from './permission-cache.service.js';
import type { PermissionKey } from './permission-catalog.js';
import { REDIS, useRedis } from '../redis/redis.module.js';

export const IS_PUBLIC = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const REQUIRE_PERMISSION = 'requirePermission';
export const RequirePermission = (permission: PermissionKey) =>
  SetMetadata(REQUIRE_PERMISSION, permission);

export type AccessPayload = {
  sub: string;
  jti: string;
  exp: number;
};

@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly permissions: PermissionCacheService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      url: string;
      user?: AccessPayload;
    }>();
    const path = request.url.split('?')[0] ?? '';
    if (path === '/health' || path.startsWith('/docs')) {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      if (isPublic) {
        return true;
      }
      throw new UnauthorizedException();
    }

    let payload: AccessPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessPayload>(header.slice('Bearer '.length));
    } catch {
      throw new UnauthorizedException();
    }

    const blacklisted = await useRedis(this.redis, () =>
      this.redis.get(`auth:blacklist:${payload.jti}`),
    );
    if (blacklisted) {
      throw new UnauthorizedException();
    }
    request.user = payload;
    if (isPublic) {
      return true;
    }

    const required = this.reflector.getAllAndOverride<PermissionKey | undefined>(
      REQUIRE_PERMISSION,
      [context.getHandler(), context.getClass()],
    );
    if (!required) {
      return true;
    }

    const keys = await this.permissions.keysForUser(payload.sub);
    const ability = defineAbilityFor(payload.sub, keys);
    if (!allowsUnconditional(ability, required)) {
      throw new ForbiddenException();
    }
    return true;
  }
}
