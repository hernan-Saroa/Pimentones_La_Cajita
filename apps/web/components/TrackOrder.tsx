'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function TrackOrder() {
  const [ref, setRef] = useState(''); const [email, setEmail] = useState('');
  const router = useRouter();
  return (
    <section className="section narrow">
      <h1 className="h-page">¿Dónde va mi pedido?</h1>
      <p className="muted">Escribe el número que te llegó al correo (empieza por LC) y el correo con el que compraste.</p>
      <form className="fields one" onSubmit={(e) => { e.preventDefault(); router.push(`/pedido/${ref.trim().toUpperCase()}?email=${encodeURIComponent(email.trim())}`); }}>
        <label className="field">Número de pedido<input required value={ref} onChange={(e) => setRef(e.target.value)} placeholder="LC261004-A1B2C3" autoCapitalize="characters" autoComplete="off" /></label>
        <label className="field">Correo con el que compraste<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <button className="btn btn-red btn-lg">Consultar</button>
        <p className="muted small">¿No encuentras el número? Escríbenos a <a href="mailto:pedidos@pimentoneslacajita.com">pedidos@pimentoneslacajita.com</a>.</p>
      </form>
    </section>
  );
}
