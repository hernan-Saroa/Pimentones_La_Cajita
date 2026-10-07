import { Suspense } from 'react';
import { Settings } from '@/components/admin/Settings';
import { PageSkeleton } from '@/components/admin/kit';
export default function Page() { return <Suspense fallback={<PageSkeleton />}><Settings /></Suspense>; }
