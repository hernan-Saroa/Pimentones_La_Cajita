import { Suspense } from 'react';
import { Coupons } from '@/components/admin/Coupons';
import { PageSkeleton } from '@/components/admin/kit';
export default function Page() { return <Suspense fallback={<PageSkeleton />}><Coupons /></Suspense>; }
