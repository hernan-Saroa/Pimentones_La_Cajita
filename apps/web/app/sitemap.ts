import type { MetadataRoute } from 'next';
import { api } from '@/lib/api';
const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let products: { slug: string }[] = [];
  try { products = await api.products(); } catch { /* sin API en build */ }
  return [{ url: SITE, changeFrequency: 'weekly', priority: 1 }, ...products.map((p) => ({ url: `${SITE}/producto/${p.slug}`, changeFrequency: 'weekly' as const, priority: 0.8 }))];
}
