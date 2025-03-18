'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/buttons';
import { Alert, Spinner } from '@/components/ui/feedback';
import { Badge } from '@/components/ui/data-display';
import ReactMarkdown from 'react-markdown';
import { knowledgeApi } from '@/lib/api';
import { Concept } from '@/types/knowledge';

export default function ReviewSessionPage() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [confidenceLevel, setConfidenceLevel] = useState(0);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInitializingSession, setIsInitializingSession] = useState(true);
  const [dueConcepts, setDueConcepts] = useState<Concept[]>([]);
  const [currentConcept, setCurrentConcept] = useState<Concept | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);

  // Initialize the review session
  useEffect(() => {
    const loadDueConcepts = async () => {
      try {
        setIsInitializingSession(true);
        setErrorMessage(null);

        const concepts = await knowledgeApi.getDueConcepts();

        if (concepts && concepts.length > 0) {
          setDueConcepts(concepts);
          setCurrentConcept(concepts[0]);
        } else {
          // No concepts due for review
          setDueConcepts([]);
          setCurrentConcept(null);
        }
      } catch (error) {
        console.error('Failed to load due concepts:', error);
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load due concepts. Please try again.');
      } finally {
        setIsInitializingSession(false);
      }
    };

    loadDueConcepts();
  }, []);

  const handleConfidenceSelect = (level: number) => {
    setConfidenceLevel(level);
  };

  const handleReviewSubmit = async () => {
    if (!currentConcept || confidenceLevel === 0) return;

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      // Submit the review
      await knowledgeApi.reviewConcept({
        concept_id: currentConcept.id,
        confidence_level: confidenceLevel,
        notes: reviewNotes,
      });

      // Move to the next concept or complete the session
      if (currentIndex < dueConcepts.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setCurrentConcept(dueConcepts[currentIndex + 1]);
        setConfidenceLevel(0);
        setReviewNotes('');
        setShowAnswer(false);
      } else {
        setSessionComplete(true);
      }
    } catch (error) {
      console.error('Failed to submit review:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to submit review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = async () => {
    setErrorMessage(null);

    if (isInitializingSession) {
      // Retry loading due concepts
      const loadDueConcepts = async () => {
        try {
          setIsInitializingSession(true);
          const concepts = await knowledgeApi.getDueConcepts();

          if (concepts && concepts.length > 0) {
            setDueConcepts(concepts);
            setCurrentConcept(concepts[0]);
          } else {
            setDueConcepts([]);
            setCurrentConcept(null);
          }
        } catch (error) {
          console.error('Failed to load due concepts:', error);
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load due concepts. Please try again.');
        } finally {
          setIsInitializingSession(false);
        }
      };

      loadDueConcepts();
    } else {
      // Retry submitting the current review
      handleReviewSubmit();
    }
  };

  const handleBackToDashboard = () => {
    router.push('/knowledge');
  };

  if (isInitializingSession) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" />
          <span className="ml-4 text-lg">Loading review session...</span>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="error" className="mb-6">
          <div className="flex justify-between items-center">
            <div>{errorMessage}</div>
            <Button onClick={handleRetry} size="sm">
              Retry
            </Button>
          </div>
        </Alert>
        <div className="flex justify-center mt-6">
          <Button onClick={handleBackToDashboard}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (dueConcepts.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 text-center" data-testid="review-dashboard">
          <h2 className="text-xl font-semibold mb-4">No Concepts Due for Review</h2>
          <p className="text-gray-600 mb-6">
            You don&apos;t have any concepts that need to be reviewed right now. Come back later or add new concepts.
          </p>
          <Button onClick={handleBackToDashboard} data-testid="return-to-dashboard-button">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (sessionComplete) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 text-center" data-testid="review-complete">
          <h2 className="text-xl font-semibold mb-4">Review Session Complete!</h2>
          <p className="text-gray-600 mb-6">
            You&apos;ve reviewed all your due concepts. Great job staying consistent with your learning!
          </p>
          <div className="bg-green-50 p-4 rounded-lg mb-6">
            <h3 className="font-medium mb-2">Session Summary</h3>
            <p>Concepts reviewed: {dueConcepts.length}</p>
          </div>
          <Button onClick={handleBackToDashboard} data-testid="return-to-dashboard-button">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Review Session</h1>
        <div className="text-gray-500">
          {currentIndex + 1} of {dueConcepts.length}
        </div>
      </div>

      {currentConcept && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6" data-testid="review-session">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-semibold">{currentConcept.title}</h2>
            <Badge variant="secondary">{currentConcept.difficulty}</Badge>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">Review this concept:</h3>
            {!showAnswer ? (
              <div className="p-6 bg-gray-50 rounded-lg mb-4">
                <p className="text-gray-700">Try to recall the details of this concept before revealing the answer.</p>
                <div className="mt-4">
                  <Button onClick={() => setShowAnswer(true)}>Show Answer</Button>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-gray-50 rounded-lg mb-4 prose max-w-none" data-testid="concept-content">
                <ReactMarkdown>{currentConcept.content}</ReactMarkdown>
              </div>
            )}
          </div>

          {showAnswer && (
            <>
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">How well did you recall this concept?</h3>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <button
                      key={level}
                      onClick={() => handleConfidenceSelect(level)}
                      className={`px-4 py-2 rounded-md flex-1 ${
                        confidenceLevel === level
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }`}
                      data-testid={`recall-rating-${level}`}
                    >
                      {level === 1 && 'Not at all (1)'}
                      {level === 2 && 'Barely (2)'}
                      {level === 3 && 'Somewhat (3)'}
                      {level === 4 && 'Mostly (4)'}
                      {level === 5 && 'Perfectly (5)'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">Notes (Optional)</h3>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add any notes about your understanding of this concept..."
                  className="w-full h-32 p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleReviewSubmit}
                  disabled={isSubmitting || confidenceLevel === 0}
                  variant="default"
                  data-testid="submit-review-button"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit & Continue'}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}