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
import { Spinner } from '@/components/ui/feedback'

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  // Fetch resource statistics
  const resourcesQuery = useQuery({
    queryKey: ['resources', 'statistics'],
    queryFn: () => resourcesApi.getResourceStatistics(),
    enabled: !!user,
  });

  // Fetch recent metrics
  const metricsQuery = useQuery({
    queryKey: ['metrics', 'recent'],
    queryFn: () => progressApi.getRecentMetricsSummary(7),
    enabled: !!user,
  });

  // Fetch review statistics
  const reviewsQuery = useQuery({
    queryKey: ['reviews', 'statistics'],
    queryFn: () => reviewsApi.getReviewStatistics(),
    enabled: !!user,
  });

  // Fetch learning path progress
  const learningPathQuery = useQuery({
    queryKey: ['learning-path', 'progress'],
    queryFn: () => learningPathApi.getLearningPathProgress(),
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
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      {user && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-700" data-testid="user-greeting">
            Welcome, {user.username}!
          </h2>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Learning Progress Overview */}
        <Suspense fallback={<div className="h-64 flex items-center justify-center"><Spinner /></div>}>
          <LearningProgress />
        </Suspense>

        {/* Quick Actions */}
        <div>
          <QuickActions />
        </div>

        {/* Resource Statistics */}
        <Suspense fallback={<div className="h-64 flex items-center justify-center"><Spinner /></div>}>
          <ResourceStats />
        </Suspense>
      </div>

      {/* Study Metrics (Full Width) */}
      <div className="mb-8">
        <Suspense fallback={<div className="h-64 flex items-center justify-center"><Spinner /></div>}>
          <StudyMetrics />
        </Suspense>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Review Statistics */}
        <Suspense fallback={<div className="h-64 flex items-center justify-center"><Spinner /></div>}>
          <ReviewStats />
        </Suspense>

        {/* Learning Path Progress */}
        <Suspense fallback={<div className="h-64 flex items-center justify-center"><Spinner /></div>}>
          <LearningPathProgress />
        </Suspense>
      </div>

      {/* Recent Activity */}
      <div className="mb-8">
        <Suspense fallback={<div className="h-64 flex items-center justify-center"><Spinner /></div>}>
          <ActivityFeed />
        </Suspense>
      </div>
    </div>
  );
}