'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { resourcesApi, progressApi, reviewsApi, learningPathApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store/auth-store';
import Link from 'next/link';
import {
  BookOpenIcon,
  AcademicCapIcon,
  ClockIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Welcome back, {user?.full_name || user?.username}!</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-indigo-100 rounded-md p-3">
              <BookOpenIcon className="h-6 w-6 text-indigo-600" />
            </div>
            <div className="ml-5">
              <p className="text-sm font-medium text-gray-500">Resources</p>
              <p className="text-xl font-semibold text-gray-900">
                {resourcesQuery.data?.completed || 0}/{resourcesQuery.data?.total || 0}
              </p>
              <p className="text-sm text-gray-500">
                {resourcesQuery.data?.completion_percentage?.toFixed(0) || 0}% completed
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
              <AcademicCapIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-5">
              <p className="text-sm font-medium text-gray-500">Goals</p>
              <p className="text-xl font-semibold text-gray-900">
                {learningPathQuery.data?.goals.completed || 0}/{learningPathQuery.data?.goals.total || 0}
              </p>
              <p className="text-sm text-gray-500">
                {learningPathQuery.data?.goals.completion_percentage?.toFixed(0) || 0}% achieved
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
              <ClockIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-5">
              <p className="text-sm font-medium text-gray-500">Reviews</p>
              <p className="text-xl font-semibold text-gray-900">
                {reviewsQuery.data?.due_reviews || 0}
              </p>
              <p className="text-sm text-gray-500">
                due today
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
              <ChartBarIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-5">
              <p className="text-sm font-medium text-gray-500">Study Time</p>
              <p className="text-xl font-semibold text-gray-900">
                {metricsQuery.data?.total_hours?.toFixed(1) || 0}h
              </p>
              <p className="text-sm text-gray-500">
                last 7 days
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming milestones */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-5 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Upcoming Milestones</h3>
          </div>
          <div className="p-5">
            {learningPathQuery.data?.milestones.upcoming &&
             learningPathQuery.data.milestones.upcoming.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {learningPathQuery.data.milestones.upcoming.map((milestone) => (
                  <li key={milestone.id} className="py-3">
                    <Link href={`/learning-path/milestones/${milestone.id}`} className="block hover:bg-gray-50">
                      <p className="text-sm font-medium text-indigo-600">{milestone.title}</p>
                      <p className="text-sm text-gray-500">Due: {new Date(milestone.target_date).toLocaleDateString()}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm">No upcoming milestones</p>
            )}
            <div className="mt-4">
              <Link href="/learning-path/milestones" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                View all milestones →
              </Link>
            </div>
          </div>
        </div>

        {/* Recent resources */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-5 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Completions</h3>
          </div>
          <div className="p-5">
            {resourcesQuery.data?.recent_completions &&
             resourcesQuery.data.recent_completions.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {resourcesQuery.data.recent_completions.map((resource) => (
                  <li key={resource.id} className="py-3">
                    <p className="text-sm font-medium text-gray-900">{resource.title}</p>
                    <p className="text-sm text-gray-500">
                      {resource.difficulty} · {new Date(resource.completion_date || '').toLocaleDateString()}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm">No recently completed resources</p>
            )}
            <div className="mt-4">
              <Link href="/resources" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                View all resources →
              </Link>
            </div>
          </div>
        </div>

        {/* Due reviews */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-5 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Due Reviews</h3>
          </div>
          <div className="p-5">
            {reviewsQuery.data && reviewsQuery.data.due_reviews > 0 ? (
              <div className="text-center py-4">
                <p className="text-2xl font-bold text-purple-600">{reviewsQuery.data.due_reviews}</p>
                <p className="text-gray-500 mb-4">concepts due for review</p>
                <Link
                  href="/reviews/session"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  Start Review Session
                </Link>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 mb-2">No concepts due for review</p>
                <Link
                  href="/concepts/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  Add New Concept
                </Link>
              </div>
            )}
            <div className="mt-4 text-center">
              <Link href="/reviews" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                View all reviews →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}