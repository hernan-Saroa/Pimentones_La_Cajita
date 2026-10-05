import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AdminController, AdminProtectedController } from './admin.controller';
import { AnalyticsService } from './analytics.service';
import { BackofficeService } from './backoffice.service';
import { AuditService } from './audit.service';
import { AdminService } from './admin.service';
import { AdminAuthService, AdminGuard } from './auth';
import { OrdersModule } from '../orders/orders.module';
import { CatalogModule } from '../catalog/catalog.module';
import { loadConfig } from '../config/config';

@Module({
  imports: [JwtModule.register({ secret: loadConfig().jwtSecret, signOptions: { expiresIn: '12h' } }), OrdersModule, CatalogModule],
  controllers: [AdminController, AdminProtectedController],
  providers: [AdminService, AdminAuthService, AdminGuard, AnalyticsService, BackofficeService, AuditService],
  exports: [BackofficeService],
})
export class AdminModule {}
