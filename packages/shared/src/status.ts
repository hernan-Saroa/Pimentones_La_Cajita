export const ORDER_STATUSES = ['pending', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled', 'failed', 'refunded'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export const PAYMENT_METHODS = ['wompi', 'transfer', 'cod'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Esperando pago', paid: 'Pagado', preparing: 'En preparación', shipped: 'Enviado',
  delivered: 'Entregado', cancelled: 'Cancelado', failed: 'Pago rechazado', refunded: 'Reembolsado',
};
export const METHOD_LABEL: Record<PaymentMethod, string> = { wompi: 'Pago en línea', transfer: 'Transferencia', cod: 'Contraentrega' };
