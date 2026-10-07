'use client';
import NextLink from 'next/link';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes } from 'react';
import { STATUS_LABEL, type OrderStatus } from '@lacajita/shared';

/** Kit de componentes del backoffice: un solo lenguaje visual y de comportamiento para todos los módulos. */

export const cls = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ');

// ---------------------------------------------------------------------------
// Íconos (trazo 1.8, estilo Lucide) — reemplazan los emojis
// ---------------------------------------------------------------------------
const P: Record<string, string> = {
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  orders: '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  tag: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r="1.2" fill="currentColor"/>',
  layers: '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
  ticket: '<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>',
  truck: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
  inbox: '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  sliders: '<line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  search: '<circle cx="11" cy="11" r="7.5"/><path d="m21 21-4.3-4.3"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  minus: '<path d="M5 12h14"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  checkCircle: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  chevronUp: '<path d="m18 15-6-6-6 6"/>',
  arrowRight: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  arrowUp: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
  arrowDown: '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
  sort: '<path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
  printer: '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/>',
  whatsapp: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/><path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1"/>',
  mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C9.5 3 11 5 12 8c1-3 2.5-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
  menu: '<line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>',
  panelClose: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m16 15-3-3 3-3"/>',
  panelOpen: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m14 9 3 3-3 3"/>',
  calendar: '<rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>',
  trendUp: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  trendDown: '<polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  image: '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  store: '<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2 2.7 2.7 0 0 1-2-1 2.7 2.7 0 0 1-4 0 2.7 2.7 0 0 1-4 0 2.7 2.7 0 0 1-4 0 2.7 2.7 0 0 1-2 1 2 2 0 0 1-2-2V7"/>',
  card: '<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>',
  cash: '<rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>',
  bank: '<line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  grid: '<rect width="7" height="7" x="3" y="3" rx="1.5"/><rect width="7" height="7" x="14" y="3" rx="1.5"/><rect width="7" height="7" x="14" y="14" rx="1.5"/><rect width="7" height="7" x="3" y="14" rx="1.5"/>',
  list: '<line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/>',
  history: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
  key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>',
  more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  reply: '<polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>',
  megaphone: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
  box: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  sparkle: '<path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  play: '<polygon points="6 3 20 12 6 21 6 3"/>',
  filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
  undo: '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  percent: '<line x1="19" x2="5" y1="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
  hash: '<line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  instagram: '<rect width="20" height="20" x="2" y="2" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>',
  smartphone: '<rect width="14" height="20" x="5" y="2" rx="2.5"/><path d="M12 18h.01"/>',
  monitor: '<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>',
  tablet: '<rect width="16" height="20" x="4" y="2" rx="2"/><path d="M12 18h.01"/>',
  pieChart: '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
  zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
};
export type IconName = keyof typeof P | string;
export function Icon({ name, size = 18, className, style }: { name: IconName; size?: number; className?: string; style?: React.CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={cls('ic', className)} style={style} aria-hidden="true" dangerouslySetInnerHTML={{ __html: P[name] ?? '' }} />;
}

// ---------------------------------------------------------------------------
// Formato
// ---------------------------------------------------------------------------
export const money = (n: number) => '$' + Math.round(n || 0).toLocaleString('es-CO');
export const moneyShort = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1_000_000) return '$' + (n / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 }) + ' M';
  if (a >= 1_000) return '$' + Math.round(n / 1_000).toLocaleString('es-CO') + ' mil';
  return '$' + n;
};
export const fmtDate = (d: string | Date) => new Date(d).toLocaleString('es-CO', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
export const fmtDay = (d: string | Date) => new Date(d).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
export const fmtShortDay = (d: string | Date) => new Date(d).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
export function relTime(d: string | Date) {
  const t = new Date(d).getTime(); const s = Math.round((Date.now() - t) / 1000);
  if (s < 0) { const f = -s; if (f < 86400) return 'hoy'; const days = Math.round(f / 86400); return days === 1 ? 'mañana' : `en ${days} días`; }
  if (s < 60) return 'hace un momento';
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  const days = Math.floor(s / 86400);
  if (days === 1) return 'ayer';
  if (days < 7) return `hace ${days} días`;
  if (days < 30) return `hace ${Math.floor(days / 7)} sem`;
  return fmtDay(d);
}
export const daysSince = (d: string | Date) => Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
export const waLink = (phone: string, text?: string) => {
  let n = String(phone || '').replace(/\D/g, ''); if (n.length === 10) n = '57' + n;
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
};
export const plural = (n: number | null | undefined, one: string, many: string) => `${(n ?? 0).toLocaleString('es-CO')} ${(n ?? 0) === 1 ? one : many}`;
export const firstName = (s: string) => (s || '').trim().split(/\s+/)[0] || '';
export const norm = (s: string) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// ---------------------------------------------------------------------------
// Estados de pedido: etiqueta, color, ícono y siguiente paso del flujo
// ---------------------------------------------------------------------------
type Tone = 'green' | 'amber' | 'blue' | 'violet' | 'red' | 'pink' | 'cyan' | 'gray' | 'outline';
export const STATUS_META: Record<string, { label: string; tone: Tone; icon: string }> = {
  pending: { label: STATUS_LABEL.pending, tone: 'amber', icon: 'clock' },
  paid: { label: 'Pagado · por preparar', tone: 'violet', icon: 'card' },
  preparing: { label: STATUS_LABEL.preparing, tone: 'blue', icon: 'box' },
  shipped: { label: STATUS_LABEL.shipped, tone: 'cyan', icon: 'truck' },
  delivered: { label: STATUS_LABEL.delivered, tone: 'green', icon: 'checkCircle' },
  cancelled: { label: STATUS_LABEL.cancelled, tone: 'gray', icon: 'x' },
  failed: { label: STATUS_LABEL.failed, tone: 'red', icon: 'alert' },
  refunded: { label: STATUS_LABEL.refunded, tone: 'gray', icon: 'undo' },
};
export const NEXT_STEP: Partial<Record<OrderStatus, { to: OrderStatus; label: string; short: string; icon: string; help: string }>> = {
  pending: { to: 'paid', label: 'Confirmar pago', short: 'Confirmar pago', icon: 'check', help: 'Verifica el comprobante de la transferencia (o acuerda el pago contraentrega) antes de confirmar.' },
  paid: { to: 'preparing', label: 'Empezar a preparar', short: 'Preparar', icon: 'box', help: 'Empaca los frascos. Si es regalo, imprime la tarjeta de dedicatoria.' },
  preparing: { to: 'shipped', label: 'Marcar como enviado', short: 'Despachar', icon: 'truck', help: 'Registra la transportadora y la guía. El cliente recibe un correo con el seguimiento.' },
  shipped: { to: 'delivered', label: 'Confirmar entrega', short: 'Entregado', icon: 'checkCircle', help: 'Marca el pedido como entregado cuando la transportadora lo confirme.' },
};
export function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] ?? { label: status, tone: 'gray' as Tone };
  return <Badge tone={m.tone} dot>{m.label}</Badge>;
}

