'use client';
import { useEffect, useState } from 'react';
import { useAdmin } from './AdminShell';

const LABEL: Record<string, string> = { new: 'Nuevo', read: 'Leído', answered: 'Respondido' };
const fmt = (d: string) => new Date(d).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

/** Mensajes del formulario de contacto. Responder abre el correo con el mensaje citado. */
export function Messages() {
  const api = useAdmin();
  const [status, setStatus] = useState('');
  const [rows, setRows] = useState<any[] | null>(null); const [error, setError] = useState('');
  const load = () => api.messages(status || undefined).then(setRows).catch((e: Error) => setError(e.message));
  useEffect(() => { load(); }, [status]); // eslint-disable-line react-hooks/exhaustive-deps
  const mark = async (id: number, st: string) => { await api.setMessageStatus(id, st); load(); };
  return (
    <>
      <div className="row-between admin-head"><h1 className="admin-h">Mensajes</h1>
        <div className="seg" role="tablist">{[['', 'Todos'], ['new', 'Nuevos'], ['read', 'Leídos'], ['answered', 'Respondidos']].map(([k, l]) => <button key={k} role="tab" aria-selected={status === k} className={status === k ? 'on' : ''} onClick={() => setStatus(k)}>{l}</button>)}</div>
      </div>
      {error && <p className="notice notice-error">{error}</p>}
      {!rows ? <p className="muted">Cargando…</p> : rows.length === 0 ? <p className="muted">No hay mensajes{status ? ' en este estado' : ''}. Los que lleguen por el formulario de contacto aparecen aquí y te llegan también al correo.</p> : (
        <div className="msg-list">
          {rows.map((m) => (
            <article key={m.id} className={`msg ${m.status === 'new' ? 'is-new' : ''}`}>
              <div className="msg-head">
                <div><b>{m.name}</b> <span className="muted small">· {fmt(m.createdAt)}</span><br /><a href={`mailto:${m.email}`}>{m.email}</a>{m.phone && <> · <a href={`https://wa.me/${String(m.phone).replace(/\D/g, '').replace(/^(\d{10})$/, '57$1')}`} target="_blank" rel="noreferrer">{m.phone}</a></>}</div>
                <span className={`badge b-${m.status === 'new' ? 'paid' : m.status === 'answered' ? 'delivered' : 'shipped'}`}>{LABEL[m.status]}</span>
              </div>
              <p className="msg-body">{m.message}</p>
              <div className="msg-actions">
                <a className="btn btn-dark btn-sm" href={`mailto:${m.email}?subject=${encodeURIComponent('Re: tu mensaje a Pimentones La Cajita')}&body=${encodeURIComponent(`Hola ${m.name},\n\n\n\n—\nTu mensaje:\n${m.message}`)}`} onClick={() => mark(m.id, 'answered')}>Responder por correo</a>
                {m.status === 'new' && <button className="btn btn-outline btn-sm" onClick={() => mark(m.id, 'read')}>Marcar como leído</button>}
                {m.status !== 'answered' && <button className="btn btn-outline btn-sm" onClick={() => mark(m.id, 'answered')}>Marcar respondido</button>}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
