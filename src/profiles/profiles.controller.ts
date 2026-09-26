import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { count, eq } from 'drizzle-orm';
import { Inject } from '@nestjs/common';
import { DRIZZLE, type Database } from '../database/database.module.js';
import {
  profilePermissions,
  profiles,
  users,
} from '../database/schema/identity.js';
import { RequirePermission } from '../identity/access.guard.js';
import { PERMISSIONS } from '../identity/permission-catalog.js';
import { PermissionCacheService } from '../identity/permission-cache.service.js';
import {
  profileBodySchema,
  profilePermissionsSchema,
} from '../auth/auth.schemas.js';

@Controller('profiles')
export class ProfilesController {
  constructor(
    @Inject(DRIZZLE) private readonly database: Database,
    private readonly permissionCache: PermissionCacheService,
  ) {}

  @Get()
  @RequirePermission('profiles.read')
  async list() {
    return this.database
      .select({
        id: profiles.id,
        name: profiles.name,
        system: profiles.system,
      })
      .from(profiles);
  }

  @Post()
  @RequirePermission('profiles.manage')
  async create(@Body({ schema: profileBodySchema }) body: { name: string }) {
    const [created] = await this.database
      .insert(profiles)
      .values({ name: body.name, system: false })
      .returning({
        id: profiles.id,
        name: profiles.name,
        system: profiles.system,
      });
    return created;
  }

  @Patch(':id')
  @RequirePermission('profiles.manage')
  async rename(
    @Param('id') id: string,
    @Body({ schema: profileBodySchema }) body: { name: string },
  ) {
    const profile = await this.find(id);
    if (profile.system) {
      throw new ConflictException();
    }
    const [updated] = await this.database
      .update(profiles)
      .set({ name: body.name })
      .where(eq(profiles.id, id))
      .returning({
        id: profiles.id,
        name: profiles.name,
        system: profiles.system,
      });
    return updated;
  }

  @Delete(':id')
  @RequirePermission('profiles.manage')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    const profile = await this.find(id);
    if (profile.system) {
      throw new ConflictException();
    }
    const [assigned] = await this.database
      .select({ value: count() })
      .from(users)
      .where(eq(users.profileId, id));
    if (Number(assigned?.value ?? 0) > 0) {
      throw new ConflictException();
    }
    await this.database.delete(profiles).where(eq(profiles.id, id));
  }

  @Put(':id/permissions')
  @RequirePermission('profiles.manage')
  async replacePermissions(
    @Param('id') id: string,
    @Body({ schema: profilePermissionsSchema })
    body: { permissionKeys: string[] },
  ) {
    await this.find(id);
    const known = new Set<string>(PERMISSIONS.map((item) => item.key));
    const keys = body.permissionKeys.filter((key) => known.has(key));
    await this.database
      .delete(profilePermissions)
      .where(eq(profilePermissions.profileId, id));
    if (keys.length > 0) {
      await this.database.insert(profilePermissions).values(
        keys.map((permissionKey) => ({ profileId: id, permissionKey })),
      );
    }
    await this.permissionCache.forgetProfile(id);
    return { id, permissionKeys: keys };
  }

  private async find(id: string) {
    const [profile] = await this.database
      .select()
      .from(profiles)
      .where(eq(profiles.id, id));
    if (!profile) {
      throw new NotFoundException();
    }
    return profile;
  }
}
