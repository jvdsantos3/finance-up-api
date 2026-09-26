import { Global, Injectable, Module, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

export const DRIZZLE = Symbol('DRIZZLE');
export type Database = NodePgDatabase;

@Injectable()
class DrizzleClient implements OnModuleDestroy {
  readonly db: Database;
  private readonly pool: Pool;

  constructor(config: ConfigService) {
    this.pool = new Pool({
      connectionString: config.getOrThrow<string>('DATABASE_URL'),
      connectionTimeoutMillis: 2000,
    });
    this.db = drizzle({ client: this.pool });
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}

@Global()
@Module({
  providers: [
    DrizzleClient,
    {
      provide: DRIZZLE,
      inject: [DrizzleClient],
      useFactory: (client: DrizzleClient) => client.db,
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule {}
