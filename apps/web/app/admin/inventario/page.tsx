import { Suspense } from 'react';
import { Inventory } from '@/components/admin/Inventory';
import { PageSkeleton } from '@/components/admin/kit';
export default function Page() { return <Suspense fallback={<PageSkeleton />}><Inventory /></Suspense>; }
