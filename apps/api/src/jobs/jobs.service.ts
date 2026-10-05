import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import PgBoss from 'pg-boss';
import { loadConfig } from '../config/config';

/**
 * Cola de trabajos sobre PostgreSQL (pg-boss): correos, eventos de pago y tareas programadas
 * salen del camino de la petición HTTP y se reintentan solos. Sin Redis ni brokers que operar.
 *
 * JOBS_INLINE=true ejecuta los trabajos en el mismo proceso (despliegue de un solo contenedor).
 */
export const JOBS = {
  mailOrderConfirmed: 'mail.order-confirmed',
  mailOrderShipped: 'mail.order-shipped',
  paymentsWompiEvent: 'payments.wompi-event',
  ordersExpire: 'orders.expire',
  reportDaily: 'report.daily',
  inventoryLowStock: 'inventory.low-stock',
  mailContact: 'mail.contact',
} as const;
export type JobName = (typeof JOBS)[keyof typeof JOBS];
type Handler<T> = (data: T) => Promise<void>;

@Injectable()
export class JobsService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(JobsService.name);
  private boss!: PgBoss;
  private readonly inline = process.env.JOBS_INLINE === 'true';
  private readonly inlineHandlers = new Map<string, Handler<any>>();

  async onModuleInit() {
    this.boss = new PgBoss({ connectionString: loadConfig().databaseUrl, schema: 'jobs', retryLimit: 5, retryBackoff: true, expireInHours: 23, archiveCompletedAfterSeconds: 86400 });
    this.boss.on('error', (e) => this.log.error(e.message));
    await this.boss.start();
    for (const name of Object.values(JOBS)) await this.boss.createQueue(name);
    this.log.log(`Cola lista${this.inline ? ' (modo inline)' : ''}`);
  }
  onModuleDestroy() { return this.boss?.stop({ graceful: true, timeout: 5000 }); }

  /** Encola un trabajo. En modo inline lo ejecuta de inmediato si hay handler registrado. */
  async send<T extends object>(name: JobName, data: T, opts: { singletonKey?: string } = {}) {
    const h = this.inline && this.inlineHandlers.get(name);
    if (h) { try { await h(data); } catch (e) { this.log.error(`Trabajo ${name} falló inline: ${(e as Error).message}`); } return; }
    await this.boss.send(name, data, { singletonKey: opts.singletonKey, retryLimit: 5, retryBackoff: true });
  }

  /** Registra quién procesa cada trabajo (lo llama el worker, o la API en modo inline). */
  async work<T extends object>(name: JobName, handler: Handler<T>) {
    this.inlineHandlers.set(name, handler);
    if (this.inline) return;
    await this.boss.work<T>(name, { batchSize: 1 }, async ([job]) => { if (job) await handler(job.data); });
  }

  /** Tarea programada (cron). pg-boss garantiza una sola ejecución aunque haya varios workers. */
  async schedule(name: JobName, cron: string) { if (!this.inline) await this.boss.schedule(name, cron, {}, { tz: 'America/Bogota' }); }
}
