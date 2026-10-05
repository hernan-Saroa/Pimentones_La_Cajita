import { BadRequestException, Body, Controller, Delete, Get, Header, HttpCode, Param, ParseIntPipe, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { FastifyRequest } from 'fastify';
import { randomBytes } from 'crypto';
import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import { pipeline } from 'stream/promises';
import { join } from 'path';
import { z } from 'zod';
import { AdminUserCreateSchema, AdminUserUpdateSchema, BatchCreateSchema, MESSAGE_STATUSES, CouponUpsertSchema, LoginSchema, OrderAdminUpdateSchema, ProductUpsertSchema, SettingsSchema, SiteContentSchema, StockAdjustSchema, ZoneUpsertSchema, type CouponUpsert, type ProductUpsert, type SiteContent } from '@lacajita/shared';
import { ZodPipe } from '../common/zod.pipe';
import { Actor, AdminAuthService, AdminGuard, MinRole, type AdminIdentity } from './auth';
import { AdminService } from './admin.service';
import { AnalyticsService } from './analytics.service';
import { BackofficeService } from './backoffice.service';
import { AuditService } from './audit.service';
import { loadConfig } from '../config/config';
import { CatalogService } from '../catalog/catalog.service';

@ApiTags('Administración')
@Controller('admin')
export class AdminController {
  constructor(private readonly auth: AdminAuthService, private readonly admin: AdminService, private readonly analytics: AnalyticsService, private readonly bo: BackofficeService, private readonly audit: AuditService) {}

  @Post('login') @HttpCode(200) @Throttle({ default: { limit: 10, ttl: 900_000 } }) @ApiOperation({ summary: 'Devuelve un JWT de 12 horas y el usuario' })
  login(@Body(new ZodPipe(LoginSchema)) body: { email: string; password: string }) { return this.auth.login(body.email, body.password); }
}

@ApiTags('Administración') @ApiBearerAuth() @UseGuards(AdminGuard)
@Controller('admin')
export class AdminProtectedController {
  constructor(private readonly admin: AdminService, private readonly analytics: AnalyticsService, private readonly bo: BackofficeService, private readonly audit: AuditService, private readonly catalog: CatalogService) {}

  @Get('me') me(@Actor() a: AdminIdentity) { return a; }

  // ---- Análisis ----
  @Get('summary') summary() { return this.admin.summary(); }
  @Get('analytics') @ApiOperation({ summary: 'Tablero: KPIs con comparación, ventas por día, ciudad, medio de pago, embudo, clientes' })
  dashboard(@Query('days') days?: string) { return this.analytics.dashboard(Math.min(Math.max(Number(days) || 30, 7), 365)); }
  @Get('analytics/funnel') @ApiOperation({ summary: 'Embudo de conversión por sesiones y checkouts abandonados' })
  funnel(@Query('days') days?: string) { return this.analytics.funnel(Math.min(Math.max(Number(days) || 30, 7), 365)); }

  // ---- Productos ----
  @Get('products') products() { return this.admin.products(); }
  @Post('products') @MinRole('admin') async create(@Body(new ZodPipe(ProductUpsertSchema)) p: ProductUpsert, @Actor() a: AdminIdentity) { const r = await this.admin.createProduct(p); await this.audit.log(a.email, 'crear', 'producto', r.id, { name: r.name }); return r; }
  @Put('products/:id') @MinRole('admin') async update(@Param('id', ParseIntPipe) id: number, @Body(new ZodPipe(ProductUpsertSchema.partial())) p: Partial<ProductUpsert>, @Actor() a: AdminIdentity) { const r = await this.admin.updateProduct(id, p); await this.audit.log(a.email, 'editar', 'producto', id, p); return r; }
  @Delete('products/:id') @MinRole('admin') @HttpCode(204) async remove(@Param('id', ParseIntPipe) id: number, @Actor() a: AdminIdentity) { await this.admin.deactivateProduct(id); await this.audit.log(a.email, 'desactivar', 'producto', id); }

  @Post('upload') @MinRole('admin') @ApiOperation({ summary: 'Foto de producto (JPG, PNG o WEBP, máx. 4 MB)' })
  async upload(@Req() req: FastifyRequest) {
    const file = await req.file({ limits: { fileSize: 4 * 1024 * 1024 } });
    const ext = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }[file?.mimetype ?? ''];
    if (!file || !ext) throw new BadRequestException('Sube una imagen JPG, PNG o WEBP de máximo 4 MB.');
    const dir = loadConfig().uploadDir; await mkdir(dir, { recursive: true });
    const name = randomBytes(8).toString('hex') + ext;
    await pipeline(file.file, createWriteStream(join(dir, name)));
    return { url: `/uploads/${name}` };
  }

  // ---- Pedidos ----
  @Get('orders') orders(@Query('status') status?: string, @Query('q') q?: string, @Query('limit') limit?: string) { return this.admin.orders({ status, q, limit: Number(limit) || undefined }); }
  @Get('orders/export.csv') @Header('Content-Type', 'text/csv; charset=utf-8') @Header('Content-Disposition', 'attachment; filename="pedidos.csv"')
  ordersCsv(@Query('from') from?: string, @Query('to') to?: string) { return this.bo.ordersCsv(from, to); }
  @Get('orders/:id') order(@Param('id', ParseIntPipe) id: number) { return this.admin.order(id); }
  @Patch('orders/:id') async patchOrder(@Param('id', ParseIntPipe) id: number, @Body(new ZodPipe(OrderAdminUpdateSchema)) body: { status?: string; tracking?: string; adminNotes?: string }, @Actor() a: AdminIdentity) {
    const r = await this.admin.updateOrder(id, body); await this.audit.log(a.email, 'actualizar', 'pedido', r.reference, body); return r;
  }

  // ---- Clientes ----
  @Get('customers') customers(@Query('q') q?: string) { return this.bo.customers(q); }
  @Get('customers/export.csv') @Header('Content-Type', 'text/csv; charset=utf-8') @Header('Content-Disposition', 'attachment; filename="clientes.csv"') customersCsv() { return this.bo.customersCsv(); }
  @Get('customers/:email/orders') customerOrders(@Param('email') email: string) { return this.bo.customerOrders(email); }

  // ---- Cupones ----
  @Get('coupons') coupons() { return this.bo.coupons(); }
  @Post('coupons') @MinRole('admin') async createCoupon(@Body(new ZodPipe(CouponUpsertSchema)) c: CouponUpsert, @Actor() a: AdminIdentity) { const r = await this.bo.saveCoupon(c); await this.audit.log(a.email, 'crear', 'cupon', r.code, c); return r; }
  @Put('coupons/:id') @MinRole('admin') async updateCoupon(@Param('id', ParseIntPipe) id: number, @Body(new ZodPipe(CouponUpsertSchema)) c: CouponUpsert, @Actor() a: AdminIdentity) { const r = await this.bo.saveCoupon(c, id); await this.audit.log(a.email, 'editar', 'cupon', r.code, c); return r; }

  // ---- Zonas de envío ----
  @Get('zones') zones() { return this.bo.zones(); }
  @Post('zones') @MinRole('admin') async saveZone(@Body(new ZodPipe(ZoneUpsertSchema)) z: any, @Actor() a: AdminIdentity) { const r = await this.bo.saveZone(z); await this.audit.log(a.email, 'guardar', 'zona', r.department, z); return r; }
  @Put('zones/:id') @MinRole('admin') async updateZone(@Param('id', ParseIntPipe) id: number, @Body(new ZodPipe(ZoneUpsertSchema)) z: any, @Actor() a: AdminIdentity) { const r = await this.bo.saveZone(z, id); await this.audit.log(a.email, 'editar', 'zona', r.department, z); return r; }

  // ---- Inventario ----
  @Get('inventory') inventory() { return this.bo.inventory(); }
  @Get('inventory/:productId/movements') movements(@Param('productId', ParseIntPipe) id: number) { return this.bo.movements(id); }
  @Get('inventory/:productId/batches') productBatches(@Param('productId', ParseIntPipe) id: number) { return this.bo.productBatches(id); }
  @Post('inventory/batches') async addBatch(@Body(new ZodPipe(BatchCreateSchema)) b: any, @Actor() a: AdminIdentity) { const r = await this.bo.addBatch(b, a.email); await this.audit.log(a.email, 'lote', 'inventario', b.productId, b); return r; }
  @Post('inventory/adjust') async adjust(@Body(new ZodPipe(StockAdjustSchema)) b: { productId: number; delta: number; note: string }, @Actor() a: AdminIdentity) { const r = await this.bo.adjustStock(b.productId, b.delta, b.note, a.email); await this.audit.log(a.email, 'ajuste', 'inventario', b.productId, b); return r; }

  // ---- Contenido ----
  @Get('content') content() { return this.catalog.content(); }
  @Put('content') @MinRole('admin') async saveContent(@Body(new ZodPipe(SiteContentSchema)) c: SiteContent, @Actor() a: AdminIdentity) { const r = await this.catalog.saveContent(c); await this.audit.log(a.email, 'editar', 'contenido', 'site'); return r; }

  // ---- Mensajes de contacto ----
  @Get('messages') @ApiOperation({ summary: 'Mensajes del formulario de contacto' }) messages(@Query('status') status?: string) { return this.admin.messages(status); }
  @Patch('messages/:id') @MinRole('ops') async messageStatus(@Param('id', ParseIntPipe) id: number, @Body(new ZodPipe(z.object({ status: z.enum(MESSAGE_STATUSES) }))) b: { status: string }, @Actor() a: AdminIdentity) {
    const m = await this.admin.setMessageStatus(id, b.status); await this.audit.log(a.email, 'mensaje', 'mensaje', id, { status: b.status }); return m;
  }

  // ---- Boletín ----
  @Get('subscribers') subscribers() { return this.admin.subscribers(); }
  @Get('subscribers/export.csv') @Header('Content-Type', 'text/csv; charset=utf-8') @Header('Content-Disposition', 'attachment; filename="suscriptores.csv"') subscribersCsv() { return this.bo.subscribersCsv(); }

  // ---- Ajustes ----
  @Get('settings') settings() { return this.admin.settings(); }
  @Put('settings') @MinRole('admin') async saveSettings(@Body(new ZodPipe(SettingsSchema)) body: Record<string, string | undefined>, @Actor() a: AdminIdentity) { const r = await this.admin.saveSettings(body); await this.audit.log(a.email, 'editar', 'ajustes', 'tienda', body); return r; }

  // ---- Usuarios y bitácora ----
  @Get('users') @MinRole('admin') users() { return this.bo.users(); }
  @Post('users') @MinRole('owner') async createUser(@Body(new ZodPipe(AdminUserCreateSchema)) u: any, @Actor() a: AdminIdentity) { const r = await this.bo.createUser(u); await this.audit.log(a.email, 'crear', 'usuario', r.email, { role: r.role }); return r; }
  @Patch('users/:id') @MinRole('owner') async updateUser(@Param('id', ParseIntPipe) id: number, @Body(new ZodPipe(AdminUserUpdateSchema)) u: any, @Actor() a: AdminIdentity) { const r = await this.bo.updateUser(id, u, a.id); await this.audit.log(a.email, 'editar', 'usuario', r.email, { role: u.role, active: u.active }); return r; }
  @Get('audit') @MinRole('admin') auditLog(@Query('limit') limit?: string) { return this.audit.recent(Math.min(Number(limit) || 100, 500)); }
}
