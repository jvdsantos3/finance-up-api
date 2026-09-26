import { StandardSchemaValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import cookie from '@fastify/cookie';

export async function setupApp(app: NestFastifyApplication) {
  const config = app.get(ConfigService);
  app.enableCors({
    origin: config.getOrThrow<string>('FRONTEND_ORIGIN'),
    credentials: true,
  });

  await app.register(cookie);
  app.useGlobalPipes(new StandardSchemaValidationPipe());

  const swagger = new DocumentBuilder()
    .setTitle('finance-up')
    .setDescription('finance-up API')
    .setVersion('0.0.1')
    .build();

  SwaggerModule.setup('docs', app, () =>
    SwaggerModule.createDocument(app, swagger),
  );
}
