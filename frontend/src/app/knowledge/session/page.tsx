'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useKnowledgeStore } from '@/lib/store/knowledge-store';
import { Button } from '@/components/ui/buttons';
import { Spinner, Alert } from '@/components/ui/feedback';

export default function ReviewSessionPage() {
  const router = useRouter();
  const {
    currentSession,
    createReviewSession,
    completeReviewSession,
    reviewConcept,
    isLoadingSession,
    sessionError,
    clearErrors
  } = useKnowledgeStore();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [confidenceLevel, setConfidenceLevel] = useState<number>(0);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSessionComplete, setIsSessionComplete] = useState(false);

  // Create a new review session when the page loads
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

  // Get the current concept being reviewed
  const currentConcept = currentSession?.concepts[currentIndex];

  const handleSubmitReview = async () => {
    if (!currentConcept || confidenceLevel === 0) return;

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
      if (currentIndex < currentSession!.concepts.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        await completeReviewSession();
        setIsSessionComplete(true);
      }
    } catch (error) {
      console.error('Failed to submit review:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    // Move to next concept without reviewing
    if (currentIndex < currentSession!.concepts.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setConfidenceLevel(0);
      setReviewNotes('');
    }
  };

  const handleFinish = () => {
    router.push('/knowledge');
  };

  if (isLoadingSession) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  if (sessionError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="error" className="mb-6">
          {sessionError}
        </Alert>
        <Button onClick={handleFinish}>
          Back to Knowledge
        </Button>
      </div>
    );
  }

  if (!currentSession || currentSession.concepts.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <h2 className="text-xl font-semibold mb-2">No Concepts to Review</h2>
          <p className="text-gray-600 mb-6">
            You don&apos;t have any concepts due for review at the moment. Check back later or create new concepts.
          </p>
          <Button onClick={handleFinish}>
            Back to Knowledge
          </Button>
        </div>
      </div>
    );
  }

  if (isSessionComplete) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <h2 className="text-2xl font-bold mb-4">Review Session Complete!</h2>
          <p className="text-gray-600 mb-6">
            You&apos;ve successfully reviewed all concepts in this session. Your progress has been saved.
          </p>
          <Button onClick={handleFinish}>
            Back to Knowledge
          </Button>
        </div>
      </div>
    );
  }

  // At this point, we know currentConcept exists
  if (!currentConcept) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="error" className="mb-6">
          Error loading concept. Please try again.
        </Alert>
        <Button onClick={handleFinish}>
          Back to Knowledge
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Review Session</h1>
        <div className="text-gray-500">
          Concept {currentIndex + 1} of {currentSession.concepts.length}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">{currentConcept.title}</h2>
        <div className="prose max-w-none mb-6">
          {currentConcept.content.split('\n').map((paragraph, index) => (
            <p key={index} className="mb-4">{paragraph}</p>
          ))}
        </div>

        {currentConcept.notes && (
          <div className="bg-gray-50 p-4 rounded-md mb-6">
            <h3 className="text-lg font-medium mb-2">Notes</h3>
            <div className="prose max-w-none">
              {currentConcept.notes.split('\n').map((paragraph, index) => (
                <p key={index} className="mb-2">{paragraph}</p>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-6">
          {currentConcept.topics.map(topic => (
            <span
              key={topic}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
            >
              {topic}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h3 className="text-lg font-medium mb-4">Rate Your Confidence</h3>
        <p className="text-gray-600 mb-6">
          How confident are you with this concept?
        </p>

        <div className="mb-6">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setConfidenceLevel(level)}
                className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-medium ${
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

        <div className="flex justify-between">
          <Button
            onClick={handleSkip}
            variant="outline"
            disabled={isSubmitting}
          >
            Skip for Now
          </Button>
          <Button
            onClick={handleSubmitReview}
            disabled={confidenceLevel === 0 || isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit & Continue'}
          </Button>
        </div>
      </div>
    </div>
  );
}