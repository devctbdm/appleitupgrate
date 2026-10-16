'use client';

import { useEffect, useState } from 'react';
import { storeApi } from '@/lib/api';
import { formatMoney, getCurrencySymbol } from '@/utils/currency';

// The store currency is configured once in Settings and rarely changes, but it
// is needed by many components. Cache the request at module scope so it is
// fetched at most once per browser session.
let cachedCurrency: string | null = null;
let inflight: Promise<string> | null = null;

function loadCurrency(): Promise<string> {
  if (cachedCurrency) return Promise.resolve(cachedCurrency);
  if (!inflight) {
    inflight = storeApi
      .get()
      .then(({ data }) => {
        cachedCurrency = (data?.settings?.currency || 'BDT').toUpperCase();
        return cachedCurrency;
      })
      .catch(() => {
        // Allow a retry on the next mount; fall back to BDT meanwhile.
        inflight = null;
        return 'BDT';
      });
  }
  return inflight;
}

/** Invalidate the cached currency (call after changing it in Settings). */
export function invalidateCurrency() {
  cachedCurrency = null;
  inflight = null;
}

/**
 * Read the store's configured currency (Settings → Default Currency) and expose
 * a symbol plus a formatter so prices are never hardcoded.
 */
export function useCurrency() {
  const [currency, setCurrency] = useState<string>(cachedCurrency || 'BDT');

  useEffect(() => {
    let active = true;
    loadCurrency().then((code) => {
      if (active) setCurrency(code);
    });
    return () => {
      active = false;
    };
  }, []);

  return {
    currency,
    symbol: getCurrencySymbol(currency),
    format: (amount: number) => formatMoney(amount, currency),
  };
}

export default useCurrency;
