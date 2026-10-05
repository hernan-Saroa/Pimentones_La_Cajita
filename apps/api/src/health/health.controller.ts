import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { sql } from 'drizzle-orm';
import { DB, type Db } from '../db/db.module';

@ApiTags('Salud')
@Controller('health')
export class HealthController {
  constructor(@Inject(DB) private readonly db: Db) {}
  @Get() async check() { await this.db.execute(sql`select 1`); return { ok: true, time: new Date().toISOString() }; }
}
