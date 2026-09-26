import {
  Global,
  Injectable,
  Module,
  ServiceUnavailableException,
  type OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

export const REDIS = Symbol('REDIS');

@Injectable()
export class RedisClient implements OnModuleDestroy {
  readonly client: Redis;

  constructor(config: ConfigService) {
    this.client = new Redis(config.getOrThrow<string>('REDIS_URL'), {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      retryStrategy: () => null,
    });
  }

  async onModuleDestroy() {
    this.client.disconnect();
  }
}

export async function useRedis<T>(
  redis: Redis,
  command: () => Promise<T>,
): Promise<T> {
  try {
    return await command();
  } catch (error) {
    if (error instanceof ServiceUnavailableException) {
      throw error;
    }
    throw new ServiceUnavailableException('Redis indisponível');
  }
}

@Global()
@Module({
  providers: [
    RedisClient,
    {
      provide: REDIS,
      inject: [RedisClient],
      useFactory: (client: RedisClient) => client.client,
    },
  ],
  exports: [REDIS],
})
export class RedisModule {}