// ---------------------------------------------------------------------------
// Primitivas
// ---------------------------------------------------------------------------
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-solid' | 'dark' | 'soft' | 'success'; size?: 'sm' | 'md' | 'lg'; icon?: IconName; iconRight?: IconName; loading?: boolean; block?: boolean; iconOnly?: boolean };
export function Button({ variant = 'secondary', size = 'md', icon, iconRight, loading, block, iconOnly, children, className, type = 'button', disabled, ...rest }: BtnProps) {
  const s = size === 'sm' ? 15 : 16;
  return (
    <button type={type} className={cls('bo-btn', `bo-btn--${variant}`, size !== 'md' && `bo-btn--${size}`, iconOnly && 'bo-btn--icon', block && 'bo-btn--block', className)} disabled={disabled || loading} {...rest}>
      {loading ? <span className="bo-spin" /> : icon && <Icon name={icon} size={s} />}
      {children}
      {iconRight && !loading && <Icon name={iconRight} size={s} />}
    </button>
  );
}
export function LinkButton({ href, variant = 'secondary', size = 'md', icon, iconRight, children, className, external, onClick }: { href: string; variant?: BtnProps['variant']; size?: BtnProps['size']; icon?: IconName; iconRight?: IconName; children?: ReactNode; className?: string; external?: boolean; onClick?: () => void }) {
  const s = size === 'sm' ? 15 : 16;
  const c = cls('bo-btn', `bo-btn--${variant}`, size !== 'md' && `bo-btn--${size}`, !children && 'bo-btn--icon', className);
  const inner = <>{icon && <Icon name={icon} size={s} />}{children}{iconRight && <Icon name={iconRight} size={s} />}</>;
  if (isInternal(href) && !external) return <NextLink href={href} prefetch={true} onClick={onClick} className={c}>{inner}</NextLink>;
  return <a href={href} onClick={onClick} className={c} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}>{inner}</a>;
}
/** Enlaces dentro del backoffice: navegación sin recargar la página. */
export const isInternal = (href?: string) => !!href && href.startsWith('/admin');
export function Badge({ tone = 'gray', dot, children, icon }: { tone?: Tone; dot?: boolean; children: ReactNode; icon?: IconName }) {
  return <span className={cls('bo-badge', `bo-badge--${tone}`)}>{dot && <i />}{icon && <Icon name={icon} size={13} />}{children}</span>;
}
export function Card({ title, description, actions, children, className, bodyClass, flush, footer }: { title?: ReactNode; description?: ReactNode; actions?: ReactNode; children?: ReactNode; className?: string; bodyClass?: string; flush?: boolean; footer?: ReactNode }) {
  return (
    <section className={cls('bo-card', className)}>
      {(title || actions) && <div className="bo-card-head"><div>{title && <h2>{title}</h2>}{description && <p>{description}</p>}</div>{actions && <div className="bo-row">{actions}</div>}</div>}
      {flush ? children : <div className={cls('bo-card-body', bodyClass)}>{children}</div>}
      {footer && <div className="bo-card-foot">{footer}</div>}
    </section>
  );
}
export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return <header className="bo-page-head"><div><h1>{title}</h1>{description && <p>{description}</p>}</div>{actions && <div className="bo-page-actions">{actions}</div>}</header>;
}
/**
 * Vistas de una lista. Una sola línea, sin íconos (el texto basta) y el contador
 * solo aparece si aporta: cuando hay algo (> 0) o en la vista activa.
 */
