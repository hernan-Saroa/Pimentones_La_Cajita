import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { createServer } from 'http';
import { WorkerModule } from './worker.module';
import { JobHandlers } from './jobs/handlers';
import { loadConfig } from './config/config';

/** Arranque del worker. Expone solo /health en un puerto interno para el orquestador. */
async function bootstrap() {
  loadConfig();
  const app = await NestFactory.createApplicationContext(WorkerModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();
  await app.get(JobHandlers).register();
  const port = Number(process.env.WORKER_PORT || 4001);
  createServer((req, res) => { res.writeHead(req.url === '/health' ? 200 : 404, { 'content-type': 'application/json' }); res.end(JSON.stringify({ ok: true, role: 'worker' })); }).listen(port, '0.0.0.0');
  app.get(Logger).log(`Worker escuchando salud en :${port}`);
}
bootstrap();
