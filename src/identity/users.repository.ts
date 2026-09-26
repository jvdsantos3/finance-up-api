import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../database/database.module.js';
import { profiles, users } from '../database/schema/identity.js';

export type UserRecord = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  profileId: string;
  profileName: string;
};

@Injectable()
export class UsersRepository {
  constructor(@Inject(DRIZZLE) private readonly database: Database) {}

  async findByEmail(email: string): Promise<UserRecord | undefined> {
    const [row] = await this.database
      .select(this.columns())
      .from(users)
      .innerJoin(profiles, eq(users.profileId, profiles.id))
      .where(eq(users.email, email.toLowerCase()));
    return row;
  }

  async findById(id: string): Promise<UserRecord | undefined> {
    const [row] = await this.database
      .select(this.columns())
      .from(users)
      .innerJoin(profiles, eq(users.profileId, profiles.id))
      .where(eq(users.id, id));
    return row;
  }

  async list(): Promise<UserRecord[]> {
    return this.database
      .select(this.columns())
      .from(users)
      .innerJoin(profiles, eq(users.profileId, profiles.id));
  }

  async insert(input: {
    email: string;
    name: string;
    passwordHash: string;
    profileId: string;
  }): Promise<UserRecord> {
    const [created] = await this.database
      .insert(users)
      .values({
        email: input.email.toLowerCase(),
        name: input.name,
        passwordHash: input.passwordHash,
        profileId: input.profileId,
      })
      .returning({ id: users.id });
    const user = await this.findById(created!.id);
    if (!user) {
      throw new Error('Usuário não encontrado depois do insert');
    }
    return user;
  }

  async update(
    id: string,
    input: { name?: string; passwordHash?: string; profileId?: string },
  ): Promise<UserRecord | undefined> {
    await this.database.update(users).set(input).where(eq(users.id, id));
    return this.findById(id);
  }

  private columns() {
    return {
      id: users.id,
      email: users.email,
      name: users.name,
      passwordHash: users.passwordHash,
      profileId: users.profileId,
      profileName: profiles.name,
    };
  }
}