export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: string; count?: number; alert?: boolean; icon?: IconName }[] }) {
  return (
    <div className="bo-tabs" role="tablist">
      {items.map((it) => {
        const on = value === it.value;
        const showCount = it.count != null && (it.count > 0 || on);
        return (
          <button key={it.value} type="button" role="tab" aria-selected={on} className={cls('bo-tab', on && 'is-active')} onClick={() => onChange(it.value)}>
            <span>{it.label}</span>
            {showCount && <span className={cls('bo-tab-count', it.alert && it.count! > 0 && 'is-alert')}>{it.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Filtros secundarios agrupados en un solo botón «Filtros».
 * Al abrir: un panel con cada grupo como lista de opciones. Los filtros aplicados
 * se muestran al lado como píldoras que se quitan con un clic.
 */
export type FilterGroup = { key: string; label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; defaultValue?: string };
export function FilterMenu({ groups, label = 'Filtros', align }: { groups: FilterGroup[]; label?: string; align?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useOutside(ref, close, open);
  const def = (g: FilterGroup) => g.defaultValue ?? g.options[0]?.value ?? '';
  const active = groups.filter((g) => g.value !== def(g));
  const clearAll = () => groups.forEach((g) => g.onChange(def(g)));
  return (
    <>
      <div className="bo-filter" ref={ref}>
        <button type="button" className={cls('bo-filter-btn', open && 'is-open', active.length > 0 && 'has-active')} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="dialog">
          <Icon name="sliders" size={15} />
          {label}
          {active.length > 0 && <span className="n">{active.length}</span>}
        </button>
        {open && (
          <div className={cls('bo-filter-pop', align === 'right' && 'is-right')} role="dialog" aria-label={label}>
            {groups.map((g) => (
              <div key={g.key} className="bo-filter-group" role="radiogroup" aria-label={g.label}>
                <div className="bo-filter-group-label">{g.label}</div>
                {g.options.map((o) => {
                  const on = g.value === o.value;
                  return (
                    <button key={o.value} type="button" role="radio" aria-checked={on} className={cls('bo-filter-opt', on && 'is-on')} onClick={() => g.onChange(o.value)}>
                      <span>{o.label}</span>
                      {on && <Icon name="check" size={15} />}
                    </button>
                  );
                })}
              </div>
            ))}
            <div className="bo-filter-foot">
              {active.length > 0 ? <button type="button" className="bo-link" onClick={clearAll}>Limpiar filtros</button> : <span className="small muted">Sin filtros aplicados</span>}
              <Button size="sm" variant="primary" onClick={close}>Listo</Button>
            </div>
          </div>
        )}
      </div>
      {active.map((g) => {
        const o = g.options.find((x) => x.value === g.value);
        return (
          <span key={g.key} className="bo-filter-pill">
            {g.label}: <b>{o?.label ?? g.value}</b>
            <button type="button" onClick={() => g.onChange(def(g))} aria-label={`Quitar filtro ${g.label}`}><Icon name="x" size={12} /></button>
          </span>
        );
      })}
    </>
  );
}

/** Orden de la lista: un texto discreto «Más recientes ▾» en vez de un select con caja. */
export function SortMenu<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  const cur = options.find((o) => o.value === value);
  return (
    <Menu
      trigger={(toggle, isOpen) => (
        <button type="button" className={cls('bo-sort-btn', isOpen && 'is-open')} onClick={toggle} aria-label="Ordenar lista">
          <Icon name="sort" size={15} />
          <span>Orden: <b>{cur?.label ?? '—'}</b></span>
          <Icon name="chevronDown" size={14} />
        </button>
      )}
      items={[{ group: 'Ordenar por' }, ...options.map((o) => ({ label: o.label, icon: (o.value === value ? 'check' : undefined) as IconName | undefined, onClick: () => onChange(o.value) }))]}
    />
  );
}
export function Segmented<T extends string | number>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: ReactNode; icon?: IconName; title?: string }[] }) {
  return (
    <div className="bo-seg" role="tablist">
      {items.map((it) => (
        <button
          key={String(it.value)}
          type="button"
          role="tab"
          title={it.title}
          aria-selected={value === it.value}
          className={cls('bo-seg-item', value === it.value && 'is-active')}
          onClick={() => onChange(it.value)}
        >
          {it.icon && <Icon name={it.icon} size={15} />}
          <span>{it.label}</span>
        </button>
      ))}
    </div>
  );
}
const AVATAR_PALETTES = [
  { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' }, // Rojo pimentón (Marca La Cajita)
  { bg: '#ffedd5', color: '#9a3412', border: '#fdba74' }, // Terracota cálido
  { bg: '#fef3c7', color: '#92400e', border: '#fcd34d' }, // Ámbar dorado
  { bg: '#e0f2fe', color: '#075985', border: '#7dd3fc' }, // Azul cielo
  { bg: '#f3e8ff', color: '#6b21a8', border: '#d8b4fe' }, // Violeta suave
  { bg: '#fce7f3', color: '#9d174d', border: '#f472b6' }, // Frambuesa
  { bg: '#ecfdf5', color: '#065f46', border: '#a7f3d0' }, // Salvia
  { bg: '#f1f5f9', color: '#1e293b', border: '#cbd5e1' }, // Pizarra neutral
];

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const n = (name || '?').trim();
  const parts = n.split(/\s+/).filter(Boolean);
  const ini = ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?';
  let h = 0;
  for (const c of n) h = (h * 31 + c.charCodeAt(0)) % 360;
  const p = AVATAR_PALETTES[Math.abs(h) % AVATAR_PALETTES.length];
  return (
    <span
      className="bo-avatar"
      style={{
        width: size,
        height: size,
        fontSize: Math.max(11, Math.round(size * 0.4)),
        backgroundColor: p.bg,
        color: p.color,
        border: `1.5px solid ${p.border}`,
      }}
      aria-hidden="true"
    >
      {ini}
    </span>
  );
}
export function Thumb({ src, size = 40, alt = '' }: { src?: string | null; size?: number; alt?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [src]);
  if (!src || failed) return <span className="bo-thumb bo-thumb-empty" style={{ width: size, height: size }}><Icon name="image" size={size * 0.45} /></span>;
  return <img className="bo-thumb" src={src} alt={alt} width={size} height={size} onError={() => setFailed(true)} style={{ width: size, height: size, objectFit: 'contain', background: '#fff' }} />;
}
export function Bar({ value, max = 100, color, lg }: { value: number; max?: number; color?: string; lg?: boolean }) {
  const pct = Math.max(0, Math.min(100, max ? (value / max) * 100 : 0));
  return <div className={cls('bo-bar', lg && 'bo-bar--lg')}><span style={{ width: `${pct}%`, ...(color ? { background: color } : {}) }} /></div>;
}
export function Delta({ value, suffix = 'vs. periodo anterior' }: { value: number | null | undefined; suffix?: string }) {
  if (value == null) {
    return (
      <span className="bo-delta bo-delta--neutral" title="Sin periodo previo comparable">
        <i className="bo-delta-dot" />
        <span>Base inicial</span>
      </span>
    );
  }
  const dir = value > 0 ? 'up' : value < 0 ? 'down' : 'flat';
  return (
    <div className="bo-delta-wrap">
      <span className={cls('bo-delta', dir)}>
        {dir === 'up' && <Icon name="arrowUp" size={12} />}
        {dir === 'down' && <Icon name="arrowDown" size={12} />}
        {dir === 'flat' && '—'}
        {Math.abs(value)}%
      </span>
      <span className="bo-delta-suffix">{suffix}</span>
    </div>
  );
}
export function Sparkline({ data, color = '#1b7a47' }: { data: number[]; color?: string }) {
  // Una sola barra no es tendencia: se necesitan al menos 2 días con movimiento.
  if (data.length < 2 || data.filter((v) => v > 0).length < 2) return null;
  const max = Math.max(...data, 1); const w = 96; const h = 34;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - 3 - (v / max) * (h - 6)]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const id = 'sp' + color.replace('#', '');
  return (
    <svg className="bo-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id={id} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".22" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={`${d} L${w},${h} L0,${h} Z`} fill={`url(#${id})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
export function Stat({ label, value, icon, delta, hint, spark, tone }: { label: string; value: ReactNode; icon?: IconName; delta?: number | null; hint?: ReactNode; spark?: number[]; tone?: string }) {
  return (
    <div className="bo-card bo-stat">
      <div className="bo-stat-head">
        <span className="bo-stat-label">{label}</span>
        {icon && (
          <span className="bo-stat-icon" style={tone ? { background: tone + '14', color: tone, borderColor: tone + '28' } : undefined}>
            <Icon name={icon} size={16} />
          </span>
        )}
      </div>
      <div className="bo-stat-value">{value}</div>
      <div className="bo-stat-foot">{delta !== undefined ? <Delta value={delta} /> : hint}</div>
      {spark && <Sparkline data={spark} color={tone} />}
    </div>
  );
}
export function EmptyState({ icon = 'inbox', title, children, action, small }: { icon?: IconName; title: string; children?: ReactNode; action?: ReactNode; small?: boolean }) {
  return <div className={cls('bo-empty', small && 'bo-empty--sm')}><span className="bo-empty-icon"><Icon name={icon} size={22} /></span><h3>{title}</h3>{children && <div className="bo-empty-desc">{children}</div>}{action}</div>;
}
export function Skeleton({ w = '100%', h = 14, r = 6, style }: { w?: number | string; h?: number; r?: number; style?: React.CSSProperties }) {
  return <span className="bo-skel" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}
export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div style={{ padding: '6px 16px 16px' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: `2fr repeat(${cols - 1}, 1fr)`, gap: 24, padding: '14px 0', borderBottom: '1px solid var(--line)', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Skeleton w={32} h={32} r={16} /><div style={{ flex: 1 }}><Skeleton w="60%" /><Skeleton w="40%" h={10} style={{ marginTop: 6 }} /></div></div>
          {Array.from({ length: cols - 1 }).map((__, j) => <Skeleton key={j} w={`${50 + ((i + j) % 3) * 15}%`} />)}
        </div>
      ))}
    </div>
  );
}
export function PageSkeleton() {
  return (
    <div>
      <div style={{ margin: '16px 0 24px' }}><Skeleton w={220} h={28} /><Skeleton w={360} h={14} style={{ marginTop: 10 }} /></div>
      <div className="bo-grid bo-grid-4" style={{ marginBottom: 16 }}>{[0, 1, 2, 3].map((i) => <div key={i} className="bo-card bo-stat"><Skeleton w="50%" /><Skeleton w="70%" h={26} style={{ marginTop: 14 }} /><Skeleton w="40%" h={10} style={{ marginTop: 12 }} /></div>)}</div>
      <div className="bo-card"><TableSkeleton /></div>
    </div>
  );
}

// Formularios
export function Field({ label, hint, error, optional, counter, max, children, className, group }: { label?: ReactNode; hint?: ReactNode; error?: string; optional?: boolean; counter?: number; max?: number; children: ReactNode; className?: string; group?: boolean }) {
  const Tag = group ? 'div' : 'label';
  return (
    <Tag className={cls('bo-field', className)} {...(group ? { role: 'group' } : {})}>
      {label && <span className="bo-field-label"><span>{label}{optional && <em> · opcional</em>}</span>{max != null && counter != null && <span className={cls('bo-counter', counter > max * 0.9 && 'is-near')}>{counter}/{max}</span>}</span>}
      {children}
      {error ? <span className="bo-field-error"><Icon name="alert" size={13} />{error}</span> : hint && <span className="bo-field-hint">{hint}</span>}
    </Tag>
  );
}
export const Input = ({ className, sm, ...p }: InputHTMLAttributes<HTMLInputElement> & { sm?: boolean }) => <input className={cls('bo-input', sm && 'bo-input--sm', className)} {...p} />;
export const Textarea = ({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea className={cls('bo-textarea', className)} {...p} />;
export const Select = ({ className, sm, children, ...p }: SelectHTMLAttributes<HTMLSelectElement> & { sm?: boolean }) => <select className={cls('bo-select', sm && 'bo-select--sm', className)} {...p}>{children}</select>;
export function Affix({ pre, suf, icon, children }: { pre?: ReactNode; suf?: ReactNode; icon?: IconName; children: ReactNode }) {
  return <div className={cls('bo-affix', !!pre && 'has-pre', !!icon && 'has-pre-icon', !!suf && 'has-suf')}>{icon && <span className="bo-affix-pre"><Icon name={icon} size={16} /></span>}{pre && <span className="bo-affix-pre">{pre}</span>}{children}{suf && <span className="bo-affix-suf">{suf}</span>}</div>;
}
/** Campo de dinero: muestra $ 24.000 mientras se escribe, guarda número. */
export function MoneyInput({ value, onChange, ...p }: { value: number; onChange: (n: number) => void } & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return <Affix pre="$"><Input inputMode="numeric" value={value ? value.toLocaleString('es-CO') : value === 0 ? '0' : ''} onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, '')) || 0)} {...p} /></Affix>;
}
export function SearchInput({ value, onChange, placeholder = 'Buscar…', autoFocus, className }: { value: string; onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean; className?: string }) {
  return (
    <div className={cls('bo-affix has-pre-icon bo-search', value && 'has-suf', className)}>
      <span className="bo-affix-pre"><Icon name="search" size={16} /></span>
      <input className="bo-input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoFocus={autoFocus} aria-label={placeholder} />
      {value && <button type="button" className="bo-affix-suf" style={{ pointerEvents: 'auto', color: 'var(--faint)' }} onClick={() => onChange('')} aria-label="Limpiar búsqueda"><Icon name="x" size={15} /></button>}
    </div>
  );
}
export function Toggle({ checked, onChange, label, description, disabled, small }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode; description?: ReactNode; disabled?: boolean; small?: boolean }) {
  return (
    <label className={cls('bo-toggle', small && 'bo-toggle--sm')} onClick={(e) => e.stopPropagation()}>
      <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="bo-toggle-track" />
      {(label || description) && <span className="bo-toggle-text">{label && <b>{label}</b>}{description && <span>{description}</span>}</span>}
    </label>
  );
}
export function Chips<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: string; icon?: IconName }[] }) {
  return <div className="bo-chips">{items.map((it) => <button type="button" key={it.value} className={cls('bo-chip', value === it.value && 'is-active')} onClick={() => onChange(it.value)}>{it.icon && <Icon name={it.icon} size={14} />}{it.label}</button>)}</div>;
}
export function Kv({ rows }: { rows: [ReactNode, ReactNode][] }) {
  return <dl className="bo-kv">{rows.filter((r) => r[1] != null && r[1] !== '').map(([k, v], i) => <div key={i} style={{ display: 'contents' }}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>;
}
export function SortTh<K extends string>({ k, sort, setSort, children, className }: { k: K; sort: { key: K; dir: 1 | -1 }; setSort: (s: { key: K; dir: 1 | -1 }) => void; children: ReactNode; className?: string }) {
  const on = sort.key === k;
  return <th className={cls('is-sortable', className)} onClick={() => setSort({ key: k, dir: on ? (sort.dir === 1 ? -1 : 1) : -1 })} aria-sort={on ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>{children}<Icon name={on ? (sort.dir === 1 ? 'chevronUp' : 'chevronDown') : 'sort'} size={13} style={{ opacity: on ? 1 : 0.4 }} /></th>;
}
export function Pager({ page, pages, total, perPage, onPage }: { page: number; pages: number; total: number; perPage: number; onPage: (p: number) => void }) {
  if (total <= perPage) return null;
  const from = page * perPage + 1; const to = Math.min(total, (page + 1) * perPage);
  return <div className="bo-pager"><span>{from}–{to} de {total}</span><div className="bo-row"><Button size="sm" icon="chevronLeft" disabled={page === 0} onClick={() => onPage(page - 1)}>Anterior</Button><Button size="sm" iconRight="chevronRight" disabled={page >= pages - 1} onClick={() => onPage(page + 1)}>Siguiente</Button></div></div>;
}

// ---------------------------------------------------------------------------
// Menú contextual, Drawer, Modal
// ---------------------------------------------------------------------------
export function useOutside(ref: React.RefObject<HTMLElement | null>, onOut: () => void, active = true) {
  useEffect(() => {
    if (!active) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onOut(); };
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onOut(); };
    document.addEventListener('mousedown', h); document.addEventListener('keydown', k);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', k); };
  }, [ref, onOut, active]);
}
export type MenuItem = { label: string; icon?: IconName; onClick?: () => void; href?: string; external?: boolean; danger?: boolean; hidden?: boolean } | 'sep' | { group: string };
export function Menu({ trigger, items, up, left }: { trigger: (open: () => void, isOpen: boolean) => ReactNode; items: MenuItem[]; up?: boolean; left?: boolean }) {
  const [open, setOpen] = useState(false); const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useOutside(ref, close, open);
  return (
    <div className="bo-menu-wrap" ref={ref} onClick={(e) => e.stopPropagation()}>
      {trigger(() => setOpen((o) => !o), open)}
      {open && (
        <div className={cls('bo-menu', up && 'is-up', left && 'is-left')} role="menu">
          {items.map((it, i) => {
            if (it === 'sep') return <div key={i} className="bo-menu-sep" />;
            if ('group' in it) return <div key={i} className="bo-menu-label">{it.group}</div>;
            if (it.hidden) return null;
            const inner = <>{it.icon && <Icon name={it.icon} size={16} />}{it.label}</>;
            return it.href && isInternal(it.href) && !it.external
              ? <NextLink key={i} role="menuitem" prefetch={true} className={cls('bo-menu-item', it.danger && 'is-danger')} href={it.href} onClick={() => { it.onClick?.(); setOpen(false); }}>{inner}</NextLink>
              : it.href
              ? <a key={i} role="menuitem" className={cls('bo-menu-item', it.danger && 'is-danger')} href={it.href} {...(it.external ? { target: '_blank', rel: 'noreferrer' } : {})} onClick={() => { it.onClick?.(); setOpen(false); }}>{inner}</a>
              : <button key={i} role="menuitem" className={cls('bo-menu-item', it.danger && 'is-danger')} onClick={() => { setOpen(false); it.onClick?.(); }}>{inner}</button>;
          })}
        </div>
      )}
    </div>
  );
}
function useLockScroll(on: boolean) {
  useEffect(() => { if (!on) return; const o = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = o; }; }, [on]);
}
export function Drawer({ open, onClose, title, subtitle, actions, children, footer, size }: { open: boolean; onClose: () => void; title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode; footer?: ReactNode; size?: 'md' | 'lg' }) {
  useLockScroll(open);
  useEffect(() => { if (!open) return; const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('.bo-modal')) onClose(); }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, [open, onClose]);
  if (!open) return null;
  return (
    <>
      <div className="bo-overlay" onClick={onClose} />
      <aside className={cls('bo-drawer', size && `bo-drawer--${size}`)} role="dialog" aria-modal="true">
        <header className="bo-drawer-head">
          <div style={{ minWidth: 0 }}><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
          <div className="bo-drawer-head-actions">{actions}<Button variant="ghost" iconOnly icon="x" onClick={onClose} aria-label="Cerrar" /></div>
        </header>
        <div className="bo-drawer-body">{children}</div>
        {footer && <footer className="bo-drawer-foot">{footer}</footer>}
      </aside>
    </>
  );
}
export function Modal({ open, onClose, children, wide }: { open: boolean; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => { if (!open) return; const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }; document.addEventListener('keydown', k, true); return () => document.removeEventListener('keydown', k, true); }, [open, onClose]);
  if (!open) return null;
  return <><div className="bo-overlay is-top" onClick={onClose} /><div className={cls('bo-modal', wide && 'bo-modal--wide')} role="dialog" aria-modal="true">{children}</div></>;
}
export function Section({ title, action, children }: { title: ReactNode; action?: ReactNode; children: ReactNode }) {
  return <section className="bo-dsec"><div className="bo-dsec-title"><span>{title}</span>{action}</div>{children}</section>;
}

