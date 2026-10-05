'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cop } from '@lacajita/shared';
import { useCart, cartTotals } from '@/store/cart';
import { Bag, Arrow, Sparkle, WhatsApp } from './icons';
import { CartDrawer } from './CartDrawer';

/** Encabezado premium con barra de anuncios, glassmorphism, carrito lateral y avisos animados. */
export function Header() {
  const { lines, open, setOpen, lastAdded } = useCart();
  const { count, subtotal } = cartTotals(lines);
  const pathname = usePathname();
  const [toast, setToast] = useState<{ name: string } | null>(null);
  const [bump, setBump] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
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
      <div className="announcement-bar" role="region" aria-label="Aviso de envíos">
        <div className="announcement-content">
          <span className="announcement-sparkle"><Sparkle width={13} height={13} /></span>
          <span><b>Cosecha artesanal en Bogotá</b> · Envíos a toda Colombia · <b>Envío gratis</b> desde $90.000</span>
          <span className="announcement-badge">100% Natural</span>
        </div>
      </div>

      <header className={`topbar ${scrolled ? 'is-scrolled' : ''}`}>
        <Link href="/" className="brand" aria-label="Pimentones La Cajita, inicio">
          <img src="/img/logo.svg" alt="Pimentones La Cajita" />
        </Link>
        <nav className="topnav" aria-label="Principal">
          <Link href="/#tienda" className={pathname === '/' ? 'nav-active' : ''}>Tienda</Link>
          <Link href="/#caja">Caja de madera</Link>
          <Link href="/#maridajes">Maridajes</Link>
          <Link href="/#historia">El Fogón</Link>
          <Link href="/mi-pedido">Mi pedido</Link>
          <Link href="/contacto">Contacto</Link>
        </nav>
        <div className="topbar-actions">
          <a
            href="https://wa.me/573103347621?text=Hola%20equipo%20de%20La%20Cajita,%20tengo%20una%20consulta"
            target="_blank"
            rel="noreferrer"
            className="header-wa-btn"
            aria-label="Contactar al equipo por WhatsApp: +57 310 334 7621"
          >
            <WhatsApp width={16} height={16} />
            <span>+57 310 334 7621</span>
          </a>
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
