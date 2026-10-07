import { Suspense } from 'react';
import { Products } from '@/components/admin/Products';
import { PageSkeleton } from '@/components/admin/kit';
export default function Page() { return <Suspense fallback={<PageSkeleton />}><Products /></Suspense>; }
