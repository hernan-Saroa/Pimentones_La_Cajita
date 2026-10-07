import { Suspense } from 'react';
import { Customers } from '@/components/admin/Customers';
import { PageSkeleton } from '@/components/admin/kit';
export default function Page() { return <Suspense fallback={<PageSkeleton />}><Customers /></Suspense>; }
