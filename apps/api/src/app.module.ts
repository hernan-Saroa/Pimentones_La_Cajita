import { Module, OnModuleInit } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { loggerParams } from './common/logger';
import { DbModule } from './db/db.module';
import { JobsModule } from './jobs/jobs.module';
import { JobHandlers } from './jobs/handlers';
import { NotificationsModule } from './notifications/notifications.module';
import { CatalogModule } from './catalog/catalog.module';
import { OrdersModule } from './orders/orders.module';
import { AssistantModule } from './assistant/assistant.module';
import { AdminModule } from './admin/admin.module';
import { EventsModule } from './events/events.module';
import { ContactModule } from './contact/contact.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    LoggerModule.forRoot(loggerParams()),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),   // límite general; rutas sensibles tienen el suyo
    DbModule, JobsModule, NotificationsModule, CatalogModule, OrdersModule, AssistantModule, AdminModule, EventsModule, ContactModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }, JobHandlers],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly handlers: JobHandlers) {}
  /** Un solo contenedor (JOBS_INLINE=true): la API también procesa sus trabajos. */
  async onModuleInit() { if (process.env.JOBS_INLINE === 'true') await this.handlers.register(); }
}
