'use client';

import { useEffect, useState, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { resourcesApi, progressApi, reviewsApi, learningPathApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store/auth-store';
import { tokenService } from '@/lib/services/token-service';
import {
  LearningProgress,
  ActivityFeed,
  QuickActions,
  ResourceStats,
  StudyMetrics,
  ReviewStats,
  LearningPathProgress
} from '@/components/dashboard';
import ErrorDisplay from '@/components/ui/feedback/ErrorDisplay';
import { LoadingScreen } from '@/components/ui/feedback/loading-screen';

const SyncTokens = () => {
  useEffect(() => {
    // Token synchronization is now handled by TokenService
    const unsubscribe = tokenService.onTokenChange((token) => {
      console.log('Token status:', token ? 'present' : 'absent');
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return null;
};

export default function DashboardPage() {
  const { user, isAuthenticated, fetchUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  // Add token verification
  useEffect(() => {
    // Check if token exists and is valid
    const token = tokenService.getToken();
    console.log('Dashboard loaded with token?', !!token);

    if (!user && token) {
      console.log('Token exists but no user data, fetching user');
      fetchUser().catch(e => console.error('Error fetching user in dashboard:', e));
    }

    // Check if token needs refresh
    if (token && tokenService.shouldRefreshToken()) {
      console.log('Token needs refresh, initiating refresh');
      tokenService.startTokenRefresh().catch(e => console.error('Error refreshing token:', e));
    }
  }, [user, fetchUser]);

  // Ensure we have user data first
  useEffect(() => {
    if (!user && isAuthenticated) {
      fetchUser().catch(e => console.error('Error fetching user in dashboard:', e));
    }
  }, [user, isAuthenticated, fetchUser]);

  // Fetch resource statistics
  const resourcesQuery = useQuery({
    queryKey: ['resources', 'statistics'],
    queryFn: () => {
      const token = tokenService.getToken();
      console.log('Fetching resource statistics with token?', !!token);
      return resourcesApi.getStatistics();
    },
    enabled: !!user,
  });

  // Fetch recent metrics
  const metricsQuery = useQuery({
    queryKey: ['metrics', 'recent'],
    queryFn: () => {
      console.log('Fetching metrics with user:', user?.username);
      return progressApi.getRecentMetricsSummary(7);
    },
    enabled: !!user,
  });

  // Fetch review statistics
  const reviewsQuery = useQuery({
    queryKey: ['reviews', 'statistics'],
    queryFn: () => {
      console.log('Fetching review statistics with user:', user?.username);
      return reviewsApi.getStatistics();
    },
    enabled: !!user,
  });

  // Fetch learning path progress
  const learningPathQuery = useQuery({
    queryKey: ['learning-path', 'progress'],
    queryFn: () => {
      console.log('Fetching learning path progress with user:', user?.username);
      return learningPathApi.getLearningPathProgress();
    },
    enabled: !!user,
  });

  useEffect(() => {
    const queriesCompleted =
      (resourcesQuery.isSuccess || resourcesQuery.isError) &&
      (metricsQuery.isSuccess || metricsQuery.isError) &&
      (reviewsQuery.isSuccess || reviewsQuery.isError) &&
      (learningPathQuery.isSuccess || learningPathQuery.isError);

    console.log('Query states:', {
      resources: resourcesQuery.status,
      metrics: metricsQuery.status,
      reviews: reviewsQuery.status,
      learningPath: learningPathQuery.status,
      queriesCompleted
    });

    if (queriesCompleted) {
      console.log('All queries completed, setting isLoading to false');
      setIsLoading(false);
    }
  }, [
    resourcesQuery.isSuccess, resourcesQuery.isError, resourcesQuery.status,
    metricsQuery.isSuccess, metricsQuery.isError, metricsQuery.status,
    reviewsQuery.isSuccess, reviewsQuery.isError, reviewsQuery.status,
    learningPathQuery.isSuccess, learningPathQuery.isError, learningPathQuery.status
  ]);

  // Simple debug information at the top of the dashboard
  const debugDisplay = (
    <div className="mb-8 p-4 border border-gray-200 bg-gray-50 rounded-md">
      <h3 className="text-sm font-medium text-gray-700 mb-2">Debug Information</h3>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p>User: {user ? `${user.username} (Logged in)` : 'Not logged in'}</p>
          <p>Token: {tokenService.getToken() ? 'Present' : 'Missing'}</p>
        </div>
        <div>
          <p>Resources: {resourcesQuery.status}</p>
          <p>Metrics: {metricsQuery.status}</p>
          <p>Reviews: {reviewsQuery.status}</p>
          <p>Learning Path: {learningPathQuery.status}</p>
        </div>
      </div>
    </div>
  );

  // Show errors if any queries failed
  const errorDisplay = (
    <>
      {resourcesQuery.error && (
        <ErrorDisplay error={resourcesQuery.error} title="Resources Error" />
      )}
      {metricsQuery.error && (
        <ErrorDisplay error={metricsQuery.error} title="Metrics Error" />
      )}
      {reviewsQuery.error && (
        <ErrorDisplay error={reviewsQuery.error} title="Reviews Error" />
      )}
      {learningPathQuery.error && (
        <ErrorDisplay error={learningPathQuery.error} title="Learning Path Error" />
      )}
    </>
  );

  if (isLoading) {
    return (
      <LoadingScreen
        message="Loading your dashboard..."
        submessage="Preparing your personalized learning experience"
      />
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <SyncTokens />
      <h1 className="text-3xl font-bold mb-8">Your Dashboard</h1>

      {user && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-700" data-testid="user-greeting">
            Welcome, {user.username}!
          </h2>
        </div>
      )}

      <div>
        {debugDisplay}
        {errorDisplay}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Suspense fallback={<LoadingScreen />}>
            <ResourceStats />
          </Suspense>
          <Suspense fallback={<LoadingScreen />}>
            <StudyMetrics />
          </Suspense>
          <Suspense fallback={<LoadingScreen />}>
            <ReviewStats />
          </Suspense>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Suspense fallback={<LoadingScreen />}>
            <LearningProgress />
          </Suspense>

          <div>
            <QuickActions />
          </div>

          <Suspense fallback={<LoadingScreen />}>
            <ActivityFeed compact={true} />
          </Suspense>
        </div>

        <div className="mb-8">
          <Suspense fallback={<LoadingScreen />}>
            <LearningPathProgress />
          </Suspense>
        </div>
      </div>
    </div>
  );
}