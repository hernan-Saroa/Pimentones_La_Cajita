'use client';
import type { z } from 'zod';
import { EventsBatchSchema } from '@lacajita/shared';

type Ev = z.infer<typeof EventsBatchSchema>['events'][number];
type Type = Ev['type'];

/**
 * Analítica propia del embudo: anónima, sin cookies de terceros. Un id de sesión aleatorio en el dispositivo
 * y lotes de eventos que se envían en segundo plano (y al salir de la página con sendBeacon).
 */
const KEY = 'lacajita.sid';
const queue: Ev[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

export function sessionId(): string {
  try {
    let s = sessionStorage.getItem(KEY);
    if (!s) { s = Math.random().toString(36).slice(2, 10) + Date.now().toString(36); sessionStorage.setItem(KEY, s); }
    return s;
  } catch { return 'anon-' + Math.random().toString(36).slice(2, 12); }
}

function flush(beacon = false) {
  if (!queue.length) return;
  const body = JSON.stringify({ sessionId: sessionId(), events: queue.splice(0, 50) });
  if (beacon && navigator.sendBeacon) { navigator.sendBeacon('/api/events', new Blob([body], { type: 'application/json' })); return; }
  fetch('/api/events', { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).catch(() => {});
}

export function track(type: Type, data: Omit<Ev, 'type' | 'at'> = {}) {
  if (typeof window === 'undefined') return;
  if (navigator.doNotTrack === '1') return;   // se respeta la preferencia del navegador
  queue.push({ type, at: Date.now(), path: data.path ?? location.pathname, ...data });
  if (!timer) timer = setTimeout(() => { timer = null; flush(); }, 2500);
}

/** Una sola vez por sesión y por clave (p. ej., compra de un pedido). */
export function trackOnce(key: string, type: Type, data: Omit<Ev, 'type' | 'at'> = {}) {
  try { if (sessionStorage.getItem('lacajita.ev.' + key)) return; sessionStorage.setItem('lacajita.ev.' + key, '1'); } catch { /* */ }
  track(type, data);
}

if (typeof window !== 'undefined') {
  addEventListener('pagehide', () => flush(true));
  addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(true); });
}
