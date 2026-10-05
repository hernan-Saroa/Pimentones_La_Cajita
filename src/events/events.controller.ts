import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { EventsBatchSchema } from '@lacajita/shared';
import { z } from 'zod';
import { ZodPipe } from '../common/zod.pipe';
import { DB, type Db } from '../db/db.module';
import { events } from '../db/schema';

type Batch = z.infer<typeof EventsBatchSchema>;

/** Eventos anónimos del embudo de compra. Sin cookies de terceros ni datos personales: solo un id de sesión aleatorio. */
@ApiTags('Analítica')
@Controller('events')
export class EventsController {
  constructor(@Inject(DB) private readonly db: Db) {}

  @Post() @HttpCode(204) @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Recibe un lote de eventos de navegación (page_view, product_view, add_to_cart, begin_checkout, purchase)' })
  async ingest(@Body(new ZodPipe(EventsBatchSchema)) body: Batch) {
    const now = Date.now();
    await this.db.insert(events).values(body.events.map((e) => ({
      sessionId: body.sessionId, type: e.type, path: e.path?.slice(0, 200) ?? null, productId: e.productId ?? null, value: e.value ?? null,
      meta: e.meta ? JSON.stringify(e.meta).slice(0, 1000) : null,
      createdAt: new Date(Math.min(Math.max(e.at, now - 86400000), now + 60000)),   // tolera reloj del cliente ±
    })));
  }
}
