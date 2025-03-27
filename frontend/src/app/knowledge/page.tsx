'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { tokenService } from '@/lib/services/token-service';
import { SpacedRepetitionOnboarding } from '@/components/knowledge/SpacedRepetitionOnboarding';
import { KnowledgeBase } from '@/components/knowledge/KnowledgeBase';

export default function KnowledgePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    // Check if onboarding has been completed
    const onboardingCompleted = tokenService.getMetadata<boolean>('spacedRepetitionOnboarding');
    setShowOnboarding(!onboardingCompleted);
  }, [isAuthenticated, router]);

  const handleOnboardingComplete = () => {
    tokenService.setMetadata<boolean>('spacedRepetitionOnboarding', true);
    setShowOnboarding(false);
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {showOnboarding ? (
        <SpacedRepetitionOnboarding onComplete={handleOnboardingComplete} />
      ) : (
        <KnowledgeBase />
      )}
    </div>
  );
}