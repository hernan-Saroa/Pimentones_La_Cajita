import { Suspense } from 'react';
import { Messages } from '@/components/admin/Messages';
import { PageSkeleton } from '@/components/admin/kit';
export default function Page() { return <Suspense fallback={<PageSkeleton />}><Messages /></Suspense>; }
