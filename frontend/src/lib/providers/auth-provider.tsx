'use client';

import { useEffect } from 'react';
import { useAuthContext } from '@/lib/store/contexts/auth-context';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const store = useAuthContext();

  useEffect(() => {
    store.initializeFromStorage();
  }, [store]);

  return <>{children}</>;
}