// ---------------------------------------------------------------------------
// Toasts y confirmación (proveedor global)
// ---------------------------------------------------------------------------
type ToastT = { id: number; kind: 'success' | 'error' | 'info'; text: string };
type ConfirmOpts = { title: string; body?: ReactNode; confirm?: string; cancel?: string; danger?: boolean; icon?: IconName };
const UICtx = createContext<{ toast: (text: string, kind?: ToastT['kind']) => void; confirm: (o: ConfirmOpts) => Promise<boolean> } | null>(null);
export function UIProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastT[]>([]);
  const [dlg, setDlg] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);
  const toast = useCallback((text: string, kind: ToastT['kind'] = 'success') => {
    const id = Date.now() + Math.random(); setToasts((t) => [...t.slice(-3), { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 6000 : 3500);
  }, []);
  const confirm = useCallback((o: ConfirmOpts) => new Promise<boolean>((resolve) => setDlg({ ...o, resolve })), []);
  const done = (v: boolean) => { dlg?.resolve(v); setDlg(null); };
  const value = useMemo(() => ({ toast, confirm }), [toast, confirm]);
  return (
    <UICtx.Provider value={value}>
      {children}
      <div className="bo-toasts" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className={cls('bo-toast', `bo-toast--${t.kind}`)}><Icon name={t.kind === 'error' ? 'alert' : t.kind === 'info' ? 'info' : 'checkCircle'} size={18} />{t.text}<button onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} aria-label="Cerrar"><Icon name="x" size={14} /></button></div>)}
      </div>
      <Modal open={!!dlg} onClose={() => done(false)}>
        {dlg && <>
          <span className="bo-modal-icon" style={{ background: dlg.danger ? 'var(--red-50)' : 'var(--brand-50)', color: dlg.danger ? 'var(--red)' : 'var(--brand)' }}><Icon name={dlg.icon ?? (dlg.danger ? 'alert' : 'info')} size={20} /></span>
          <h3>{dlg.title}</h3>{dlg.body && <p>{dlg.body}</p>}
          <div className="bo-modal-actions"><Button onClick={() => done(false)}>{dlg.cancel ?? 'Cancelar'}</Button><Button variant={dlg.danger ? 'danger-solid' : 'primary'} onClick={() => done(true)} autoFocus>{dlg.confirm ?? 'Confirmar'}</Button></div>
        </>}
      </Modal>
    </UICtx.Provider>
  );
}
export const useUI = () => useContext(UICtx)!;

