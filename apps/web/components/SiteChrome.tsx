'use client';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
/** Encabezado y pie de la tienda: no se muestran dentro del backoffice. */
export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return pathname.startsWith('/admin') ? null : <>{children}</>;
}
