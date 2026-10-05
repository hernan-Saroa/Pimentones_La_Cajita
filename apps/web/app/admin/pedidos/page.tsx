import { Suspense } from 'react';
import { Orders } from '@/components/admin/Orders';
export default function Page() { return <Suspense fallback={<p className="muted">Cargando…</p>}><Orders /></Suspense>; }
