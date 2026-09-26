import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { Inject } from '@nestjs/common';
import { DRIZZLE, type Database } from '../database/database.module.js';
import { profiles } from '../database/schema/identity.js';
import { PasswordService } from '../identity/password.service.js';
import { UsersRepository } from '../identity/users.repository.js';
import { SYSTEM_PROFILES } from '../identity/permission-catalog.js';
import { INVALID_CREDENTIALS } from './auth.constants.js';
import { SessionService } from './session.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersRepository,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
    @Inject(DRIZZLE) private readonly database: Database,
  ) {}

  async register(input: { email: string; password: string; name: string }) {
    const existing = await this.users.findByEmail(input.email);
    if (existing) {
      throw new ConflictException();
    }
    const [profile] = await this.database
      .select()
      .from(profiles)
      .where(eq(profiles.name, SYSTEM_PROFILES.usuario));
    if (!profile) {
      throw new Error('Perfil Usuario não foi semeado');
    }
    const user = await this.users.insert({
      email: input.email,
      name: input.name,
      passwordHash: await this.passwords.hash(input.password),
      profileId: profile.id,
    });
    return user;
  }

  async login(input: { email: string; password: string }) {
    const user = await this.users.findByEmail(input.email);
    const valid =
      user !== undefined &&
      (await this.passwords.verify(user.passwordHash, input.password));
    if (!user || !valid) {
      throw new UnauthorizedException({
        statusCode: 401,
        message: INVALID_CREDENTIALS,
      });
    }
    return this.sessions.issue(user.id);
  }
}
