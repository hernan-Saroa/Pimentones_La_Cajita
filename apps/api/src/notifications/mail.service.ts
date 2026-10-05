import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import { cop } from '@lacajita/shared';
import { loadConfig } from '../config/config';
import type { OrderRow, OrderItemRow } from '../db/schema';

/** Correos transaccionales. Sin SMTP configurado, solo registra en el log (útil en desarrollo). */
@Injectable()
export class MailService {
  private readonly log = new Logger(MailService.name);
  private readonly cfg = loadConfig();
  private readonly transport: Transporter | null = this.cfg.smtp.host
    ? nodemailer.createTransport({ host: this.cfg.smtp.host, port: this.cfg.smtp.port, secure: this.cfg.smtp.port === 465,
        auth: this.cfg.smtp.user ? { user: this.cfg.smtp.user, pass: this.cfg.smtp.pass } : undefined })
    : null;

  private async send(to: string, subject: string, text: string) {
    if (!to) return;
    if (!this.transport) { this.log.log(`[mail:off] ${to} | ${subject}`); return; }
    try { await this.transport.sendMail({ from: this.cfg.smtp.from, to, subject, text }); }
    catch (e) { this.log.error(`No se pudo enviar correo a ${to}: ${(e as Error).message}`); }
  }

  private summary(o: OrderRow, items: Pick<OrderItemRow, 'name' | 'unitPrice' | 'quantity'>[]) {
    return [`Pedido ${o.reference}`, ...items.map((i) => `  ${i.quantity} x ${i.name}  ${cop(i.unitPrice * i.quantity)}`),
      `  Envío: ${cop(o.shipping)}`, `  Total: ${cop(o.total)}`, '', `Entrega: ${o.address}, ${o.city} (${o.department})`].join('\n');
  }

  async orderConfirmed(o: OrderRow, items: Pick<OrderItemRow, 'name' | 'unitPrice' | 'quantity'>[]) {
    await this.send(o.customerEmail, `Recibimos tu pedido ${o.reference}`,
      `Hola ${o.customerName},\n\nGracias por comprar en Pimentones La Cajita.\n\n${this.summary(o, items)}\n\nTe avisaremos cuando salga tu pedido.\n\nPimentones La Cajita\n${this.cfg.publicUrl}`);
    await this.send(this.cfg.smtp.notify, `Nuevo pedido ${o.reference} (${o.paymentMethod})`,
      `${this.summary(o, items)}\n\nCliente: ${o.customerName}\nTel: ${o.customerPhone}\nCorreo: ${o.customerEmail}\nNotas: ${o.notes || '-'}`);
  }

  async orderShipped(o: OrderRow) {
    await this.send(o.customerEmail, `Tu pedido ${o.reference} va en camino`,
      `Hola ${o.customerName},\n\nTu pedido ya salió.${o.tracking ? `\nGuía: ${o.tracking}` : ''}\n\nPimentones La Cajita`);
  }

  /** Resumen diario para el negocio (lo programa el worker a las 8 p. m.). */
  async dailyReport(r: { date: string; sales: number; orders: number; units: number; pending: number; top: { name: string; units: number }[] }) {
    const top = r.top.length ? r.top.map((t) => `  ${t.units} × ${t.name}`).join('\n') : '  (sin ventas pagadas)';
    await this.send(this.cfg.smtp.notify, `Ventas de hoy ${r.date}: ${cop(r.sales)} en ${r.orders} pedidos`,
      `Resumen del ${r.date}\n\nVentas pagadas: ${cop(r.sales)}\nPedidos pagados: ${r.orders}\nFrascos vendidos: ${r.units}\nPedidos por confirmar pago: ${r.pending}\n\nMás vendidos:\n${top}\n\nPanel: ${this.cfg.publicUrl}/admin`);
  }

  /** Alerta de inventario bajo (lo programa el worker a las 7 a. m.). */
  async lowStock(items: { name: string; stock: number }[]) {
    if (!items.length) return;
    await this.send(this.cfg.smtp.notify, `Inventario bajo: ${items.length} producto(s)`,
      `Estos productos tienen 5 frascos o menos:\n\n${items.map((i) => `  ${i.name}: ${i.stock}`).join('\n')}\n\nRegistra un lote en ${this.cfg.publicUrl}/admin/inventario`);
  }

  /** Aviso al negocio de un mensaje de contacto nuevo, con el correo del cliente como "responder a". */
  async contactMessage(m: { id: number; name: string; email: string; phone: string | null; message: string }) {
    if (!this.cfg.smtp.notify) { this.log.log(`[mail:off] contacto #${m.id} de ${m.email}`); return; }
    if (!this.transport) { this.log.log(`[mail:off] ${this.cfg.smtp.notify} | Mensaje de ${m.name}`); return; }
    try {
      await this.transport.sendMail({ from: this.cfg.smtp.from, to: this.cfg.smtp.notify, replyTo: m.email, subject: `Mensaje de ${m.name} desde la tienda`,
        text: `${m.message}\n\n—\n${m.name}\n${m.email}${m.phone ? `\n${m.phone}` : ''}\n\nResponde a este correo para contestarle. Panel: ${this.cfg.publicUrl}/admin/mensajes` });
    } catch (e) { this.log.error(`No se pudo enviar aviso de contacto: ${(e as Error).message}`); }
  }
}