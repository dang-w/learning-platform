'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { knowledgeApi } from '@/lib/api';
import { Concept } from '@/types/knowledge';
import { Button } from '@/components/ui/buttons';
import { Input } from '@/components/ui/forms';
import { Spinner, Alert } from '@/components/ui/feedback';
import { formatDate } from '@/lib/utils/date';

export default function ConceptsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [filteredConcepts, setFilteredConcepts] = useState<Concept[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch all concepts
  const {
    data: concepts = [],
    isLoading,
    refetch
  } = useQuery<Concept[]>({
    queryKey: ['concepts'],
    queryFn: () => knowledgeApi.getConcepts(),
    retry: 2,
    staleTime: 60000,
    onError: (error: Error) => {
      console.error('Failed to fetch concepts:', error);
      setErrorMessage(error.message || 'Failed to fetch concepts. Please try again.');
    }
  } as UseQueryOptions<Concept[], Error>);

  // Get unique topics from concepts
  const topics = [...new Set(concepts.flatMap(concept => concept.topics))];

  // Handle retry
  const handleRetry = () => {
    setErrorMessage(null);
    refetch();
  };

  // Filter concepts based on search term, topic, and difficulty
  useEffect(() => {
    if (concepts.length === 0) return;

    let filtered = [...concepts];

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        concept =>
          concept.title.toLowerCase().includes(term) ||
          concept.content.toLowerCase().includes(term)
      );
    }

    // Filter by topic
    if (selectedTopic) {
      filtered = filtered.filter(concept =>
        concept.topics.includes(selectedTopic)
      );
    }

    // Filter by difficulty
    if (selectedDifficulty) {
      filtered = filtered.filter(concept =>
        concept.difficulty === selectedDifficulty
      );
    }

    setFilteredConcepts(filtered);
  }, [concepts, searchTerm, selectedTopic, selectedDifficulty]);

  const handleCreateConcept = () => {
    router.push('/knowledge/concepts/create');
  };

  const handleViewConcept = (id: string) => {
    router.push(`/knowledge/concepts/${id}`);
  };

  const getDifficultyBadgeColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-blue-100 text-blue-800';
      case 'advanced':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8" data-testid="concepts-page">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Knowledge Concepts</h1>
        <Button onClick={handleCreateConcept} data-testid="create-concept-button">
          Create Concept
        </Button>
      </div>

      {/* Error message */}
      {errorMessage && (
        <Alert variant="error" className="mb-6" data-testid="concepts-error">
          <div className="flex justify-between items-center">
            <div>{errorMessage}</div>
            <Button onClick={handleRetry} size="sm">Retry</Button>
          </div>
        </Alert>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex justify-center my-12" data-testid="concepts-loading">
          <Spinner size="lg" />
        </div>
      )}

      {/* Filters */}
      {!isLoading && !errorMessage && (
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="concepts-filters">
          <div>
            <Input
              type="text"
              placeholder="Search concepts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="search-input"
            />
          </div>
          <div>
            <select
              className="w-full p-2 border rounded-md"
              value={selectedTopic || ''}
              onChange={(e) => setSelectedTopic(e.target.value || null)}
              data-testid="topic-filter"
            >
              <option value="">All Topics</option>
              {topics.map((topic) => (
                <option key={topic} value={topic}>
                  {topic}
                </option>
              ))}
            </select>
          </div>
          <div>
            <select
              className="w-full p-2 border rounded-md"
              value={selectedDifficulty || ''}
              onChange={(e) => setSelectedDifficulty(e.target.value || null)}
              data-testid="difficulty-filter"
            >
              <option value="">All Difficulties</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>
      )}

      {/* Concepts list */}
      {!isLoading && !errorMessage && (
        <>
          {filteredConcepts.length > 0 ? (
            <div className="space-y-4" data-testid="concepts-list">
              {filteredConcepts.map((concept) => (
                <div
                  key={concept.id}
                  className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handleViewConcept(concept.id)}
                  data-testid={`concept-item-${concept.id}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h2 className="text-xl font-semibold">{concept.title}</h2>
                    <div
                      className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getDifficultyBadgeColor(
                        concept.difficulty
                      )}`}
                    >
                      {concept.difficulty}
                    </div>
                  </div>

                  <p className="text-gray-600 mb-3 line-clamp-2">
                    {concept.content.substr(0, 150)}
                    {concept.content.length > 150 && '...'}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {concept.topics.map((topic) => (
                      <span
                        key={topic}
                        className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>

                  <div className="text-sm text-gray-500">
                    {concept.review_count > 0 ? (
                      <span>
                        Reviewed {concept.review_count} times • Last confidence: {concept.confidence_level || 'N/A'}
                      </span>
                    ) : (
                      <span>Never reviewed</span>
                    )}
                    <span className="mx-2">•</span>
                    <span>Created: {formatDate(concept.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-12 text-center" data-testid="no-concepts">
              <h2 className="text-xl font-semibold mb-4">No Concepts Found</h2>
              <p className="text-gray-600 mb-6">
                {concepts.length > 0
                  ? 'No concepts match your current filters. Try adjusting your search criteria.'
                  : 'You haven\'t created any concepts yet. Start by creating your first knowledge concept.'}
              </p>
              {concepts.length > 0 ? (
                <Button onClick={() => {
                  setSearchTerm('');
                  setSelectedTopic(null);
                  setSelectedDifficulty(null);
                }}>
                  Clear Filters
                </Button>
              ) : (
                <Button onClick={handleCreateConcept}>Create First Concept</Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}