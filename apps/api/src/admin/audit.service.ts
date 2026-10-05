import { Inject, Injectable } from '@nestjs/common';
import { desc } from 'drizzle-orm';
import { DB, type Db } from '../db/db.module';
import { auditLog } from '../db/schema';

/** Bitácora de acciones del backoffice. */
@Injectable()
export class AuditService {
  constructor(@Inject(DB) private readonly db: Db) {}
  log(actor: string, action: string, entity: string, entityId?: string | number, detail?: unknown) {
    return this.db.insert(auditLog).values({ actor, action, entity, entityId: entityId != null ? String(entityId) : null, detail: detail ? JSON.stringify(detail).slice(0, 2000) : null });
  }
  recent(limit = 100) { return this.db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(limit); }
}
