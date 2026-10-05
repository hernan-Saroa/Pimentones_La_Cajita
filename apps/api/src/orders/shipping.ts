/** Regla de envío: gratis desde un monto; tarifa local para la ciudad base; tarifa nacional para el resto. */
export const norm = (s: unknown) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

export function shippingFor(subtotal: number, city: string, s: Record<string, string>): number {
  const freeFrom = Number(s.shipping_free_from || 0);
  if (freeFrom > 0 && subtotal >= freeFrom) return 0;
  if (s.shipping_local_city && norm(city) === norm(s.shipping_local_city)) return Number(s.shipping_local || 0);
  return Number(s.shipping_flat || 0);
}

export function newReference(now = new Date(), rand = Math.random().toString(16).slice(2, 8)): string {
  const ymd = `${now.getFullYear() % 100}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  return `LC${ymd}-${rand.toUpperCase()}`;
}
