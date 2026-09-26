import { Global, Module } from '@nestjs/common';
import { IdentitySeedService } from './identity-seed.service.js';
import { PasswordService } from './password.service.js';
import { PermissionCacheService } from './permission-cache.service.js';
import { UsersRepository } from './users.repository.js';

@Global()
@Module({
  providers: [
    PasswordService,
    IdentitySeedService,
    PermissionCacheService,
    UsersRepository,
  ],
  exports: [
    PasswordService,
    IdentitySeedService,
    PermissionCacheService,
    UsersRepository,
  ],
})
export class IdentityModule {}
