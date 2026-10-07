import { Plus_Jakarta_Sans } from 'next/font/google';
import { AdminShell } from '@/components/admin/AdminShell';
import './admin.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata = { title: 'Administración', robots: { index: false, follow: false } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className={plusJakarta.variable} style={{ minHeight: '100vh' }}>
      <AdminShell>{children}</AdminShell>
    </div>
  );
}
