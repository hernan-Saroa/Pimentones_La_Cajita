import { Suspense } from 'react';
import { OrderStatus } from '@/components/OrderStatus';
export const metadata = { title: 'Tu pedido', robots: { index: false } };
export default async function Page({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  return <Suspense fallback={<section className="section narrow"><p className="muted">Consultando tu pedido…</p></section>}><OrderStatus reference={reference} /></Suspense>;
}
