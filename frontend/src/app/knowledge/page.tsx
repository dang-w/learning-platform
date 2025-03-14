'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { knowledgeApi } from '@/lib/api';
import { useKnowledgeStore } from '@/lib/store/knowledge-store';
import { Button } from '@/components/ui/buttons';
import { Alert } from '@/components/ui/feedback';

export default function KnowledgePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'concepts' | 'due' | 'statistics'>('concepts');

  // Get statistics
  const { data: statistics, isLoading: isLoadingStats } = useQuery({
    queryKey: ['knowledge', 'statistics'],
    queryFn: () => knowledgeApi.getReviewStatistics(),
  });

  // Get due concepts count
  const { data: dueConcepts, isLoading: isLoadingDue } = useQuery({
    queryKey: ['knowledge', 'due'],
    queryFn: () => knowledgeApi.getDueConcepts(),
  });

  const handleStartReview = () => {
    router.push('/knowledge/session');
  };

  const handleCreateConcept = () => {
    router.push('/knowledge/concepts/create');
  };

  const handleViewConcepts = () => {
    router.push('/knowledge/concepts');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Knowledge Management</h1>
        <div className="flex gap-4">
          <Button onClick={handleCreateConcept}>
            Create Concept
          </Button>
          {dueConcepts && dueConcepts.length > 0 && (
            <Button onClick={handleStartReview} variant="primary">
              Start Review ({dueConcepts.length})
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="flex -mb-px">
          <button
            onClick={() => setActiveTab('concepts')}
            className={`py-4 px-6 font-medium text-sm ${
              activeTab === 'concepts'
                ? 'border-b-2 border-indigo-500 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
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
          >
            Due for Review {dueConcepts && dueConcepts.length > 0 && `(${dueConcepts.length})`}
          </button>
          <button
            onClick={() => setActiveTab('statistics')}
            className={`py-4 px-6 font-medium text-sm ${
              activeTab === 'statistics'
                ? 'border-b-2 border-indigo-500 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Statistics
          </button>
        </nav>
      </div>

      {/* Content based on active tab */}
      <div className="mb-8">
        {activeTab === 'concepts' && (
          <div>
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Your Knowledge Base</h2>
              <p className="text-gray-600 mb-4">
                Create and manage your knowledge concepts. Organize them by topics and track your understanding over time.
              </p>
              <Button onClick={handleViewConcepts}>View All Concepts</Button>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Popular Topics</h2>
              {statistics && statistics.concepts_by_topic && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {Object.entries(statistics.concepts_by_topic)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 8)
                    .map(([topic, count]) => (
                      <div key={topic} className="bg-gray-50 rounded-lg p-4">
                        <div className="font-medium">{topic}</div>
                        <div className="text-sm text-gray-500">{count} concepts</div>
                      </div>
                    ))}
                </div>
              )}
              {isLoadingStats && <p>Loading topics...</p>}
            </div>
          </div>
        )}

        {activeTab === 'due' && (
          <div>
            {dueConcepts && dueConcepts.length > 0 ? (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">Concepts Due for Review</h2>
                <p className="text-gray-600 mb-4">
                  You have {dueConcepts.length} concepts due for review. Start a review session to reinforce your knowledge.
                </p>
                <Button onClick={handleStartReview} variant="primary">
                  Start Review Session
                </Button>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">No Concepts Due</h2>
                <p className="text-gray-600 mb-4">
                  You don't have any concepts due for review. Create new concepts or check back later.
                </p>
                <Button onClick={handleCreateConcept}>
                  Create New Concept
                </Button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'statistics' && (
          <div>
            {statistics ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold mb-4">Overview</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-500">Total Concepts</div>
                      <div className="text-2xl font-bold">{statistics.total_concepts}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-500">Due for Review</div>
                      <div className="text-2xl font-bold">{statistics.concepts_due}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-500">Review Streak</div>
                      <div className="text-2xl font-bold">{statistics.review_streak} days</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-500">Avg. Confidence</div>
                      <div className="text-2xl font-bold">{statistics.average_confidence.toFixed(1)}/5</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold mb-4">Confidence Levels</h2>
                  <div className="space-y-4">
                    {Object.entries(statistics.concepts_by_confidence).map(([level, count]) => (
                      <div key={level} className="flex items-center">
                        <div className="w-24 text-sm">{`Level ${level}`}</div>
                        <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-600 rounded-full"
                            style={{
                              width: `${(count / statistics.total_concepts) * 100}%`
                            }}
                          />
                        </div>
                        <div className="w-12 text-right text-sm">{count}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">No Statistics Available</h2>
                <p className="text-gray-600 mb-4">
                  Start creating concepts and reviewing them to generate statistics.
                </p>
                <Button onClick={handleCreateConcept}>
                  Create New Concept
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}