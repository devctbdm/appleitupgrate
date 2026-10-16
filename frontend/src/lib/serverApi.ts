// src/lib/serverApi.ts
// Server-only data fetching helpers (used by server components / metadata).
import { cache } from 'react';

const API_BASE =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:5000/api';

export const fetchProductBySlug = cache(async (slug: string) => {
  try {
    const res = await fetch(`${API_BASE}/products/slug/${encodeURIComponent(slug)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.product : null;
  } catch {
    return null;
  }
});

export const fetchCategories = cache(async () => {
  try {
    const res = await fetch(`${API_BASE}/categories`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.categories || [];
  } catch {
    return [];
  }
});

export const fetchAllProducts = cache(async () => {
  try {
    const res = await fetch(`${API_BASE}/products?limit=5000`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.products || [];
  } catch {
    return [];
  }
});
