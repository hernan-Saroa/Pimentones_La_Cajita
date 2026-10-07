import { BadGatewayException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { DB, type Db } from '../db/db.module';
import { messageEvents, messages, settings } from '../db/schema';
import { MailService } from '../notifications/mail.service';
import { loadConfig } from '../config/config';

export type InboxTemplate = { id: string; title: string; body: string };
export type InboxAction = 'read' | 'new' | 'answered' | 'delete';
const TEMPLATES_KEY = 'inbox_templates';

/**
 * Bandeja de mensajes de clientes (estilo Gmail / Front):
 * conversación con historial persistido, notas internas, respuestas por correo o WhatsApp,
 * acciones masivas y respuestas guardadas editables por el equipo.
 */
@Injectable()
export class InboxService {
  constructor(@Inject(DB) private readonly db: Db, private readonly mail: MailService) {}

  /** Lista con métricas por conversación (notas, respuestas, primera respuesta y última actividad) en una sola consulta. */
  list(status?: string) {
    // Columnas calificadas a mano: dentro de la subconsulta un "id" suelto se resolvería contra message_events.
    const per = (expr: string, kind?: string) => sql.raw(`(select ${expr} from "message_events" e where e.message_id = "messages"."id"${kind ? ` and e.kind = '${kind}'` : ''})`);
    return this.db.select({
      id: messages.id, name: messages.name, email: messages.email, phone: messages.phone,
      message: messages.message, status: messages.status, createdAt: messages.createdAt,
      notes: sql<number>`${per('count(*)::int', 'note')}`.mapWith(Number),
      replies: sql<number>`${per('count(*)::int', 'reply')}`.mapWith(Number),
      firstReplyAt: sql<Date | null>`${per('min(e.created_at)', 'reply')}`.mapWith(messages.createdAt),
      lastActivityAt: sql<Date>`coalesce(${per('max(e.created_at)')}, "messages"."created_at")`.mapWith(messages.createdAt),
    }).from(messages).where(status ? eq(messages.status, status) : undefined).orderBy(desc(messages.createdAt)).limit(500);
  }

  private async get(id: number) {
    const [m] = await this.db.select().from(messages).where(eq(messages.id, id));
    if (!m) throw new NotFoundException('Mensaje no encontrado.');
    return m;
  }

  events(id: number) {
    return this.db.select().from(messageEvents).where(eq(messageEvents.messageId, id)).orderBy(asc(messageEvents.createdAt), asc(messageEvents.id));
  }

  async addNote(id: number, body: string, author: string) {
    await this.get(id);
    const [e] = await this.db.insert(messageEvents).values({ messageId: id, kind: 'note', body: body.trim(), author }).returning();
    return e;
  }

  /** Cambia el estado y deja rastro en el historial cuando se resuelve o se reabre (abrir/leer no ensucia la línea de tiempo). */
  async setStatus(id: number, status: string, author: string) {
    const prev = await this.get(id);
    if (prev.status === status) return prev;
    const [m] = await this.db.update(messages).set({ status }).where(eq(messages.id, id)).returning();
    if (status === 'answered' || prev.status === 'answered') {
      await this.db.insert(messageEvents).values({ messageId: id, kind: 'status', body: status === 'answered' ? 'resolved' : 'reopened', author });
    }
    return m;
  }

  /**
   * Respuesta al cliente. Por correo sale desde el SMTP de la tienda si está configurado (`sent: true`);
   * si no, el panel abre el correo del equipo con el texto listo. WhatsApp siempre abre el chat con el texto.
   */
  async reply(id: number, b: { channel: 'email' | 'whatsapp'; body: string; resolve?: boolean }, author: string) {
    const m = await this.get(id);
    let sent = false;
    if (b.channel === 'email') {
      try { sent = await this.mail.reply(m.email, 'Respuesta a tu mensaje · Pimentones La Cajita', `${b.body.trim()}\n\n—\nTu mensaje:\n${m.message}`); }
      catch (e) { throw new BadGatewayException(`No se pudo enviar el correo: ${(e as Error).message}`); }
    }
    const [event] = await this.db.insert(messageEvents).values({ messageId: id, kind: 'reply', channel: b.channel, body: b.body.trim(), author }).returning();
    const next = b.resolve ? 'answered' : m.status === 'new' ? 'read' : m.status;
    const message = next !== m.status ? await this.setStatus(id, next, author) : m;
    return { event, sent, message };
  }

  async bulk(ids: number[], action: InboxAction, author: string) {
    if (!ids.length) return { ok: true, count: 0 };
    if (action === 'delete') {
      const r = await this.db.delete(messages).where(inArray(messages.id, ids)).returning({ id: messages.id });
      return { ok: true, count: r.length };
    }
    const before = await this.db.select({ id: messages.id, status: messages.status }).from(messages).where(inArray(messages.id, ids));
    const changed = before.filter((m) => m.status !== action);
    if (!changed.length) return { ok: true, count: 0 };
    await this.db.update(messages).set({ status: action }).where(inArray(messages.id, changed.map((m) => m.id)));
    const trail = changed.filter((m) => action === 'answered' || m.status === 'answered')
      .map((m) => ({ messageId: m.id, kind: 'status', body: action === 'answered' ? 'resolved' : 'reopened', author }));
    if (trail.length) await this.db.insert(messageEvents).values(trail);
    return { ok: true, count: changed.length };
  }

  /** Respuestas guardadas (se siembran una vez con datos reales de Ajustes y luego el equipo las edita) + capacidades. */
  async meta() {
    const rows = await this.db.select().from(settings).where(inArray(settings.key, [TEMPLATES_KEY, 'whatsapp', 'shipping_free_from']));
    const s = Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, string | undefined>;
    let templates: InboxTemplate[] | null = null;
    try { templates = s[TEMPLATES_KEY] ? (JSON.parse(s[TEMPLATES_KEY]!) as InboxTemplate[]) : null; } catch { templates = null; }
    if (!templates) templates = await this.saveTemplates(this.defaults(s));
    return {
      templates,
      emailEnabled: this.mail.enabled,
      vars: { tienda: loadConfig().publicUrl, whatsapp: s.whatsapp ?? '', envioGratisDesde: s.shipping_free_from ?? '' },
    };
  }

  async saveTemplates(list: InboxTemplate[]) {
    const value = JSON.stringify(list);
    await this.db.insert(settings).values({ key: TEMPLATES_KEY, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
    return list;
  }

  private defaults(s: Record<string, string | undefined>): InboxTemplate[] {
    const free = Number(s.shipping_free_from || 0);
    const freeLine = free > 0 ? ` Los pedidos desde $${free.toLocaleString('es-CO')} tienen envío gratis.` : '';
    return [
      { id: 'gracias', title: 'Agradecer y confirmar', body: 'Hola {nombre}, gracias por escribirnos. Ya revisamos tu mensaje y con gusto te ayudamos.' },
      { id: 'envios', title: 'Envíos y costos', body: `Hola {nombre}, hacemos envíos a domicilio y el costo se calcula al finalizar la compra según tu ciudad.${freeLine}` },
      { id: 'mayorista', title: 'Pedido mayorista', body: 'Hola {nombre}, gracias por pensar en nosotros para tu negocio. Para preparar tu cotización cuéntanos qué productos y cantidades necesitas, la ciudad de entrega y cada cuánto comprarías.' },
      { id: 'pedido', title: 'Seguimiento de pedido', body: 'Hola {nombre}, revisamos tu pedido {pedido} y ya lo estamos gestionando. Te avisamos apenas tengamos novedades.' },
      { id: 'comprar', title: 'Cómo comprar en línea', body: 'Hola {nombre}, puedes hacer tu pedido directamente en {tienda}. Si prefieres, también te atendemos por WhatsApp al {whatsapp}.' },
    ];
  }
}
