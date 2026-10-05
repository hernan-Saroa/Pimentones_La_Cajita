import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { resolve } from 'path';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { loadConfig } from './config/config';
import { runMigrations } from './db/migrate';

async function bootstrap() {
  const cfg = loadConfig();
  await runMigrations(cfg.databaseUrl);

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter({ trustProxy: true }), { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.setGlobalPrefix('api', { exclude: ['uploads/(.*)'] });
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors({ origin: cfg.corsOrigins });
  app.enableShutdownHooks();
  await app.register(multipart as any);
  await app.register(fastifyStatic as any, { root: resolve(cfg.uploadDir), prefix: '/uploads/', maxAge: '30d', decorateReply: false });

  const doc = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('Pimentones La Cajita · API').setVersion('1.0').addBearerAuth().build());
  SwaggerModule.setup('api/docs', app, doc);

  await app.listen(cfg.port, '0.0.0.0');
}
bootstrap();
