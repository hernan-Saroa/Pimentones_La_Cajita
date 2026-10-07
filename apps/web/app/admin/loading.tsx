import { PageSkeleton } from '@/components/admin/kit';

/** Estado de carga de cada módulo del admin: Next lo muestra mientras llega la ruta (streaming). */
export default function Loading() {
  return <div className="bo-page-loading" aria-busy="true"><PageSkeleton /></div>;
}
