import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { Inject } from '@nestjs/common';
import { DRIZZLE, type Database } from '../database/database.module.js';
import { profiles } from '../database/schema/identity.js';
import { RequirePermission, type AccessPayload } from '../identity/access.guard.js';
import { allowsUnconditional, defineAbilityFor } from '../identity/ability.js';
import { PasswordService } from '../identity/password.service.js';
import { PermissionCacheService } from '../identity/permission-cache.service.js';
import { UsersRepository } from '../identity/users.repository.js';
import { createUserSchema, updateUserSchema } from '../auth/auth.schemas.js';
import { toUserResponse } from '../auth/user-response.js';

@Controller('users')
export class UsersController {
  constructor(
    private readonly users: UsersRepository,
    private readonly passwords: PasswordService,
    private readonly permissions: PermissionCacheService,
    @Inject(DRIZZLE) private readonly database: Database,
  ) {}

  @Get()
  @RequirePermission('users.read')
  async list() {
    const rows = await this.users.list();
    return rows.map(toUserResponse);
  }

  @Post()
  @RequirePermission('users.create')
  async create(
    @Body({ schema: createUserSchema })
    body: {
      email: string;
      password: string;
      name: string;
      profileId?: string;
    },
  ) {
    if (await this.users.findByEmail(body.email)) {
      throw new ConflictException();
    }
    const profileId = body.profileId ?? (await this.usuarioProfileId());
    await this.assertProfile(profileId);
    const user = await this.users.insert({
      email: body.email,
      name: body.name,
      passwordHash: await this.passwords.hash(body.password),
      profileId,
    });
    return toUserResponse(user);
  }

  @Patch(':id')
  async update(
    @Req() request: { user?: AccessPayload },
    @Param('id') id: string,
    @Body({ schema: updateUserSchema })
    body: { name?: string; password?: string; profileId?: string },
  ) {
    if (!body.name && !body.password && !body.profileId) {
      throw new BadRequestException();
    }
    const actorId = request.user?.sub;
    if (!actorId) {
      throw new ForbiddenException();
    }
    const keys = await this.permissions.keysForUser(actorId);
    const ability = defineAbilityFor(actorId, keys);
    if (
      (body.name || body.password) &&
      !allowsUnconditional(ability, 'users.update')
    ) {
      throw new ForbiddenException();
    }
    if (body.profileId && !allowsUnconditional(ability, 'users.assign-profile')) {
      throw new ForbiddenException();
    }
    const current = await this.users.findById(id);
    if (!current) {
      throw new NotFoundException();
    }
    if (body.profileId) {
      await this.assertProfile(body.profileId);
    }
    const updated = await this.users.update(id, {
      name: body.name,
      passwordHash: body.password
        ? await this.passwords.hash(body.password)
        : undefined,
      profileId: body.profileId,
    });
    if (body.profileId) {
      await this.permissions.forgetUser(id);
    }
    return toUserResponse(updated!);
  }

  private async usuarioProfileId() {
    const [profile] = await this.database
      .select()
      .from(profiles)
      .where(eq(profiles.name, 'Usuario'));
    if (!profile) {
      throw new Error('Perfil Usuario não foi semeado');
    }
    return profile.id;
  }

  private async assertProfile(profileId: string) {
    const [profile] = await this.database
      .select()
      .from(profiles)
      .where(eq(profiles.id, profileId));
    if (!profile) {
      throw new ForbiddenException();
    }
  }
}
