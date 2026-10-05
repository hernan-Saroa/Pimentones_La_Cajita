'use client';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { track } from '@/lib/track';

/** Registra una visita por cada página (sin datos personales). */
export function Tracker() {
  const pathname = usePathname();
  useEffect(() => { if (!pathname.startsWith('/admin')) track('page_view', { path: pathname }); }, [pathname]);
  return null;
}

export function ProductViewTracker({ productId }: { productId: number }) {
  useEffect(() => { track('product_view', { productId }); }, [productId]);
  return null;
}
