'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { knowledgeApi } from '@/lib/api';
import { Concept } from '@/types/knowledge';
import { Button } from '@/components/ui/buttons';
import { Input } from '@/components/ui/forms';
import { Spinner, Alert } from '@/components/ui/feedback';

export default function ConceptsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [filteredConcepts, setFilteredConcepts] = useState<Concept[]>([]);

  // Fetch all concepts
  const { data: concepts, isLoading, error } = useQuery({
    queryKey: ['concepts'],
    queryFn: () => knowledgeApi.getConcepts(),
  });

  // Get unique topics from concepts
  const topics = concepts ? [...new Set(concepts.flatMap(concept => concept.topics))] : [];

  // Filter concepts based on search term, topic, and difficulty
  useEffect(() => {
    if (!concepts) return;

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Knowledge Concepts</h1>
        <Button onClick={handleCreateConcept}>
          Create New Concept
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <Input
              id="search"
              type="text"
              placeholder="Search concepts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-1">
              Topic
            </label>
            <select
              id="topic"
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedTopic || ''}
              onChange={(e) => setSelectedTopic(e.target.value || null)}
            >
              <option value="">All Topics</option>
              {topics.map(topic => (
                <option key={topic} value={topic}>{topic}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-1">
              Difficulty
            </label>
            <select
              id="difficulty"
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedDifficulty || ''}
              onChange={(e) => setSelectedDifficulty(e.target.value || null)}
            >
              <option value="">All Difficulties</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>
      </div>

      {/* Concepts List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : error ? (
        <Alert variant="error">
          Failed to load concepts. Please try again.
        </Alert>
      ) : filteredConcepts.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <h2 className="text-xl font-semibold mb-2">No concepts found</h2>
          <p className="text-gray-600 mb-4">
            {concepts && concepts.length > 0
              ? 'Try adjusting your filters to see more results.'
              : 'Start by creating your first concept.'}
          </p>
          {concepts && concepts.length === 0 && (
            <Button onClick={handleCreateConcept}>
              Create First Concept
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Topics
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Difficulty
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Reviewed
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Confidence
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredConcepts.map((concept) => (
                <tr key={concept.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{concept.title}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {concept.topics.map(topic => (
                        <span
                          key={topic}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      concept.difficulty === 'beginner'
                        ? 'bg-green-100 text-green-800'
                        : concept.difficulty === 'intermediate'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                    }`}>
                      {concept.difficulty.charAt(0).toUpperCase() + concept.difficulty.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {concept.last_reviewed_at
                        ? formatDate(concept.last_reviewed_at)
                        : 'Never'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 rounded-full"
                          style={{ width: `${(concept.confidence_level / 5) * 100}%` }}
                        />
                      </div>
                      <span className="ml-2 text-sm text-gray-500">
                        {concept.confidence_level}/5
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Button
                      onClick={() => handleViewConcept(concept.id)}
                      variant="outline"
                      size="sm"
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}