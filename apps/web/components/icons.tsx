import type { SVGProps } from 'react';
const base: SVGProps<SVGSVGElement> = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
type P = SVGProps<SVGSVGElement>;
export const Bag = (p: P) => <svg {...base} {...p}><path d="M5 8h14l-1.1 11.1a2 2 0 0 1-2 1.9H8.1a2 2 0 0 1-2-1.9L5 8Z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></svg>;
export const Leaf = (p: P) => <svg {...base} {...p}><path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14" /><path d="M5 19 13 11" /></svg>;
export const Truck = (p: P) => <svg {...base} {...p}><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="18" r="1.6" /><circle cx="17.5" cy="18" r="1.6" /></svg>;
export const Lock = (p: P) => <svg {...base} {...p}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>;
export const Plus = (p: P) => <svg {...base} {...p}><path d="M12 6v12M6 12h12" /></svg>;
export const Minus = (p: P) => <svg {...base} {...p}><path d="M6 12h12" /></svg>;
export const Close = (p: P) => <svg {...base} {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>;
export const Arrow = (p: P) => <svg {...base} {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
export const Back = (p: P) => <svg {...base} {...p}><path d="M15 6l-6 6 6 6" /></svg>;
export const Chevron = (p: P) => <svg {...base} {...p}><path d="M6 9l6 6 6-6" /></svg>;
export const Star = (p: P) => <svg {...base} width={16} height={16} fill="currentColor" stroke="none" viewBox="0 0 24 24" {...p}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>;
export const Sparkle = (p: P) => <svg {...base} width={16} height={16} viewBox="0 0 24 24" {...p}><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" /></svg>;
export const Fire = (p: P) => <svg {...base} width={18} height={18} viewBox="0 0 24 24" {...p}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3.5z" /></svg>;
export const Check = (p: P) => <svg {...base} width={16} height={16} viewBox="0 0 24 24" {...p}><polyline points="20 6 9 17 4 12" /></svg>;
export const WhatsApp = (p: P) => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true" {...p}>
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM12.04 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.16 12.04 20.16C10.66 20.16 9.3 19.81 8.1 19.14L7.81 18.97L4.69 19.79L5.52 16.75L5.34 16.45C4.61 15.22 4.22 13.58 4.22 11.91C4.22 7.37 7.92 3.67 12.04 3.67ZM8.73 7.34C8.54 7.34 8.24 7.41 7.98 7.69C7.72 7.97 7 8.65 7 10.02C7 11.39 8 12.72 8.14 12.91C8.28 13.1 10.11 15.91 12.89 17.11C13.55 17.4 14.07 17.57 14.47 17.7C15.13 17.91 15.74 17.88 16.21 17.81C16.74 17.73 17.84 17.14 18.07 16.5C18.3 15.86 18.3 15.31 18.23 15.19C18.16 15.07 17.97 15 17.69 14.86C17.41 14.72 16.03 14.04 15.77 13.95C15.52 13.86 15.33 13.81 15.15 14.09C14.96 14.37 14.43 15 14.27 15.19C14.11 15.37 13.94 15.4 13.66 15.26C13.38 15.12 12.49 14.83 11.44 13.9C10.62 13.17 10.07 12.27 9.91 11.99C9.75 11.71 9.89 11.56 10.03 11.42C10.16 11.29 10.32 11.08 10.46 10.92C10.6 10.76 10.65 10.64 10.74 10.46C10.83 10.27 10.78 10.11 10.71 9.97C10.64 9.83 10.09 8.47 9.85 7.91C9.63 7.37 9.39 7.44 9.22 7.43C9.06 7.42 8.87 7.34 8.73 7.34Z" />
  </svg>
);

