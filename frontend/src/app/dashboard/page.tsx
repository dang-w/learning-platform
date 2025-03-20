'use client';

import { useEffect, useState, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { resourcesApi, progressApi, reviewsApi, learningPathApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store/auth-store';
import {
  LearningProgress,
  ActivityFeed,
  QuickActions,
  ResourceStats,
  StudyMetrics,
  ReviewStats,
  LearningPathProgress
} from '@/components/dashboard';
import { Spinner } from '@/components/ui/feedback';
import ErrorDisplay from '@/components/ui/feedback/ErrorDisplay';

export default function DashboardPage() {
  const { user, isAuthenticated, fetchUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  // Add token verification
  useEffect(() => {
    // Check if token exists
    const token = localStorage.getItem('token');
    console.log('Dashboard loaded with token?', !!token);

    if (!user && token) {
      console.log('Token exists but no user data, fetching user');
      fetchUser().catch(e => console.error('Error fetching user in dashboard:', e));
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
      const token = localStorage.getItem('token');
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
      return reviewsApi.getReviewStatistics();
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
    if (
      resourcesQuery.isSuccess &&
      metricsQuery.isSuccess &&
      reviewsQuery.isSuccess &&
      learningPathQuery.isSuccess
    ) {
      setIsLoading(false);
    }
  }, [
    resourcesQuery.isSuccess,
    metricsQuery.isSuccess,
    reviewsQuery.isSuccess,
    learningPathQuery.isSuccess,
  ]);

  // Simple debug information at the top of the dashboard
  const debugDisplay = (
    <div className="mb-8 p-4 border border-gray-200 bg-gray-50 rounded-md">
      <h3 className="text-sm font-medium text-gray-700 mb-2">Debug Information</h3>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p>User: {user ? `${user.username} (Logged in)` : 'Not logged in'}</p>
          <p>Token: {localStorage.getItem('token') ? 'Present' : 'Missing'}</p>
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
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Loading dashboard...</h2>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Your Dashboard</h1>

      {user && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-700" data-testid="user-greeting">
            Welcome, {user.username}!
          </h2>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" />
        </div>
      ) : (
        <div>
          {debugDisplay}

          {errorDisplay}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <ResourceStats />
            <StudyMetrics />
            <ReviewStats />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Learning Progress Overview */}
            <Suspense fallback={<div className="h-64 flex items-center justify-center"><Spinner /></div>}>
              <LearningProgress />
            </Suspense>

            {/* Quick Actions */}
            <div>
              <QuickActions />
            </div>

            {/* Activity Feed (compact version) */}
            <Suspense fallback={<div className="h-64 flex items-center justify-center"><Spinner /></div>}>
              <ActivityFeed compact={true} />
            </Suspense>
          </div>

            {/* Learning Path Progress */}
            <div className="mb-8">
              <Suspense fallback={<div className="h-64 flex items-center justify-center"><Spinner /></div>}>
                <LearningPathProgress />
              </Suspense>
            </div>
        </div>
      )}
    </div>
  );
}