'use client';
import { useEffect, useState } from 'react';
import { useAdmin } from './AdminShell';

/** Textos de la tienda editables sin tocar código: portada, valores, caja regalo, preguntas frecuentes. */
export function Content() {
  const api = useAdmin();
  const [c, setC] = useState<any>(null); const [msg, setMsg] = useState('');
  useEffect(() => { api.content().then(setC).catch((e: Error) => setMsg(e.message)); }, [api]);
  if (!c) return <p className="muted">{msg || 'Cargando…'}</p>;
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setC({ ...c, [k]: e.target.value });
  const setFaq = (i: number, k: 'q' | 'a', v: string) => setC({ ...c, faq: c.faq.map((f: any, n: number) => (n === i ? { ...f, [k]: v } : f)) });
  return (
    <>
      <h1 className="admin-h">Contenido de la tienda</h1>
      <p className="muted">Los cambios se ven en la tienda en menos de un minuto.</p>
      <form className="panel fields" onSubmit={async (e) => { e.preventDefault(); setMsg(''); try { setC(await api.saveContent({ ...c, faq: c.faq.filter((f: any) => f.q.trim() && f.a.trim()) })); setMsg('Contenido guardado.'); } catch (err) { setMsg((err as Error).message); } }}>
        <label className="field span-2">Frase de marca (portada)<input value={c.heroBrand} onChange={set('heroBrand')} maxLength={80} /></label>
        <label className="field">Lema<input value={c.tagline} onChange={set('tagline')} maxLength={80} placeholder="Productos siempre frescos" /></label>
        <label className="field">Título de Quiénes somos<input value={c.aboutTitle} onChange={set('aboutTitle')} maxLength={80} /></label>
        <label className="field span-2">Texto de Quiénes somos<textarea rows={3} value={c.aboutText} onChange={set('aboutText')} maxLength={600} /></label>
        <label className="field span-2">Video de YouTube (enlace)<input value={c.videoUrl} onChange={set('videoUrl')} maxLength={200} placeholder="https://www.youtube.com/watch?v=…" /></label>
        <label className="field span-2">Misión (texto grande)<textarea rows={3} value={c.mission} onChange={set('mission')} maxLength={400} /></label>
        <label className="field span-2">Valores de la cinta (separados por coma)<input value={c.values.join(', ')} onChange={(e) => setC({ ...c, values: e.target.value.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 12) })} /></label>
        <label className="field">Título de la caja regalo<input value={c.giftTitle} onChange={set('giftTitle')} maxLength={80} /></label>
        <label className="field">Texto de la caja regalo<input value={c.giftText} onChange={set('giftText')} maxLength={300} /></label>
        <label className="field">Título de la foto grande<input value={c.slowTitle} onChange={set('slowTitle')} maxLength={80} /></label>
        <label className="field">Texto de la foto grande<input value={c.slowText} onChange={set('slowText')} maxLength={400} /></label>
        <label className="field span-2">Conservación (ficha de producto)<input value={c.conservation} onChange={set('conservation')} maxLength={300} /></label>
        <div className="span-2"><h2 className="admin-h2">Preguntas frecuentes</h2>
          {c.faq.map((f: any, i: number) => (
            <div key={i} className="faq-edit">
              <input value={f.q} onChange={(e) => setFaq(i, 'q', e.target.value)} placeholder="Pregunta" maxLength={160} />
              <textarea rows={2} value={f.a} onChange={(e) => setFaq(i, 'a', e.target.value)} placeholder="Respuesta" maxLength={600} />
              <button type="button" className="link-btn" onClick={() => setC({ ...c, faq: c.faq.filter((_: any, n: number) => n !== i) })}>Quitar</button>
            </div>
          ))}
          {c.faq.length < 20 && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setC({ ...c, faq: [...c.faq, { q: '', a: '' }] })}>Agregar pregunta</button>}
        </div>
        {msg && <p className="notice span-2" role="status">{msg}</p>}
        <button className="btn btn-primary">Guardar contenido</button>
      </form>
    </>
  );
}
