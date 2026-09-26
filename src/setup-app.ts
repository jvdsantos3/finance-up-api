import { StandardSchemaValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

export function setupApp(app: NestFastifyApplication) {
  app.useGlobalPipes(new StandardSchemaValidationPipe());

  const config = new DocumentBuilder()
    .setTitle('finance-up')
    .setDescription('finance-up API')
    .setVersion('0.0.1')
    .build();

  SwaggerModule.setup('docs', app, () =>
    SwaggerModule.createDocument(app, config),
  );
}
