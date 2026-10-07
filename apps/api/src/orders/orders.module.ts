import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PricingService } from './pricing.service';
import { CatalogModule } from '../catalog/catalog.module';
import { PaymentsModule } from '../payments/payments.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({ imports: [CatalogModule, PaymentsModule, NotificationsModule], controllers: [OrdersController], providers: [OrdersService, PricingService], exports: [OrdersService, PricingService] })
export class OrdersModule {}
