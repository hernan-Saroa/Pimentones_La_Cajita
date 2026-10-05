import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return { name: 'Pimentones La Cajita', short_name: 'La Cajita', description: 'Conservas de pimentón hechas a mano, sin conservantes.', lang: 'es-CO',
    start_url: '/', display: 'standalone', background_color: '#ffffff', theme_color: '#c0291f',
    icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }] };
}
