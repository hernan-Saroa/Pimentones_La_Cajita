'use client';
import { useEffect, useState } from 'react';
import { useAdmin } from './AdminShell';

export function Settings() {
  const api = useAdmin();
  const [s, setS] = useState<Record<string, string> | null>(null); const [msg, setMsg] = useState('');
  useEffect(() => { api.settings().then(setS).catch((e: Error) => setMsg(e.message)); }, [api]);
  if (!s) return <p className="muted">{msg || 'Cargando…'}</p>;
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setS({ ...s, [k]: e.target.value });
  return (
    <>
      <h1 className="admin-h">Envíos y pagos</h1>
      <form className="panel fields" onSubmit={async (e) => { e.preventDefault(); setMsg(''); try { setS(await api.saveSettings(s)); setMsg('Ajustes guardados.'); } catch (err) { setMsg((err as Error).message); } }}>
        <label className="field">Envío nacional (COP)<input type="number" min={0} value={s.shipping_flat || ''} onChange={set('shipping_flat')} /></label>
        <label className="field">Envío gratis desde (COP, 0 = nunca)<input type="number" min={0} value={s.shipping_free_from || ''} onChange={set('shipping_free_from')} /></label>
        <label className="field">Ciudad con tarifa local<input value={s.shipping_local_city || ''} onChange={set('shipping_local_city')} /></label>
        <label className="field">Tarifa local (COP)<input type="number" min={0} value={s.shipping_local || ''} onChange={set('shipping_local')} /></label>
        <label className="field">WhatsApp de la tienda (con 57)<input value={s.whatsapp || ''} onChange={set('whatsapp')} placeholder="573001234567" /></label>
        <label className="field">Correo de contacto<input type="email" value={s.contact_email || ''} onChange={set('contact_email')} placeholder="contacto@pimentoneslacajita.com" /></label>
        <label className="field">Teléfono visible<input value={s.contact_phone || ''} onChange={set('contact_phone')} placeholder="+57 310 334 7621" /></label>
        <label className="field">Ciudad<input value={s.contact_city || ''} onChange={set('contact_city')} placeholder="Bogotá, Colombia" /></label>
        <label className="field">Instagram (sin @)<input value={s.instagram || ''} onChange={set('instagram')} placeholder="pimentones_la_cajita" /></label>
        <label className="field span-2">Instrucciones para pago por transferencia<textarea rows={3} value={s.transfer_instructions || ''} onChange={set('transfer_instructions')} /></label>
        {msg && <p className="notice span-2" role="status">{msg}</p>}
        <button className="btn btn-primary">Guardar ajustes</button>
      </form>
      <p className="muted small">Las llaves de Wompi y el correo se configuran en el servidor (variables de entorno), no aquí.</p>
    </>
  );
}
