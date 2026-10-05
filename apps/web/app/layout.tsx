import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/bricolage-grotesque';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Tracker } from '@/components/Tracker';
import { SiteChrome } from '@/components/SiteChrome';
import { FloatingWhatsApp } from '@/components/FloatingWhatsApp';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: 'Pimentones La Cajita · Conservas artesanales de pimentón', template: '%s · Pimentones La Cajita' },
  description: 'Mayonesa, salsa rústica, mermelada y pimentones confitados. Hechos a mano en tandas cortas, sin conservantes.',
  openGraph: { type: 'website', locale: 'es_CO', siteName: 'Pimentones La Cajita', images: ['/og.jpg'] },
  twitter: { card: 'summary_large_image' },
  icons: { icon: '/favicon.png', apple: '/icon-192.png' },
  manifest: '/manifest.webmanifest',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#ffffff' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CO">
      <body>
        <Tracker />
        <SiteChrome><Header /></SiteChrome>
        <main id="contenido">{children}</main>
        <SiteChrome>
          <Footer />
          <FloatingWhatsApp />
        </SiteChrome>
      </body>
    </html>
  );
}
