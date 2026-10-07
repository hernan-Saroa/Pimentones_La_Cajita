import { Suspense } from 'react';
import { Zones } from '@/components/admin/Zones';
import { PageSkeleton } from '@/components/admin/kit';
export default function Page() { return <Suspense fallback={<PageSkeleton />}><Zones /></Suspense>; }
