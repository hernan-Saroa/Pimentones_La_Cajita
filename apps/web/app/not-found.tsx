import Link from 'next/link';
export const metadata = { title: 'Página no encontrada' };
export default function NotFound() {
  return (
    <section className="section narrow">
      <p className="kicker">Error 404</p>
      <h1 className="h-page">Aquí no hay nada que untar</h1>
      <p className="muted">El enlace está incompleto o la página cambió de lugar.</p>
      <div className="hero-actions"><Link href="/#tienda" className="btn btn-red btn-lg">Ver los frascos</Link><Link href="/mi-pedido" className="btn btn-outline btn-lg">Consultar un pedido</Link></div>
    </section>
  );
}
