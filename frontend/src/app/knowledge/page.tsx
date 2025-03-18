'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { knowledgeApi } from '@/lib/api';
import { Button } from '@/components/ui/buttons';
import { Alert, Spinner } from '@/components/ui/feedback';
import { Concept, ReviewStatistics } from '@/types/knowledge';

export default function KnowledgePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'concepts' | 'due' | 'statistics'>('concepts');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Get statistics
  const {
    data: statistics,
    isLoading: isLoadingStats,
    error: statsError,
    refetch: refetchStatistics
  } = useQuery<ReviewStatistics>({
    queryKey: ['knowledge', 'statistics'],
    queryFn: () => knowledgeApi.getReviewStatistics(),
    retry: 2
  });

  // Get due concepts count
  const {
    data: dueConcepts,
    isLoading: isLoadingDue,
    error: dueError,
    refetch: refetchDueConcepts
  } = useQuery<Concept[]>({
    queryKey: ['knowledge', 'due'],
    queryFn: () => knowledgeApi.getDueConcepts(),
    retry: 2
  });

  // Handle errors from queries
  useEffect(() => {
    if (statsError) {
      console.error('Failed to load statistics:', statsError);
      setErrorMessage(statsError instanceof Error
        ? statsError.message
        : 'Failed to load statistics. Please try again later.');
    } else if (dueError) {
      console.error('Failed to load due concepts:', dueError);
      setErrorMessage(dueError instanceof Error
        ? dueError.message
        : 'Failed to load due concepts. Please try again later.');
    } else {
      setErrorMessage(null);
    }
  }, [statsError, dueError]);

  // Handle retry for loading failed data
  const handleRetry = () => {
    setErrorMessage(null);
    refetchStatistics();
    refetchDueConcepts();
  };

  const handleStartReview = () => {
    router.push('/knowledge/session');
  };

  const handleCreateConcept = () => {
    router.push('/knowledge/concepts/create');
  };

  const handleViewConcepts = () => {
    router.push('/knowledge/concepts');
  };

  // Loading state
  const isLoading = isLoadingStats || isLoadingDue;

  // Safely access statistics
  const dueConceptsArray = dueConcepts || [];
  const hasDueConcepts = Array.isArray(dueConceptsArray) && dueConceptsArray.length > 0;
  const conceptsByTopic = statistics?.concepts_by_topic || {};
  const hasTopics = Object.keys(conceptsByTopic).length > 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Knowledge Management</h1>
        <div className="flex gap-4">
          <Button onClick={handleCreateConcept}>
            Create Concept
          </Button>
          {hasDueConcepts && (
            <Button onClick={handleStartReview}>
              Start Review ({dueConceptsArray.length})
            </Button>
          )}
        </div>
      </div>

      {/* Error message */}
      {errorMessage && (
        <Alert variant="error" className="mb-6">
          <div className="flex justify-between items-center">
            <div>{errorMessage}</div>
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
              className={`py-4 px-6 font-medium text-sm ${
                activeTab === 'concepts'
                  ? 'border-b-2 border-indigo-500 text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              data-testid="concepts-tab"
            >
              Concepts
            </button>
            <button
              onClick={() => setActiveTab('due')}
              className={`py-4 px-6 font-medium text-sm ${
                activeTab === 'due'
                  ? 'border-b-2 border-indigo-500 text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              data-testid="due-tab"
            >
              Due for Review {hasDueConcepts && `(${dueConceptsArray.length})`}
            </button>
            <button
              onClick={() => setActiveTab('statistics')}
              className={`py-4 px-6 font-medium text-sm ${
                activeTab === 'statistics'
                  ? 'border-b-2 border-indigo-500 text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
            <div>
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">Your Knowledge Base</h2>
                <p className="text-gray-600 mb-4">
                  Create and manage your knowledge concepts. Organize them by topics and track your understanding over time.
                </p>
                <Button onClick={handleViewConcepts} data-testid="view-concepts-button">
                  View All Concepts
                </Button>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">Popular Topics</h2>
                {hasTopics ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Object.entries(conceptsByTopic)
                      .sort(([, a], [, b]) => (b as number) - (a as number))
                      .slice(0, 8)
                      .map(([topic, count]) => (
                        <div key={topic} className="bg-gray-50 rounded-lg p-4">
                          <div className="font-medium">{topic}</div>
                          <div className="text-sm text-gray-500">{count} concepts</div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No topics found. Create concepts to populate this section.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'due' && (
            <div data-testid="concepts-due-review">
              {hasDueConcepts ? (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold mb-4">Concepts Due for Review</h2>
                  <p className="text-gray-600 mb-4">
                    You have {dueConceptsArray.length} concepts due for review. Start a review session to reinforce your knowledge.
                  </p>
                  <Button onClick={handleStartReview} data-testid="start-review-button">
                    Start Review Session
                  </Button>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold mb-4">No Concepts Due</h2>
                  <p className="text-gray-600 mb-4">
                    You don&apos;t have any concepts due for review. Create new concepts or check back later.
                  </p>
                  <Button onClick={handleCreateConcept}>
                    Create New Concept
                  </Button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'statistics' && (
            <div data-testid="knowledge-statistics">
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">Overview</h2>
                {statistics ? (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-500">Total Concepts</div>
                      <div className="text-2xl font-bold">{statistics.total_concepts || 0}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-500">Due for Review</div>
                      <div className="text-2xl font-bold">{statistics.concepts_due || 0}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-500">Review Streak</div>
                      <div className="text-2xl font-bold">{statistics.review_streak || 0} days</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-500">Avg. Confidence</div>
                      <div className="text-2xl font-bold">
                        {statistics.average_confidence
                          ? `${statistics.average_confidence.toFixed(1)}/5`
                          : 'N/A'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">No statistics available yet. Start reviewing concepts to see your progress.</p>
                )}
              </div>

              {statistics?.concepts_by_confidence && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold mb-4">Confidence Levels</h2>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {[1, 2, 3, 4, 5].map(level => (
                      <div key={level} className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-500">Level {level}</div>
                        <div className="text-2xl font-bold">
                          {statistics.concepts_by_confidence[level] || 0}
                        </div>
                      </div>
                    ))}
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