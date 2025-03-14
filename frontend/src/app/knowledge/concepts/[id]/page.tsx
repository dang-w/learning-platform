'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { knowledgeApi } from '@/lib/api';
import { useKnowledgeStore } from '@/lib/store/knowledge-store';
import { Button } from '@/components/ui/buttons';
import { Spinner, Alert } from '@/components/ui/feedback';

export default function ConceptDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [isReviewing, setIsReviewing] = useState(false);
  const [confidenceLevel, setConfidenceLevel] = useState<number>(0);
  const [reviewNotes, setReviewNotes] = useState('');
  const { reviewConcept, conceptsError, clearErrors } = useKnowledgeStore();

  // Fetch concept details
  const { data: concept, isLoading, error } = useQuery({
    queryKey: ['concept', params.id],
    queryFn: () => knowledgeApi.getConcept(params.id),
  });

  const handleEdit = () => {
    router.push(`/knowledge/concepts/${params.id}/edit`);
  };

  const handleBack = () => {
    router.push('/knowledge/concepts');
  };

  const handleStartReview = () => {
    setIsReviewing(true);
    setConfidenceLevel(0);
    setReviewNotes('');
  };

  const handleSubmitReview = async () => {
    if (confidenceLevel === 0) {
      return; // Don't submit if no confidence level is selected
    }

    try {
      clearErrors();
      await reviewConcept({
        concept_id: params.id,
        confidence_level: confidenceLevel,
        notes: reviewNotes || undefined,
      });

      setIsReviewing(false);
      // Refetch the concept to update the UI
      router.refresh();
    } catch (error) {
      console.error('Failed to submit review:', error);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';

    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  if (error || !concept) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="error">
          Failed to load concept. It may have been deleted or you don&apos;t have permission to view it.
        </Alert>
        <div className="mt-4">
          <Button onClick={handleBack}>Back to Concepts</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">{concept.title}</h1>
        <div className="flex gap-4">
          <Button onClick={handleBack} variant="outline">
            Back
          </Button>
          <Button onClick={handleEdit}>
            Edit
          </Button>
          {!isReviewing && (
            <Button onClick={handleStartReview}>
              Review Now
            </Button>
          )}
        </div>
      </div>

      {conceptsError && (
        <Alert variant="error" className="mb-6">
          {conceptsError}
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="md:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Content</h2>
            <div className="prose max-w-none">
              {concept.content.split('\n').map((paragraph, index) => (
                <p key={index} className="mb-4">{paragraph}</p>
              ))}
            </div>
          </div>

          {concept.notes && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Notes</h2>
              <div className="prose max-w-none">
                {concept.notes.split('\n').map((paragraph, index) => (
                  <p key={index} className="mb-4">{paragraph}</p>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Details</h2>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-500">Topics</div>
                <div className="flex flex-wrap gap-2 mt-1">
                  {concept.topics.map(topic => (
                    <span
                      key={topic}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-500">Difficulty</div>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    concept.difficulty === 'beginner'
                      ? 'bg-green-100 text-green-800'
                      : concept.difficulty === 'intermediate'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                  }`}>
                    {concept.difficulty.charAt(0).toUpperCase() + concept.difficulty.slice(1)}
                  </span>
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-500">Created</div>
                <div className="mt-1">{formatDate(concept.created_at)}</div>
              </div>

              <div>
                <div className="text-sm text-gray-500">Last Reviewed</div>
                <div className="mt-1">{formatDate(concept.last_reviewed_at)}</div>
              </div>

              <div>
                <div className="text-sm text-gray-500">Next Review</div>
                <div className="mt-1">{formatDate(concept.next_review_at)}</div>
              </div>

              <div>
                <div className="text-sm text-gray-500">Review Count</div>
                <div className="mt-1">{concept.review_count}</div>
              </div>

              <div>
                <div className="text-sm text-gray-500">Confidence Level</div>
                <div className="flex items-center mt-1">
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full"
                      style={{ width: `${(concept.confidence_level / 5) * 100}%` }}
                    />
                  </div>
                  <span className="ml-2 text-sm font-medium">
                    {concept.confidence_level}/5
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Review Section */}
      {isReviewing && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Review Concept</h2>
          <p className="text-gray-600 mb-6">
            Rate your confidence level with this concept and add any notes about your understanding.
          </p>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confidence Level
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setConfidenceLevel(level)}
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-medium ${
                    confidenceLevel === level
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
            <div className="mt-2 text-sm text-gray-500">
              1 = Not confident at all, 5 = Very confident
            </div>
          </div>

          <div className="mb-6">
            <label htmlFor="reviewNotes" className="block text-sm font-medium text-gray-700 mb-2">
              Review Notes (Optional)
            </label>
            <textarea
              id="reviewNotes"
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Add any notes about your understanding..."
              className="w-full h-24 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-4">
            <Button
              onClick={() => setIsReviewing(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitReview}
              disabled={confidenceLevel === 0}
            >
              Submit Review
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}