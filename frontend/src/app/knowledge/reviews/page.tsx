'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { knowledgeApi } from '@/lib/api';
import { Button } from '@/components/ui/buttons';
import { Alert, Spinner } from '@/components/ui/feedback';
import { Concept } from '@/types/knowledge';

export default function KnowledgeReviewPage() {
  const router = useRouter();
  const [selectedFilter, setSelectedFilter] = useState<string>('due');

  // Get due concepts
  const {
    data: dueConcepts,
    isLoading: isLoadingDueConcepts,
    error: dueConceptsError,
    refetch: refetchDueConcepts
  } = useQuery<Concept[]>({
    queryKey: ['knowledge', 'due'],
    queryFn: () => knowledgeApi.getDueConcepts(),
    retry: 2
  });

  // Get all concepts
  const {
    data: allConcepts,
    isLoading: isLoadingAllConcepts,
    error: allConceptsError,
    refetch: refetchAllConcepts
  } = useQuery<Concept[]>({
    queryKey: ['knowledge', 'concepts'],
    queryFn: () => knowledgeApi.getConcepts(),
    retry: 2
  });

  const isLoading = isLoadingDueConcepts || isLoadingAllConcepts;
  const error = dueConceptsError || allConceptsError;

  // Parse the concepts based on the selected filter
  const filteredConcepts = () => {
    if (!allConcepts) return [];

    switch (selectedFilter) {
      case 'due':
        return dueConcepts || [];
      case 'reviewed':
        return allConcepts.filter(concept => concept.review_count > 0);
      case 'not-reviewed':
        return allConcepts.filter(concept => concept.review_count === 0);
      default:
        return allConcepts;
    }
  };

  const handleStartReview = () => {
    router.push('/knowledge/session');
  };

  const handleRefetch = () => {
    refetchDueConcepts();
    refetchAllConcepts();
  };

  const handleFilterChange = (filter: string) => {
    setSelectedFilter(filter);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Knowledge Reviews</h1>
        <div className="flex space-x-4">
          {dueConcepts && dueConcepts.length > 0 && (
            <Button
              onClick={handleStartReview}
              data-testid="start-review-button"
            >
              Start Review Session
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="error" className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              {error instanceof Error
                ? error.message
                : 'Failed to load concepts. Please try again later.'}
            </div>
            <Button onClick={handleRefetch} size="sm">Retry</Button>
          </div>
        </Alert>
      )}

      {isLoading ? (
        <div className="flex justify-center my-8">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="space-y-6" data-testid="review-dashboard">
          {/* Filter tabs */}
          <div className="border-b border-gray-200" data-testid="filter-review-status">
            <nav className="-mb-px flex">
              <button
                onClick={() => handleFilterChange('all')}
                className={`py-4 px-6 font-medium text-sm ${
                  selectedFilter === 'all'
                    ? 'border-b-2 border-indigo-500 text-indigo-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                data-testid="filter-all"
              >
                All Concepts
              </button>
              <button
                onClick={() => handleFilterChange('due')}
                className={`py-4 px-6 font-medium text-sm ${
                  selectedFilter === 'due'
                    ? 'border-b-2 border-indigo-500 text-indigo-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                data-testid="filter-status-due"
              >
                Due for Review
              </button>
              <button
                onClick={() => handleFilterChange('reviewed')}
                className={`py-4 px-6 font-medium text-sm ${
                  selectedFilter === 'reviewed'
                    ? 'border-b-2 border-indigo-500 text-indigo-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                data-testid="filter-reviewed"
              >
                Reviewed
              </button>
              <button
                onClick={() => handleFilterChange('not-reviewed')}
                className={`py-4 px-6 font-medium text-sm ${
                  selectedFilter === 'not-reviewed'
                    ? 'border-b-2 border-indigo-500 text-indigo-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                data-testid="filter-not-reviewed"
              >
                Not Reviewed
              </button>
            </nav>
          </div>

          {/* Concepts list */}
          <div className="bg-white rounded-lg shadow-md p-6" data-testid="review-session">
            <h2 className="text-xl font-semibold mb-4">
              {selectedFilter === 'due'
                ? 'Concepts Due for Review'
                : selectedFilter === 'reviewed'
                ? 'Reviewed Concepts'
                : selectedFilter === 'not-reviewed'
                ? 'Not Reviewed Concepts'
                : 'All Concepts'}
            </h2>

            {filteredConcepts().length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No concepts found for the selected filter.
              </div>
            ) : (
              <div className="divide-y divide-gray-200" data-testid="concept-list">
                {filteredConcepts().map((concept) => (
                  <div
                    key={concept.id}
                    className="py-4 flex justify-between items-center"
                    data-testid="concept-item"
                    data-concept-id={concept.id}
                  >
                    <div>
                      <h3 className="font-medium text-gray-900">{concept.title}</h3>
                      <div data-testid="concept-content" className="mt-1 text-sm text-gray-600 line-clamp-2">
                        {concept.content}
                      </div>
                      <div className="mt-1 text-sm text-gray-500">
                        {concept.topics.map(topic => (
                          <span key={topic} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="text-gray-500" data-testid="next-review-date">
                        {concept.next_review_at
                          ? `Next review: ${new Date(concept.next_review_at).toLocaleDateString()}`
                          : 'Not scheduled'}
                      </div>
                      <div className="mt-1 text-gray-500" data-testid="review-history">
                        Reviewed: {concept.review_count || 0} times
                        {concept.review_count > 0 && ` • Last: ${getConfidenceLabel(3)}`}
                      </div>
                      <div className="mt-2">
                        <Button
                          onClick={() => router.push(`/knowledge/concepts/${concept.id}/review`)}
                          size="sm"
                          data-testid="review-concept-button"
                        >
                          Review
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function getConfidenceLabel(confidence: number): string {
  switch (confidence) {
    case 1: return 'Very Hard';
    case 2: return 'Hard';
    case 3: return 'Medium';
    case 4: return 'Easy';
    case 5: return 'Very Easy';
    default: return 'Unknown';
  }
}