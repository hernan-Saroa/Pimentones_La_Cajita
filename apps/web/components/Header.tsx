'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cop } from '@lacajita/shared';
import { useCart, cartTotals } from '@/store/cart';
import { Bag, Arrow, Sparkle, WhatsApp } from './icons';
import { CartDrawer } from './CartDrawer';
import { api } from '@/lib/api';

/** Encabezado premium con barra de anuncios, glassmorphism, carrito lateral y avisos animados. */
export function Header() {
  const { lines, open, setOpen, lastAdded } = useCart();
  const { count, subtotal } = cartTotals(lines);
  const pathname = usePathname();
  const [toast, setToast] = useState<{ name: string } | null>(null);
  const [bump, setBump] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [storeInfo, setStoreInfo] = useState<{ freeShipping: string; whatsappUrl: string; phoneDisplay: string }>({
    freeShipping: '$90.000',
    whatsappUrl: 'https://wa.me/573103347621?text=Hola%20equipo%20de%20La%20Cajita,%20tengo%20una%20consulta',
    phoneDisplay: '+57 310 334 7621',
  });
  const [announcement, setAnnouncement] = useState<{ enabled: boolean; text: string; badge: string }>({
    enabled: true,
    text: 'Cosecha artesanal en Bogotá · Envíos a toda Colombia',
    badge: '100% Natural',
  });

  useEffect(() => {
    setMounted(true);
    Promise.all([api.store(), api.content()])
      .then(([s, c]) => {
        const cleanWa = (s.whatsapp || '573103347621').replace(/\D/g, '');
        setStoreInfo({
          freeShipping: s.shipping?.freeFrom ? cop(s.shipping.freeFrom) : '$90.000',
          whatsappUrl: `https://wa.me/${cleanWa}?text=Hola%20equipo%20de%20La%20Cajita,%20tengo%20una%20consulta`,
          phoneDisplay: s.contact?.phone || `+${cleanWa}`,
        });
        if (c) {
          setAnnouncement({
            enabled: c.announcementEnabled !== false,
            text: c.announcementText || 'Cosecha artesanal en Bogotá · Envíos a toda Colombia',
            badge: c.announcementBadge || '100% Natural',
          });
        }
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!lastAdded) return;
    setToast(lastAdded); setBump(true);
    const t1 = setTimeout(() => setToast(null), 2600);
    const t2 = setTimeout(() => setBump(false), 500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [lastAdded]);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const y = window.scrollY;
          setScrolled((prev) => (prev ? y > 15 : y > 35));
          ticking = false;
        });
        ticking = true;
      }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const shown = mounted ? count : 0;
  const showBar = shown > 0 && !open && pathname !== '/pagar' && !pathname.startsWith('/producto/') && !pathname.startsWith('/admin');

  return (
    <>
      <a href="#contenido" className="skip">Ir al contenido</a>
      
      {/* Barra de anuncio superior */}
      {announcement.enabled && (
        <div className="announcement-bar" role="region" aria-label="Aviso de envíos">
          <div className="announcement-content">
            <span className="announcement-sparkle"><Sparkle width={13} height={13} /></span>
            <span><b>{announcement.text}</b> · <b>Envío gratis</b> desde {storeInfo.freeShipping}</span>
            {announcement.badge && <span className="announcement-badge">{announcement.badge}</span>}
          </div>
        </div>
      )}

      <header className={`topbar ${scrolled ? 'is-scrolled' : ''}`}>
        <Link href="/" className="brand" aria-label="Pimentones La Cajita, inicio">
          <img src="/img/logo.svg" alt="Pimentones La Cajita" />
        </Link>
        <nav className="topnav" aria-label="Principal">
          <Link href="/#tienda" className={pathname === '/' ? 'nav-active' : ''}>Tienda</Link>
          <Link href="/#caja">Caja de madera</Link>
          <Link href="/#maridajes">Maridajes</Link>
          <Link href="/#historia">El Fogón</Link>
          <Link href="/contacto">Contacto</Link>
        </nav>
        <div className="topbar-actions">
          <Link
            href="/mi-pedido"
            className={`header-track-btn ${pathname.startsWith('/mi-pedido') || pathname.startsWith('/pedido') ? 'is-active' : ''}`}
            aria-label="Rastrear mi pedido en tiempo real"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
              <path d="m3.3 7 8.7 5 8.7-5" />
              <path d="M12 22V12" />
            </svg>
            <span>Mi pedido</span>
          </Link>
          <button className="cart-btn" onClick={() => setOpen(true)} aria-label={`Abrir carrito, ${shown} productos`}>
            <Bag />
            {shown > 0 && <b className={`cart-count ${bump ? 'bump' : ''}`}>{shown}</b>}
          </button>
        </div>
      </header>

      {showBar && (
        <button className="cartbar" onClick={() => setOpen(true)}>
          <span><b>{shown} {shown === 1 ? 'frasco' : 'frascos'}</b> · {cop(subtotal)}</span>
          <span className="cartbar-go">Ver carrito <Arrow width={18} height={18} /></span>
        </button>
      )}

      <div className={`toast ${toast ? 'is-on' : ''}`} role="status" aria-live="polite">
        {toast && (
          <>
            <span className="toast-check">✓</span>
            <span>Agregaste <b>{toast.name}</b></span>
            <button className="link-btn" onClick={() => { setToast(null); setOpen(true); }}>Ver carrito</button>
          </>
        )}
      </div>

      <CartDrawer />
    </>
  );
}
