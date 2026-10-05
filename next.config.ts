import type { NextConfig } from 'next';

const API = process.env.API_URL || 'http://localhost:4000';

const config: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  transpilePackages: ['@lacajita/shared'],
  images: { formats: ['image/avif', 'image/webp'], remotePatterns: [{ protocol: 'https', hostname: '**' }] },
  // La web habla con la API por el mismo origen: sin CORS en el navegador y una sola URL pública.
  async rewrites() { return [{ source: '/api/:path*', destination: `${API}/api/:path*` }, { source: '/uploads/:path*', destination: `${API}/uploads/:path*` }]; },
  // Enlaces de la página anterior (Mobirise) siguen funcionando.
  async redirects() {
    return [
      { source: '/index.html', destination: '/', permanent: true },
      { source: '/index', destination: '/', permanent: true },
      { source: '/contactenos', destination: '/contacto', permanent: true },
      { source: '/contact', destination: '/contacto', permanent: true },
    ];
  },
  async headers() {
    return [{ source: '/(.*)', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' }, { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }, { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ] }];
  },
};
export default config;
