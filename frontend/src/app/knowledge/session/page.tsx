'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useKnowledgeStore } from '@/lib/store/knowledge-store';
import { Button } from '@/components/ui/buttons';
import { Alert, Spinner } from '@/components/ui/feedback';
import { Badge } from '@/components/ui/data-display';
import { formatDate } from '@/lib/utils/date';

export default function ReviewSessionPage() {
  const router = useRouter();
  const {
    currentSession,
    createReviewSession,
    reviewConcept,
    completeReviewSession,
    isLoadingSession,
    sessionError,
    clearErrors,
  } = useKnowledgeStore();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [confidenceLevel, setConfidenceLevel] = useState(0);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);

  // Initialize the review session
  useEffect(() => {
    const initSession = async () => {
      try {
        clearErrors();
        await createReviewSession();
      } catch (error) {
        console.error('Failed to create review session:', error);
      }
    };

    if (!currentSession) {
      initSession();
    }
  }, [currentSession, createReviewSession, clearErrors]);

  const handleSubmitReview = async () => {
    if (!currentSession || confidenceLevel === 0) return;

    const currentConcept = currentSession.concepts[currentIndex];

    try {
      setIsSubmitting(true);
      await reviewConcept({
        concept_id: currentConcept.id,
        confidence_level: confidenceLevel,
        notes: reviewNotes || undefined,
      });

      // Reset for next concept
      setConfidenceLevel(0);
      setReviewNotes('');

      // Move to next concept or complete session
      if (currentIndex < currentSession.concepts.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setSessionComplete(true);
        await completeReviewSession();
      }
    } catch (error) {
      console.error('Failed to submit review:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinishSession = () => {
    router.push('/knowledge');
  };

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel this review session? Your progress will be lost.')) {
      router.push('/knowledge');
    }
  };

  if (isLoadingSession) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (sessionError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="error" className="mb-6">
          {sessionError}
        </Alert>
        <Button onClick={() => router.push('/knowledge')}>
          Back to Knowledge Dashboard
        </Button>
      </div>
    );
  }

  if (!currentSession || currentSession.concepts.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold mb-4">No Concepts Due for Review</h1>
          <p className="text-gray-600 mb-6">
            You don&apos;t have any concepts due for review at this time. Create new concepts or check back later.
          </p>
          <Button onClick={() => router.push('/knowledge')}>
            Back to Knowledge Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (sessionComplete) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <h1 className="text-2xl font-bold mb-4">Review Session Complete!</h1>
          <p className="text-gray-600 mb-6">
            You&apos;ve successfully reviewed {currentSession.concepts.length} concepts. Great job!
          </p>
          <div className="flex justify-center">
            <Button onClick={handleFinishSession}>
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentConcept = currentSession.concepts[currentIndex];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Review Session</h1>
        <div className="text-sm text-gray-500">
          Concept {currentIndex + 1} of {currentSession.concepts.length}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="md:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold">{currentConcept.title}</h2>
              <div className="flex gap-2">
                {currentConcept.topics.map((topic: string) => (
                  <Badge key={topic}>{topic}</Badge>
                ))}
              </div>
            </div>
            <div className="prose max-w-none mb-6">
              {currentConcept.content.split('\n').map((paragraph, index) => (
                <p key={index} className="mb-4">{paragraph}</p>
              ))}
            </div>
            {currentConcept.notes && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-medium mb-2">Notes</h3>
                <div className="prose max-w-none text-gray-600">
                  {currentConcept.notes.split('\n').map((paragraph, index) => (
                    <p key={index} className="mb-2">{paragraph}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Rate Your Understanding</h2>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confidence Level
              </label>
              <div className="flex flex-col gap-2">
                {[1, 2, 3, 4, 5].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setConfidenceLevel(level)}
                    className={`flex items-center p-3 rounded-md ${
                      confidenceLevel === level
                        ? 'bg-indigo-100 border border-indigo-300'
                        : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 ${
                      confidenceLevel === level
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}>
                      {level}
                    </div>
                    <div className="text-left">
                      <div className="font-medium">
                        {level === 1 && 'Not at all confident'}
                        {level === 2 && 'Slightly confident'}
                        {level === 3 && 'Somewhat confident'}
                        {level === 4 && 'Confident'}
                        {level === 5 && 'Very confident'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {level === 1 && 'I need to review this again soon'}
                        {level === 2 && 'I remembered parts of it'}
                        {level === 3 && 'I remembered most of it'}
                        {level === 4 && 'I remembered it well'}
                        {level === 5 && 'I know this perfectly'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label htmlFor="reviewNotes" className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                id="reviewNotes"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add any notes about your understanding..."
                className="w-full h-24 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-between">
              <Button
                onClick={handleCancel}
                variant="outline"
              >
                Cancel Session
              </Button>
              <Button
                onClick={handleSubmitReview}
                disabled={confidenceLevel === 0 || isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit & Continue'}
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-medium mb-3">Review History</h3>
            {currentConcept.review_count > 0 ? (
              <div className="text-sm text-gray-600">
                <p>Last reviewed: {formatDate(currentConcept.last_reviewed_at)}</p>
                <p>Current confidence: {currentConcept.confidence_level}/5</p>
                <p>Total reviews: {currentConcept.review_count}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-600">This concept has not been reviewed yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-indigo-600 h-2.5 rounded-full"
            style={{ width: `${((currentIndex + 1) / currentSession.concepts.length) * 100}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}