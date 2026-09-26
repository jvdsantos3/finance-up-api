import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module.js';
import { setupApp } from './setup-app.js';

export async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );
  setupApp(app);
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}

if (!process.env.VITEST) {
  await bootstrap();
}
