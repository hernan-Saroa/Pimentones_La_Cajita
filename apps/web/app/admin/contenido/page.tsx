import { Suspense } from 'react';
import { Content } from '@/components/admin/Content';
import { PageSkeleton } from '@/components/admin/kit';
export default function Page() { return <Suspense fallback={<PageSkeleton />}><Content /></Suspense>; }
