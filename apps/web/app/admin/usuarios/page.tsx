import { Suspense } from 'react';
import { Users } from '@/components/admin/Users';
import { PageSkeleton } from '@/components/admin/kit';
export default function Page() { return <Suspense fallback={<PageSkeleton />}><Users /></Suspense>; }
