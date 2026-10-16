'use client';

import { useEffect, useState } from 'react';
import { storeApi } from '@/lib/api';

export type StoreLogo = {
  logoType: 'text' | 'image';
  logoUrl: string;
  logoText: string;
  logoSubText: string;
  logoIconUrl: string;
  storeName: string;
};

const DEFAULT_LOGO: StoreLogo = {
  logoType: 'text',
  logoUrl: '',
  logoText: '',
  logoSubText: '',
  logoIconUrl: '',
  storeName: '',
};

// Both the storefront header and the admin sidebar need the store logo, and it
// rarely changes. Cache it at module scope so it is fetched at most once per
// browser session; a "store-logo-updated" event (fired after saving Settings)
// forces a fresh read.
let cache: StoreLogo | null = null;
let inflight: Promise<StoreLogo> | null = null;

export const STORE_LOGO_EVENT = 'store-logo-updated';

function normalize(settings: any): StoreLogo {
  return {
    logoType: settings?.logoType === 'image' ? 'image' : 'text',
    logoUrl: settings?.logoUrl || '',
    logoText: settings?.logoText || '',
    logoSubText: settings?.logoSubText || '',
    logoIconUrl: settings?.logoIconUrl || '',
    storeName: settings?.storeName || '',
  };
}

function load(): Promise<StoreLogo> {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = storeApi
      .getPublic()
      .then(({ data }) => {
        cache = normalize(data?.settings);
        return cache;
      })
      .catch(() => {
        inflight = null;
        return DEFAULT_LOGO;
      });
  }
  return inflight;
}

/** Drop the cached logo and refetch on the next subscribe. */
export function invalidateStoreLogo() {
  cache = null;
  inflight = null;
}

export function useStoreLogo() {
  const [logo, setLogo] = useState<StoreLogo>(cache || DEFAULT_LOGO);

  useEffect(() => {
    let active = true;

    const apply = (cfg: StoreLogo) => {
      if (active) setLogo(cfg);
    };

    const reload = () => {
      invalidateStoreLogo();
      load().then(apply);
    };

    load().then(apply);
    window.addEventListener(STORE_LOGO_EVENT, reload);
    return () => {
      active = false;
      window.removeEventListener(STORE_LOGO_EVENT, reload);
    };
  }, []);

  return logo;
}
