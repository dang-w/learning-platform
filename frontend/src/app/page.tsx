'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { tokenService } from '@/lib/services/token-service';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Clear any existing tokens and redirect to login
    tokenService.clearTokens();
    router.push('/auth/login');
  }, [router]);

  return null;
}