// ---------------------------------------------------------------------------
// Utilidades de interacción
// ---------------------------------------------------------------------------
export async function copyText(text: string) { try { await navigator.clipboard.writeText(text); return true; } catch { return false; } }
export function useDebounced<T>(value: T, ms = 200) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}
/** Avisa al salir de la página si hay cambios sin guardar. */
export function useUnsavedGuard(dirty: boolean) {
  useEffect(() => { if (!dirty) return; const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; }; window.addEventListener('beforeunload', h); return () => window.removeEventListener('beforeunload', h); }, [dirty]);
}
export function SaveBar({ dirty, saving, onSave, onDiscard, label = 'Tienes cambios sin guardar' }: { dirty: boolean; saving?: boolean; onSave: () => void; onDiscard: () => void; label?: string }) {
  if (!dirty) return null;
  return (
    <aside className="bo-savebar" role="region" aria-label="Cambios sin guardar">
      <div className="bo-savebar-info">
        <span className="bo-savebar-badge">
          <span className="bo-savebar-pulsing-dot" aria-hidden="true" />
          <Icon name="edit" size={14} />
        </span>
        <div className="bo-savebar-text">
          <span className="bo-savebar-title">{label}</span>
          <span className="bo-savebar-sub">Guarda para actualizar la tienda pública inmediatamente</span>
        </div>
      </div>

      <div className="bo-savebar-actions">
        <button
          type="button"
          className="bo-savebar-btn bo-savebar-btn--discard"
          onClick={onDiscard}
          disabled={saving}
          title="Revertir y descartar cambios"
        >
          <Icon name="undo" size={14} />
          <span>Descartar</span>
        </button>

        <button
          type="button"
          className="bo-savebar-btn bo-savebar-btn--save"
          onClick={onSave}
          disabled={saving}
          title="Guardar cambios y sincronizar"
        >
          {saving ? (
            <>
              <span className="bo-spin" style={{ width: 14, height: 14, borderWidth: 2 }} />
              <span>Guardando...</span>
            </>
          ) : (
            <>
              <Icon name="check" size={15} />
              <span>Guardar cambios</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
