import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
  ForbiddenException,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { subject } from '@casl/ability';
import { Public } from '../identity/access.guard.js';
import type { AccessPayload } from '../identity/access.guard.js';
import { defineAbilityFor } from '../identity/ability.js';
import { PasswordService } from '../identity/password.service.js';
import { PermissionCacheService } from '../identity/permission-cache.service.js';
import { UsersRepository } from '../identity/users.repository.js';
import { REFRESH_COOKIE } from './auth.constants.js';
import { clearRefreshCookie, setRefreshCookie } from './cookie.js';
import { loginSchema, registerSchema, updateMeSchema } from './auth.schemas.js';
import { AuthService } from './auth.service.js';
import { SessionService } from './session.service.js';
import { toUserResponse } from './user-response.js';

type AuthRequest = FastifyRequest & { user?: AccessPayload };

@Controller()
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
    private readonly users: UsersRepository,
    private readonly passwords: PasswordService,
    private readonly permissions: PermissionCacheService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('auth/register')
  async register(@Body({ schema: registerSchema }) body: {
    email: string;
    password: string;
    name: string;
  }) {
    return toUserResponse(await this.auth.register(body));
  }

  @Public()
  @HttpCode(200)
  @Post('auth/login')
  async login(
    @Body({ schema: loginSchema }) body: { email: string; password: string },
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const session = await this.auth.login(body);
    setRefreshCookie(reply, session.refreshToken, this.secure());
    return { accessToken: session.accessToken, expiresIn: session.expiresIn };
  }

  @Public()
  @HttpCode(200)
  @Post('auth/refresh')
  async refresh(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const current = request.cookies?.[REFRESH_COOKIE];
    if (!current) {
      throw new UnauthorizedException();
    }
    const session = await this.sessions.rotate(current);
    setRefreshCookie(reply, session.refreshToken, this.secure());
    return { accessToken: session.accessToken, expiresIn: session.expiresIn };
  }

  @HttpCode(204)
  @Post('auth/logout')
  async logout(
    @Req() request: AuthRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const header = request.headers.authorization ?? '';
    await this.sessions.revoke(
      header.slice('Bearer '.length),
      request.cookies?.[REFRESH_COOKIE],
    );
    clearRefreshCookie(reply, this.secure());
  }

  @Get('me')
  async me(@Req() request: AuthRequest) {
    const user = await this.currentUser(request);
    const keys = await this.permissions.keysForUser(user.id);
    const ability = defineAbilityFor(user.id, keys);
    if (!ability.can('read', subject('User', { id: user.id }))) {
      throw new ForbiddenException();
    }
    return toUserResponse(user);
  }

  @Patch('me')
  async updateMe(
    @Req() request: AuthRequest,
    @Body({ schema: updateMeSchema }) body: { name?: string; password?: string },
  ) {
    const user = await this.currentUser(request);
    const keys = await this.permissions.keysForUser(user.id);
    const ability = defineAbilityFor(user.id, keys);
    if (!ability.can('update', subject('User', { id: user.id }))) {
      throw new ForbiddenException();
    }
    const updated = await this.users.update(user.id, {
      name: body.name,
      passwordHash: body.password
        ? await this.passwords.hash(body.password)
        : undefined,
    });
    return toUserResponse(updated!);
  }

  private async currentUser(request: AuthRequest) {
    const userId = request.user?.sub;
    if (!userId) {
      throw new UnauthorizedException();
    }
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }

  private secure() {
    return this.config.get<string>('NODE_ENV') === 'production';
  }
}
