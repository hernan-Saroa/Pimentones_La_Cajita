'use client';
import { useState } from 'react';
import { api } from '@/lib/api';

export function ContactForm() {
  const [f, setF] = useState({ name: '', email: '', phone: '', message: '', website: '' });
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [error, setError] = useState('');
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  if (state === 'done') return <p className="notice next-steps" role="status"><b>Gracias.</b> Recibimos tu mensaje y te respondemos al correo en menos de un día hábil.</p>;
  return (
    <form className="fields one contact-form" onSubmit={async (e) => {
      e.preventDefault(); setState('busy'); setError('');
      try { await api.contact(f); setState('done'); } catch (err) { setError((err as Error).message); setState('idle'); }
    }} noValidate>
      <label className="field">Nombre<input value={f.name} onChange={set('name')} autoComplete="name" required /></label>
      <label className="field">Correo<input type="email" value={f.email} onChange={set('email')} autoComplete="email" required /></label>
      <label className="field">Celular <span className="opt">(opcional)</span><input value={f.phone} onChange={set('phone')} inputMode="tel" autoComplete="tel" /></label>
      <label className="field">Mensaje<textarea rows={4} value={f.message} onChange={set('message')} required placeholder="Pedidos para empresas, puntos de venta, dudas sobre los frascos…" /></label>
      <input type="text" name="website" value={f.website} onChange={set('website')} className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      {error && <p className="notice notice-error" role="alert">{error}</p>}
      <button className="btn btn-red btn-lg" disabled={state === 'busy'}>{state === 'busy' ? 'Enviando…' : 'Enviar mensaje'}</button>
    </form>
  );
}
