import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ContactSchema, type ContactInput } from '@lacajita/shared';
import { ZodPipe } from '../common/zod.pipe';
import { DB, type Db } from '../db/db.module';
import { messages } from '../db/schema';
import { JOBS, JobsService } from '../jobs/jobs.service';

/** Formulario "Contáctenos" de la página actual: guarda el mensaje y avisa al negocio por correo. */
@ApiTags('Contacto')
@Controller('contact')
export class ContactController {
  constructor(@Inject(DB) private readonly db: Db, private readonly jobs: JobsService) {}

  @Post() @HttpCode(201) @Throttle({ default: { limit: 5, ttl: 600_000 } })
  @ApiOperation({ summary: 'Recibe un mensaje de contacto' })
  async send(@Body(new ZodPipe(ContactSchema)) body: ContactInput) {
    if (body.website) return { ok: true };   // bot: se ignora en silencio
    const [m] = await this.db.insert(messages).values({ name: body.name, email: body.email.toLowerCase(), phone: body.phone || null, message: body.message }).returning();
    await this.jobs.send(JOBS.mailContact, { messageId: m.id }, { singletonKey: `contact-${m.id}` });
    return { ok: true };
  }
}
