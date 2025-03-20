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
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Review Session</h1>
        <Button
          onClick={handleBackToDashboard}
          variant="outline"
        >
          Back to Dashboard
        </Button>
      </div>

      {errorMessage && (
        <Alert variant="error" className="mb-6">
          <div className="flex justify-between items-center">
            <div>{errorMessage}</div>
            <Button onClick={handleRetry} size="sm">Retry</Button>
          </div>
        </Alert>
      )}

      {isInitializingSession ? (
        <div className="flex justify-center my-12">
          <Spinner size="lg" />
        </div>
      ) : dueConcepts.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center"  data-testid="review-complete">
          <h2 className="text-xl font-semibold mb-2">No Concepts Due for Review</h2>
          <p className="text-gray-600 mb-6">
            You&apos;re all caught up! There are no concepts due for review at this time.
          </p>
          <Button
            onClick={handleBackToDashboard}
            data-testid="return-to-dashboard-button"
          >
            Return to Dashboard
          </Button>
        </div>
      ) : sessionComplete ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center" data-testid="review-complete">
          <h2 className="text-xl font-semibold mb-2">Review Session Complete</h2>
          <p className="text-gray-600 mb-6">
            You have completed reviewing all due concepts. Great job!
          </p>
          <div className="flex justify-center">
            <Button
              onClick={handleBackToDashboard}
              className="mx-2"
              data-testid="return-to-dashboard-button"
            >
              Return to Dashboard
            </Button>
            <Button
              onClick={handleRetry}
              variant="outline"
              className="mx-2"
            >
              Start New Session
            </Button>
          </div>
        </div>
      ) : currentConcept ? (
        <div className="bg-white rounded-lg shadow-md" data-testid="review-session">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{currentConcept.title}</h2>
              <Badge>{`${currentIndex + 1} of ${dueConcepts.length}`}</Badge>
            </div>
            <div className="flex space-x-2 mb-4">
              {currentConcept.topics.map(topic => (
                <Badge key={topic} variant="secondary">{topic}</Badge>
              ))}
            </div>
          </div>

          <div className="p-6" data-testid="concept-content">
            {!showAnswer ? (
              <div>
                <p className="text-lg font-medium mb-4">Try to recall this concept:</p>
                <Button
                  onClick={() => setShowAnswer(true)}
                  className="w-full"
                >
                  Show Answer
                </Button>
              </div>
            ) : (
              <div>
                <div className="prose max-w-none mb-8">
                  <ReactMarkdown>{currentConcept.content}</ReactMarkdown>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-medium mb-4">How well did you recall this concept?</h3>
                  <div className="grid grid-cols-5 gap-2 mb-6">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <button
                        key={level}
                        onClick={() => handleConfidenceSelect(level)}
                        className={`py-3 px-4 rounded-md text-center transition-colors ${
                          confidenceLevel === level
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                        data-testid={`recall-rating-${level}`}
                      >
                        {level === 1 && 'Very Hard'}
                        {level === 2 && 'Hard'}
                        {level === 3 && 'Medium'}
                        {level === 4 && 'Easy'}
                        {level === 5 && 'Very Easy'}
                      </button>
                    ))}
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes (optional):
                    </label>
                    <textarea
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      className="w-full p-2 border rounded-md"
                      rows={3}
                      placeholder="Add any notes about this review..."
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
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">No Concept Available</h2>
          <p className="text-gray-600 mb-6">
            There was an issue loading the current concept. Please try again.
          </p>
          <Button onClick={handleRetry}>Retry</Button>
        </div>
      )}
    </div>
  );
}