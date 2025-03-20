'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { knowledgeApi } from '@/lib/api';
import { Button } from '@/components/ui/buttons';
import { Alert, Spinner } from '@/components/ui/feedback';
import { Badge } from '@/components/ui/data-display';
import ReactMarkdown from 'react-markdown';
import { Concept, Review } from '@/types/knowledge';

interface ReviewPageProps {
  params: {
    id: string;
  };
}

export default function ConceptReviewPage({ params }: ReviewPageProps) {
  const router = useRouter();
  const conceptId = params.id;

  const [concept, setConcept] = useState<Concept | null>(null);
  const [reviewHistory, setReviewHistory] = useState<Review[]>([]);
  const [confidenceLevel, setConfidenceLevel] = useState(0);
  const [reviewNotes, setReviewNotes] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  useEffect(() => {
    const loadConcept = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        // Load concept details
        const conceptData = await knowledgeApi.getConcept(conceptId);
        setConcept(conceptData);

        // Load review history
        const history = await knowledgeApi.getConceptReviewHistory(conceptId);
        setReviewHistory(history);
      } catch (error) {
        console.error('Failed to load concept:', error);
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load concept. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadConcept();
  }, [conceptId]);

  const handleConfidenceSelect = (level: number) => {
    setConfidenceLevel(level);
  };

  const handleReviewSubmit = async () => {
    if (!concept || confidenceLevel === 0) return;

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      // Submit the review
      await knowledgeApi.reviewConcept({
        concept_id: concept.id,
        confidence_level: confidenceLevel,
        notes: reviewNotes,
      });

      setReviewSubmitted(true);
    } catch (error) {
      console.error('Failed to submit review:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to submit review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    setErrorMessage(null);
    if (concept) {
      handleReviewSubmit();
    } else {
      // Reload the current page
      router.refresh();
    }
  };

  const handleBackToConcepts = () => {
    router.push('/knowledge/concepts');
  };

  const handleBackToReviews = () => {
    router.push('/knowledge/reviews');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64" data-testid="loading-spinner">
          <Spinner size="lg" />
          <span className="ml-4 text-lg">Loading concept...</span>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="error" className="mb-6" data-testid="error-message">
          <div className="flex justify-between items-center">
            <div>{errorMessage}</div>
            <Button onClick={handleRetry} size="sm">
              Retry
            </Button>
          </div>
        </Alert>
        <div className="flex justify-center mt-6">
          <Button onClick={handleBackToConcepts} data-testid="back-to-concepts-button">
            Back to Concepts
          </Button>
        </div>
      </div>
    );
  }

  if (!concept) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="error" className="mb-6" data-testid="not-found-message">
          <div>Concept not found</div>
        </Alert>
        <div className="flex justify-center mt-6">
          <Button onClick={handleBackToConcepts} data-testid="back-to-concepts-button">
            Back to Concepts
          </Button>
        </div>
      </div>
    );
  }

  if (reviewSubmitted) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 text-center" data-testid="review-success">
          <h2 className="text-xl font-semibold mb-4">Review Submitted!</h2>
          <p className="text-gray-600 mb-6">
            Your review for &quot;{concept.title}&quot; has been recorded. The next review will be scheduled based on your confidence level.
          </p>
          <div className="flex justify-center space-x-4">
            <Button onClick={handleBackToConcepts} data-testid="back-to-concepts-button">
              Back to Concepts
            </Button>
            <Button onClick={handleBackToReviews} variant="outline" data-testid="back-to-reviews-button">
              Back to Reviews
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900" data-testid="review-heading">
          Review Concept
        </h1>
        <div className="flex space-x-4">
          <Button
            onClick={handleBackToConcepts}
            variant="outline"
            data-testid="back-to-concepts-button"
          >
            Back to Concepts
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8" data-testid="review-card">
        <div className="p-6">
          <h2 className="text-2xl font-semibold mb-2" data-testid="concept-title">{concept.title}</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {concept.topics.map((topic) => (
              <Badge key={topic} data-testid="topic-badge">
                {topic}
              </Badge>
            ))}
          </div>

          <div className="mb-6">
            <h3 className="font-medium text-lg mb-2">Question</h3>
            <div className="p-4 bg-gray-50 rounded-md" data-testid="concept-question">
              Can you recall and explain this concept?
            </div>
          </div>

          {!showAnswer ? (
            <div className="flex justify-center my-6">
              <Button
                onClick={() => setShowAnswer(true)}
                data-testid="show-answer-button"
              >
                Show Answer
              </Button>
            </div>
          ) : (
            <div className="mb-6">
              <h3 className="font-medium text-lg mb-2">Content</h3>
              <div className="p-4 bg-gray-50 rounded-md prose max-w-none" data-testid="concept-content">
                <ReactMarkdown>{concept.content}</ReactMarkdown>
              </div>
            </div>
          )}

          {showAnswer && (
            <div className="mt-8">
              <h3 className="font-medium text-lg mb-4">How well did you remember this?</h3>
              <div className="grid grid-cols-5 gap-3 mb-6" data-testid="confidence-buttons">
                {[1, 2, 3, 4, 5].map((level) => (
                  <Button
                    key={level}
                    variant={confidenceLevel === level ? 'default' : 'outline'}
                    onClick={() => handleConfidenceSelect(level)}
                    data-testid={`confidence-level-${level}`}
                    aria-pressed={confidenceLevel === level}
                  >
                    {level === 1 && 'Very Hard'}
                    {level === 2 && 'Hard'}
                    {level === 3 && 'Medium'}
                    {level === 4 && 'Easy'}
                    {level === 5 && 'Very Easy'}
                  </Button>
                ))}
              </div>

              <div className="mb-6">
                <label htmlFor="review-notes" className="block font-medium mb-2">
                  Notes (optional)
                </label>
                <textarea
                  id="review-notes"
                  className="w-full p-3 border border-gray-300 rounded-md"
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add any notes about this review..."
                  data-testid="review-notes"
                />
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleReviewSubmit}
                  disabled={confidenceLevel === 0 || isSubmitting}
                  data-testid="submit-review-button"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Review'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {reviewHistory.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6" data-testid="review-history">
          <h3 className="text-xl font-semibold mb-4">Review History</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Confidence</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reviewHistory.map((review, index) => (
                  <tr key={index} data-testid="review-history-item">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(review.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        variant={
                          review.confidence_level <= 2 ? 'danger' :
                          review.confidence_level === 3 ? 'warning' :
                          'success'
                        }
                        data-testid="confidence-badge"
                      >
                        {review.confidence_level === 1 && 'Very Hard'}
                        {review.confidence_level === 2 && 'Hard'}
                        {review.confidence_level === 3 && 'Medium'}
                        {review.confidence_level === 4 && 'Easy'}
                        {review.confidence_level === 5 && 'Very Easy'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500" data-testid="review-note">
                      {review.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}