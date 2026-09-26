import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { count, eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { ConfigService } from '@nestjs/config';
import { DRIZZLE, type Database } from '../database/database.module.js';
import {
  permissions,
  profilePermissions,
  profiles,
  users,
} from '../database/schema/identity.js';
import { PERMISSIONS, SYSTEM_PROFILES } from './permission-catalog.js';
import { PasswordService } from './password.service.js';

@Injectable()
export class IdentitySeedService implements OnModuleInit {
  private readonly logger = new Logger(IdentitySeedService.name);

  constructor(
    @Inject(DRIZZLE) private readonly database: Database,
    private readonly config: ConfigService,
    private readonly passwords: PasswordService,
  ) {}

  async onModuleInit() {
    try {
      await this.run();
    } catch (error) {
      if (!isDatabaseUnavailable(error)) {
        throw error;
      }
      this.logger.error(
        'Postgres indisponível no boot; /health vai reportar database down',
      );
    }
  }

  async run() {
    await migrate(this.database, { migrationsFolder: 'drizzle' });

    await this.database
      .insert(permissions)
      .values(PERMISSIONS.map((permission) => ({ key: permission.key })))
      .onConflictDoNothing();

    await this.database
      .insert(profiles)
      .values([
        { name: SYSTEM_PROFILES.admin, system: true },
        { name: SYSTEM_PROFILES.usuario, system: true },
      ])
      .onConflictDoNothing();

    const adminProfile = await this.profileByName(SYSTEM_PROFILES.admin);
    await this.database
      .delete(profilePermissions)
      .where(eq(profilePermissions.profileId, adminProfile.id));
    await this.database.insert(profilePermissions).values(
      PERMISSIONS.map((permission) => ({
        profileId: adminProfile.id,
        permissionKey: permission.key,
      })),
    );

    const [existing] = await this.database.select({ value: count() }).from(users);
    if (Number(existing?.value ?? 0) > 0) {
      return;
    }

    const passwordHash = await this.passwords.hash(
      this.config.getOrThrow<string>('ADMIN_PASSWORD'),
    );
    await this.database.insert(users).values({
      email: this.config.getOrThrow<string>('ADMIN_EMAIL').toLowerCase(),
      name: 'Admin',
      passwordHash,
      profileId: adminProfile.id,
    });
  }

  private async profileByName(name: string) {
    const [profile] = await this.database
      .select()
      .from(profiles)
      .where(eq(profiles.name, name));
    if (!profile) {
      throw new Error(`Perfil ${name} não foi semeado`);
    }
    return profile;
  }
}

function isDatabaseUnavailable(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && typeof current === 'object' && !seen.has(current)) {
    seen.add(current);
    const record = current as {
      code?: string;
      message?: string;
      cause?: unknown;
    };
    if (
      record.code === 'ECONNREFUSED' ||
      record.code === 'ENOTFOUND' ||
      record.code === 'ETIMEDOUT' ||
      record.code === 'ECONNRESET'
    ) {
      return true;
    }
    if (
      typeof record.message === 'string' &&
      /ECONNREFUSED|ENOTFOUND|timeout exceeded when trying to connect/i.test(
        record.message,
      )
    ) {
      return true;
    }
    current = record.cause;
  }
  return false;
}
