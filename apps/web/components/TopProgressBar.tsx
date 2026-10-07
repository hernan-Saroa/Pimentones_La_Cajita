'use client';
import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function TopProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState(0);

  // Termina el progreso cuando la ruta cambia efectivamente
  useEffect(() => {
    if (active) {
      setProgress(100);
      const timer = setTimeout(() => {
        setActive(false);
        setProgress(0);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [pathname, searchParams]);

  // Intercepta clics en enlaces internos para dar feedback inmediato (0ms)
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Ignorar si se usó clic derecho o teclas modificadoras
      if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;

      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (
        href &&
        href.startsWith('/') &&
        !href.startsWith('/#') &&
        !href.startsWith('//') &&
        anchor.target !== '_blank'
      ) {
        const url = new URL(anchor.href, window.location.href);
        const current = new URL(window.location.href);

        // Si navega a una ruta distinta, activar barra de progreso de inmediato
        if (url.pathname !== current.pathname || url.search !== current.search) {
          setActive(true);
          setProgress(25);
          setTimeout(() => setProgress((p) => (p < 75 ? 75 : p)), 120);
          setTimeout(() => setProgress((p) => (p < 90 ? 90 : p)), 400);
        }
      }
    };

    // Permite disparar el progreso manualmente desde cualquier botón o acción
    const handleCustomStart = () => {
      setActive(true);
      setProgress(25);
      setTimeout(() => setProgress((p) => (p < 75 ? 75 : p)), 120);
      setTimeout(() => setProgress((p) => (p < 90 ? 90 : p)), 400);
    };

    window.addEventListener('click', handleClick, { capture: true });
    window.addEventListener('lacajita:nav-start', handleCustomStart);

    return () => {
      window.removeEventListener('click', handleClick, { capture: true });
      window.removeEventListener('lacajita:nav-start', handleCustomStart);
    };
  }, [pathname]);

  if (!active && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        zIndex: 999999,
        pointerEvents: 'none',
        background: 'rgba(0, 0, 0, 0.05)',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #ba1e23 0%, #e11d48 50%, #f59e0b 100%)',
          boxShadow: '0 0 12px rgba(225, 29, 72, 0.7)',
          transition: progress === 100 ? 'width 0.2s ease, opacity 0.35s ease' : 'width 0.35s cubic-bezier(0.1, 0.5, 0.1, 1)',
          opacity: progress === 100 ? 0 : 1,
        }}
      />
    </div>
  );
}

/** Dispara la animación de progreso de navegación inmediatamente */
export function triggerNavProgress() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('lacajita:nav-start'));
  }
}
