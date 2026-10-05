import { Body, Controller, Get, HttpCode, Param, Post, Query, UnauthorizedException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CreateOrderWithCouponSchema, QuoteRequestSchema, type CreateOrderWithCoupon, type QuoteRequest } from '@lacajita/shared';
import { PricingService } from './pricing.service';
import { ZodPipe } from '../common/zod.pipe';
import { OrdersService } from './orders.service';
import { WompiService, type WompiEvent } from '../payments/wompi.service';
import { JOBS, JobsService } from '../jobs/jobs.service';

@ApiTags('Pedidos')
@Controller()
export class OrdersController {
  constructor(private readonly orders: OrdersService, private readonly wompi: WompiService, private readonly jobs: JobsService, private readonly pricing: PricingService) {}

  @Post('orders') @Throttle({ default: { limit: 20, ttl: 900_000 } })
  @ApiOperation({ summary: 'Crea un pedido; devuelve paymentUrl si es Wompi' })
  create(@Body(new ZodPipe(CreateOrderWithCouponSchema)) body: CreateOrderWithCoupon) { return this.orders.create(body); }

  @Post('orders/quote') @HttpCode(200) @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Cotiza envío, descuento y total antes de confirmar (misma lógica que el pedido)' })
  async quote(@Body(new ZodPipe(QuoteRequestSchema)) body: QuoteRequest) {
    const { items: _i, couponId: _c, stockError: _s, ...q } = await this.pricing.quote(body);
    return q;
  }

  @Get('orders/:reference') @ApiOperation({ summary: 'Estado de un pedido para el cliente (referencia + correo)' })
  one(@Param('reference') reference: string, @Query('email') email = '', @Query('tx') tx?: string) {
    return this.orders.publicView(reference, email, tx);
  }

  @Post('webhooks/wompi') @HttpCode(200) @ApiOperation({ summary: 'Eventos de Wompi (firma verificada)' })
  async webhook(@Body() body: WompiEvent) {
    if (!this.wompi.verifyEvent(body)) throw new UnauthorizedException('firma inválida');
    // Se responde 200 de inmediato; el worker aplica el evento con reintentos. La llave única evita duplicados.
    const tx = body.data?.transaction;
    if (body.event === 'transaction.updated' && tx) await this.jobs.send(JOBS.paymentsWompiEvent, tx, { singletonKey: `${tx.id}-${tx.status}` });
    return { ok: true };
  }
}
