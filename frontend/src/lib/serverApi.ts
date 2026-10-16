// src/lib/serverApi.ts
// Server-only data fetching helpers (used by server components / metadata).
import { cache } from 'react';
import { getApiBase } from './apiConfig';

const API_BASE = getApiBase();

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

// Banner setting + active count for the home page banner (single request).
export const fetchPhysicalStoreBanner = cache(async () => {
  try {
    const res = await fetch(`${API_BASE}/physical-stores/setting`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.setting : null;
  } catch {
    return null;
  }
});

// Active physical stores for the /physical-stores page.
export const fetchPhysicalStores = cache(async () => {
  try {
    const res = await fetch(`${API_BASE}/physical-stores?active=true`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.stores || [];
  } catch {
    return [];
  }
});
