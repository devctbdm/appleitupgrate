'use client';

import { useEffect, useState, useCallback } from 'react';
import { maintenanceApi, type MaintenanceStatus } from '@/lib/api';

export function useMaintenance(pollMs = 30000) {
  const [status, setStatus] = useState<MaintenanceStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const check = useCallback(async () => {
    try {
      const { data } = await maintenanceApi.getStatus();
      setStatus(data.maintenance);
    } catch {
      // keep last known status; maintenance screen shows defaults on failure
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    check();
    if (pollMs > 0) {
      const timer = setInterval(check, pollMs);
      const onFocus = () => check();
      window.addEventListener('focus', onFocus);
      return () => {
        clearInterval(timer);
        window.removeEventListener('focus', onFocus);
      };
    }
  }, [check, pollMs]);

  return { enabled: status?.enabled ?? false, status, loading };
}
