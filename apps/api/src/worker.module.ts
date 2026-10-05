import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { loggerParams } from './common/logger';
import { DbModule } from './db/db.module';
import { JobsModule } from './jobs/jobs.module';
import { JobHandlers } from './jobs/handlers';
import { NotificationsModule } from './notifications/notifications.module';
import { OrdersModule } from './orders/orders.module';

/** Proceso worker: sin HTTP público. Procesa correos, eventos de pago y tareas programadas. */
@Module({
  imports: [
    LoggerModule.forRoot(loggerParams()),
    DbModule, JobsModule, NotificationsModule, OrdersModule,
  ],
  providers: [JobHandlers],
})
export class WorkerModule {}
