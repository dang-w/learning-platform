'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import knowledgeApi from '@/lib/api/knowledge';
import { useKnowledgeStore } from '@/lib/store/knowledge-store';
import { Button } from '@/components/ui/buttons';
import { Alert, Spinner } from '@/components/ui/feedback';
import { Badge } from '@/components/ui/data-display';
import { formatDate } from '@/lib/utils/date';

export default function ConceptDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [confidenceLevel, setConfidenceLevel] = useState(3);
  const [reviewNotes, setReviewNotes] = useState('');
  const { deleteConcept, reviewConcept, conceptsError, clearErrors } = useKnowledgeStore();

  // Fetch concept details
  const { data: concept, isLoading, error } = useQuery({
    queryKey: ['concept', params.id],
    queryFn: () => knowledgeApi.getConcept(params.id),
  });

  const handleEdit = () => {
    router.push(`/knowledge/concepts/${params.id}/edit`);
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this concept?')) {
      try {
        setIsDeleting(true);
        clearErrors();
        await deleteConcept(params.id);
        router.push('/knowledge/concepts');
      } catch (error) {
        console.error('Failed to delete concept:', error);
        setIsDeleting(false);
      }
    }
  };

  const handleReview = () => {
    setReviewModalOpen(true);
  };

  const submitReview = async () => {
    try {
      await reviewConcept({
        concept_id: params.id,
        confidence_level: confidenceLevel,
        notes: reviewNotes,
      });
      setReviewModalOpen(false);
      router.refresh();
    } catch (error) {
      console.error('Failed to submit review:', error);
    }
  };

  const handleBack = () => {
    router.push('/knowledge/concepts');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !concept) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="error">
          {error instanceof Error ? error.message : 'Failed to load concept'}
        </Alert>
        <div className="mt-4">
          <Button onClick={handleBack}>Back to Concepts</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {conceptsError && (
        <Alert variant="error" className="mb-6">
          {conceptsError}
        </Alert>
      )}

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">{concept.title}</h1>
        <div className="flex gap-4">
          <Button onClick={handleReview} variant="secondary">
            Mark as Reviewed
          </Button>
          <Button onClick={handleEdit}>
            Edit
          </Button>
          <Button onClick={handleDelete} variant="destructive" disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Content</h2>
            <div className="prose max-w-none">
              {concept.content.split('\n').map((paragraph: string, index: number) => (
                <p key={index} className="mb-4">{paragraph}</p>
              ))}
            </div>
          </div>

          {concept.notes && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Notes</h2>
              <div className="prose max-w-none">
                {concept.notes.split('\n').map((paragraph: string, index: number) => (
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
                <h3 className="text-sm font-medium text-gray-500">Difficulty</h3>
                <p className="mt-1 text-sm text-gray-900 capitalize">{concept.difficulty}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Topics</h3>
                <div className="mt-1 flex flex-wrap gap-2">
                  {concept.topics.map((topic: string) => (
                    <Badge key={topic}>{topic}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Created</h3>
                <p className="mt-1 text-sm text-gray-900">{formatDate(concept.created_at)}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Last Reviewed</h3>
                <p className="mt-1 text-sm text-gray-900">
                  {concept.last_reviewed_at ? formatDate(concept.last_reviewed_at) : 'Never'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Next Review</h3>
                <p className="mt-1 text-sm text-gray-900">
                  {concept.next_review_at ? formatDate(concept.next_review_at) : 'Not scheduled'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Review Count</h3>
                <p className="mt-1 text-sm text-gray-900">{concept.review_count}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Confidence Level</h3>
                <div className="mt-1 flex items-center">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full"
                      style={{ width: `${(concept.confidence_level / 5) * 100}%` }}
                    />
                  </div>
                  <span className="ml-2 text-sm text-gray-900">{concept.confidence_level}/5</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {reviewModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Review Concept</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confidence Level (1-5)
              </label>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Low</span>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setConfidenceLevel(level)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        confidenceLevel === level
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
                <span className="text-sm text-gray-500">High</span>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                className="w-full h-24 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add any notes about your understanding..."
              />
            </div>
            <div className="flex justify-end gap-4">
              <Button
                variant="outline"
                onClick={() => setReviewModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={submitReview}
              >
                Submit Review
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}