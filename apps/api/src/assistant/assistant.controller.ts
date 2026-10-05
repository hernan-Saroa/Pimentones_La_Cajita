import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { SubscribeSchema, SuggestSchema } from '@lacajita/shared';
import { ZodPipe } from '../common/zod.pipe';
import { AssistantService } from './assistant.service';
import { DB, type Db } from '../db/db.module';
import { subscribers } from '../db/schema';

@ApiTags('Asistente y boletín')
@Controller()
export class AssistantController {
  constructor(private readonly assistant: AssistantService, @Inject(DB) private readonly db: Db) {}

  @Post('suggest') @HttpCode(200) @Throttle({ default: { limit: 15, ttl: 60_000 } })
  @ApiOperation({ summary: 'Frascos recomendados para un plato' })
  suggest(@Body(new ZodPipe(SuggestSchema)) body: { text: string }) { return this.assistant.suggest(body.text); }

  @Post('subscribe') @Throttle({ default: { limit: 10, ttl: 900_000 } })
  @ApiOperation({ summary: 'Suscripción al boletín (idempotente)' })
  async subscribe(@Body(new ZodPipe(SubscribeSchema)) body: { email: string }) {
    await this.db.insert(subscribers).values({ email: body.email.toLowerCase() }).onConflictDoNothing();
    return { ok: true };
  }
}
