import { Suspense } from 'react';
import { Orders } from '@/components/admin/Orders';
import { PageSkeleton } from '@/components/admin/kit';
export default function Page() { return <Suspense fallback={<PageSkeleton />}><Orders /></Suspense>; }
