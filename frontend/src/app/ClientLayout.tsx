// src/app/ClientLayout.tsx
'use client';

import { ReactNode, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/store';

export function ClientLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, fetchUser } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      fetchUser().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  return <div key={pathname} className="min-h-screen">{children}</div>;
}
