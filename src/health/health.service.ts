import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../database/database.module.js';

export type HealthBody =
  | { status: 'ok'; database: 'up' }
  | { status: 'error'; database: 'down' };

@Injectable()
export class HealthService {
  constructor(@Inject(DRIZZLE) private readonly database: Database) {}

  async check(): Promise<HealthBody> {
    try {
      await this.database.execute(sql`select 1`);
      return { status: 'ok', database: 'up' };
    } catch {
      return { status: 'error', database: 'down' };
    }
  }
}
