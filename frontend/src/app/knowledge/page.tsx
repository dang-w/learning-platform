'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { knowledgeApi } from '@/lib/api';
import { Button } from '@/components/ui/buttons';
import { Alert, Spinner } from '@/components/ui/feedback';
import { Concept, ReviewStatistics } from '@/types/knowledge';

// Define a type for topic with count
interface TopicWithCount {
  name: string;
  count: number;
}

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

  const isLoading = isLoadingStats || isLoadingDue;

  // Process data for UI
  const hasStatistics = statistics && Object.keys(statistics).length > 0;
  const dueConceptsArray = dueConcepts || [];
  const hasDueConcepts = dueConceptsArray.length > 0;

  // Check if topics is an array and not empty before using reduce
  const hasTopics = hasStatistics &&
    statistics?.topics &&
    Array.isArray(statistics.topics) &&
    statistics.topics.length > 0;

  // Process topics with safety checks
  const conceptsByTopic = hasStatistics && hasTopics
    ? statistics.topics.reduce<Record<string, number>>((acc, topic) => {
        if (typeof topic === 'string') {
          return { ...acc, [topic]: statistics.concepts_by_topic?.[topic] || 0 };
        } else {
          const typedTopic = topic as TopicWithCount;
          return { ...acc, [typedTopic.name]: typedTopic.count };
        }
      }, {})
    : {};

  const handleRetry = () => {
    refetchStatistics();
    refetchDueConcepts();
  };

  const handleStartReview = () => {
    router.push('/knowledge/session');
  };

  const handleCreateConcept = () => {
    router.push('/knowledge/concepts/new');
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
            <a
              href="/knowledge/reviews"
              className="py-4 px-6 font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300"
              data-testid="nav-knowledge-review"
            >
              Reviews
            </a>
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
                      .sort(([, a], [, b]) => (Number(b) - Number(a)))
                      .slice(0, 8)
                      .map(([topic, count]) => (
                        <div key={topic} className="bg-gray-50 rounded-lg p-4">
                          <div className="font-medium">{topic}</div>
                          <div className="text-sm text-gray-500">{String(count)} concepts</div>
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
                    You have {dueConceptsArray.length} concepts that are due for review. Regular reviews help strengthen your memory and improve retention.
                  </p>
                  <div className="divide-y divide-gray-200">
                    {dueConceptsArray.map((concept) => (
                      <div key={concept.id} className="py-4 flex justify-between items-center">
                        <div>
                          <h3 className="font-medium text-gray-900">{concept.title}</h3>
                          <div className="mt-1 text-sm text-gray-500">
                            {concept.topics.map(topic => (
                              <span key={topic} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          Last reviewed: {concept.last_reviewed_at ? new Date(concept.last_reviewed_at).toLocaleDateString() : 'Never'}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6">
                    <Button onClick={handleStartReview} data-testid="start-due-review-button">
                      Review All Due Concepts
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-md p-6 text-center">
                  <h2 className="text-xl font-semibold mb-2">No Concepts Due for Review</h2>
                  <p className="text-gray-600 mb-4">
                    You&apos;re all caught up! There are no concepts due for review at this time.
                  </p>
                  <Button onClick={handleCreateConcept} variant="secondary">
                    Create New Concept
                  </Button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'statistics' && (
            <div data-testid="review-statistics">
              {hasStatistics ? (
                <div className="space-y-6">
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-4">Review Statistics</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-500">Total Concepts</div>
                        <div className="text-3xl font-semibold">{statistics.total_concepts}</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-500">Total Reviews</div>
                        <div className="text-3xl font-semibold">{statistics.total_reviews}</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-500">Average Confidence</div>
                        <div className="text-3xl font-semibold">{statistics.average_confidence.toFixed(1)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-4">Confidence Distribution</h2>
                    <div className="flex h-16 mb-2">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className="flex-1 mx-1 bg-blue-100 relative"
                          style={{
                            height: '100%',
                            backgroundColor: level <= 2 ? '#FEE2E2' : level === 3 ? '#FEF3C7' : '#DCFCE7',
                          }}
                        >
                          <div
                            className="absolute bottom-0 w-full"
                            style={{
                              height: `${(statistics?.concepts_by_confidence && statistics.concepts_by_confidence[level]) ?
                                statistics.concepts_by_confidence[level] * 100 : 0}%`,
                              backgroundColor: level <= 2 ? '#EF4444' : level === 3 ? '#F59E0B' : '#10B981',
                            }}
                          ></div>
                        </div>
                      ))}
                    </div>
                    <div className="flex text-xs text-gray-500 justify-between">
                      <div>1 - Very Hard</div>
                      <div>2 - Hard</div>
                      <div>3 - Medium</div>
                      <div>4 - Easy</div>
                      <div>5 - Very Easy</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-md p-6 text-center">
                  <h2 className="text-xl font-semibold mb-2">No Statistics Available</h2>
                  <p className="text-gray-600 mb-4">
                    You haven&apos;t reviewed any concepts yet. Start reviewing to see your statistics.
                  </p>
                  {hasDueConcepts ? (
                    <Button onClick={handleStartReview} variant="default">
                      Start Review Session
                    </Button>
                  ) : (
                    <Button onClick={handleCreateConcept} variant="secondary">
                      Create New Concept
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}