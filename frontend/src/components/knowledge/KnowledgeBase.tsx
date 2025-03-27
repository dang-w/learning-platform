'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { knowledgeApi } from '@/lib/api';
import { Alert, Spinner } from '@/components/ui/feedback';
import { Button } from '@/components/ui/buttons';
import { Concept, ReviewStatistics } from '@/types/knowledge';

// Define a type for topic with count
interface TopicWithCount {
  name: string;
  count: number;
}

export function KnowledgeBase() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'concepts' | 'due' | 'statistics'>('concepts');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Get statistics
  const {
    data: statistics,
    isLoading: isLoadingStats,
    error: statsError,
    refetch: refetchStats,
  } = useQuery<ReviewStatistics>({
    queryKey: ['knowledge-statistics'],
    queryFn: () => knowledgeApi.getReviewStatistics(),
  });

  // Get due concepts count
  const {
    data: dueConcepts,
    isLoading: isLoadingDue,
    error: dueError,
    refetch: refetchDue,
  } = useQuery<Concept[]>({
    queryKey: ['due-concepts'],
    queryFn: () => knowledgeApi.getDueConcepts(),
  });

  // Check if we have due concepts
  const hasDueConcepts = dueConcepts && dueConcepts.length > 0;

  // Process data for UI
  const topTopics: TopicWithCount[] = statistics?.top_topics || [];
  const recentConcepts = statistics?.recently_reviewed_concepts || [];
  const isLoading = isLoadingStats || isLoadingDue;

  const handleRetry = () => {
    setErrorMessage(null);
    refetchStats();
    refetchDue();
  };

  const handleStartReview = () => {
    router.push('/knowledge/session');
  };

  const handleViewConcepts = () => {
    router.push('/knowledge/concepts');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Knowledge Management</h1>
        <div className="flex space-x-4">
          {hasDueConcepts && (
            <Button
              onClick={handleStartReview}
              data-testid="start-review-button"
            >
              Start Review Session
            </Button>
          )}
          <Button
            onClick={handleViewConcepts}
            variant="outline"
            data-testid="view-all-concepts-button"
          >
            View All Concepts
          </Button>
          <Button
            onClick={() => router.push('/knowledge/concepts/create')}
            data-testid="create-concept-button"
          >
            Create Concept
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/knowledge/settings')}
            data-testid="spaced-repetition-settings-button"
          >
            Spaced Repetition Settings
          </Button>
          <Button
            onClick={() => router.push('/knowledge/reviews')}
            variant="outline"
            data-testid="nav-knowledge-review"
          >
            Review Dashboard
          </Button>
        </div>
      </div>

      {/* Error message */}
      {(statsError || dueError) && (
        <Alert variant="error" className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              {(statsError || dueError) instanceof Error
                ? ((statsError || dueError)?.message || 'An error occurred')
                : 'Failed to load data. Please try again.'}
            </div>
            <Button onClick={handleRetry} size="sm">Retry</Button>
          </div>
        </Alert>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex justify-center my-8">
          <Spinner size="lg" />
        </div>
      )}

      {/* Tabs */}
      {!isLoading && (
        <div className="border-b border-gray-200 mb-8">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('concepts')}
              className={`py-4 px-6 border-b-2 font-medium text-sm ${
                activeTab === 'concepts'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              data-testid="concepts-tab"
            >
              All Concepts
            </button>
            <button
              onClick={() => setActiveTab('due')}
              className={`py-4 px-6 border-b-2 font-medium text-sm ${
                activeTab === 'due'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              data-testid="due-tab"
            >
              Due for Review {hasDueConcepts && `(${dueConcepts?.length})`}
            </button>
            <button
              onClick={() => setActiveTab('statistics')}
              className={`py-4 px-6 border-b-2 font-medium text-sm ${
                activeTab === 'statistics'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              data-testid="statistics-tab"
            >
              Statistics
            </button>
          </nav>
        </div>
      )}

      {/* Content based on active tab */}
      {!isLoading && !errorMessage && (
        <div className="mb-8">
          {activeTab === 'concepts' && (
            <div className="text-center py-12">
              <h2 className="text-xl font-semibold mb-4">Manage Your Knowledge Concepts</h2>
              <p className="text-gray-600 mb-6">
                Organize and track your AI/ML concepts in one place
              </p>
              <Button onClick={handleViewConcepts} size="lg" data-testid="view-all-concepts-button">
                View All Concepts
              </Button>
            </div>
          )}

          {activeTab === 'due' && (
            <div>
              {hasDueConcepts ? (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold">Concepts Due for Review</h2>
                  <div className="flex justify-end">
                    <Button onClick={handleStartReview} data-testid="start-review-button">
                      Start Review Session
                    </Button>
                  </div>
                  <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    <ul className="divide-y divide-gray-200">
                      {dueConcepts?.map((concept) => (
                        <li key={concept.id} data-testid="due-concept-item">
                          <div className="px-4 py-4 sm:px-6 hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/knowledge/concepts/${concept.id}/review`)}>
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-indigo-600 truncate">{concept.title}</p>
                              <div className="ml-2 flex-shrink-0 flex">
                                <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                  Due
                                </p>
                              </div>
                            </div>
                            <div className="mt-2 flex justify-between">
                              <div className="sm:flex">
                                <div className="flex items-center text-sm text-gray-500">
                                  Last reviewed: {concept.last_reviewed_at ? new Date(concept.last_reviewed_at).toLocaleDateString() : 'Never'}
                                </div>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12" data-testid="no-concepts-due">
                  <h2 className="text-xl font-semibold mb-4">No Concepts Due</h2>
                  <p className="text-gray-600 mb-6">
                    Great job! You don&apos;t have any concepts due for review right now.
                  </p>
                  <Button onClick={handleViewConcepts} variant="outline" data-testid="view-all-concepts-button">
                    View All Concepts
                  </Button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'statistics' && statistics && (
            <div className="space-y-8">
              <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Review Statistics</h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">
                    Overview of your knowledge management progress
                  </p>
                </div>
                <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
                    <div className="sm:col-span-1">
                      <dt className="text-sm font-medium text-gray-500">Total Concepts</dt>
                      <dd className="mt-1 text-sm text-gray-900">{statistics.total_concepts}</dd>
                    </div>
                    <div className="sm:col-span-1">
                      <dt className="text-sm font-medium text-gray-500">Total Reviews</dt>
                      <dd className="mt-1 text-sm text-gray-900">{statistics.total_reviews}</dd>
                    </div>
                    <div className="sm:col-span-1">
                      <dt className="text-sm font-medium text-gray-500">Due Concepts</dt>
                      <dd className="mt-1 text-sm text-gray-900">{statistics.due_concepts}</dd>
                    </div>
                    <div className="sm:col-span-1">
                      <dt className="text-sm font-medium text-gray-500">Average Confidence</dt>
                      <dd className="mt-1 text-sm text-gray-900">{statistics.average_confidence.toFixed(1)} / 5</dd>
                    </div>
                    {statistics.streak_days > 0 && (
                      <div className="sm:col-span-2">
                        <dt className="text-sm font-medium text-gray-500">Current Streak</dt>
                        <dd className="mt-1 text-sm text-gray-900">{statistics.streak_days} days</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>

              {topTopics.length > 0 && (
                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                  <div className="px-4 py-5 sm:px-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Top Topics</h3>
                  </div>
                  <div className="border-t border-gray-200">
                    <ul className="divide-y divide-gray-200">
                      {topTopics.map((topic) => (
                        <li key={topic.name} className="px-4 py-4 sm:px-6">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900">{topic.name}</p>
                            <p className="text-sm text-gray-500">{topic.count} concept{topic.count !== 1 && 's'}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {recentConcepts.length > 0 && (
                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                  <div className="px-4 py-5 sm:px-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Recently Reviewed</h3>
                  </div>
                  <div className="border-t border-gray-200">
                    <ul className="divide-y divide-gray-200">
                      {recentConcepts.map((concept) => (
                        <li key={concept.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/knowledge/concepts/${concept.id}`)}>
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900">{concept.title}</p>
                            <div className="flex items-center">
                              <p className="text-sm text-gray-500 mr-2">
                                Confidence: {concept.confidence_level}/5
                              </p>
                              <p className="text-xs text-gray-500">
                                {concept.last_reviewed_at ? new Date(concept.last_reviewed_at).toLocaleDateString() : 'Never'}
                              </p>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}