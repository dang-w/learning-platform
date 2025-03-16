import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/buttons';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/cards';
import { Progress } from '@/components/ui/feedback/progress';
import { ReviewForm } from '@/components/reviews/ReviewForm';
import reviewsApi, { Concept, ReviewSession as ReviewSessionType } from '@/lib/api/reviews';

interface ReviewSessionProps {
  maxReviews?: number;
  onComplete: () => void;
}

export function ReviewSession({ maxReviews = 5, onComplete }: ReviewSessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviewedConcepts, setReviewedConcepts] = useState<Concept[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  // Fetch review session data
  const { data: session, isLoading, isError, refetch } = useQuery<ReviewSessionType>({
    queryKey: ['reviewSession', maxReviews],
    queryFn: () => reviewsApi.generateReviewSession(maxReviews),
  });

  const handleReviewSubmitted = () => {
    if (!session) return;

    const allConcepts = [...session.concepts, ...session.new_concepts];
    const currentConcept = allConcepts[currentIndex];

    if (currentConcept) {
      setReviewedConcepts(prev => [...prev, currentConcept]);
    }

    // Move to next concept or complete session
    if (currentIndex < allConcepts.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsComplete(true);
    }
  };

  const handleTryAgain = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
        <p className="ml-2">Loading review session...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-red-500 mb-4">Error loading review session</p>
        <Button onClick={handleTryAgain}>Try Again</Button>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-gray-500 mb-4">No concepts available for review</p>
        <Button onClick={onComplete}>Return to Dashboard</Button>
      </div>
    );
  }

  const allConcepts = [...session.concepts, ...session.new_concepts];
  const totalConcepts = allConcepts.length;
  const currentConcept = allConcepts[currentIndex];
  const progress = Math.round(((currentIndex + 1) / totalConcepts) * 100);

  if (isComplete) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Session Complete!</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-6">
            <div className="py-8">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-medium mt-4">You reviewed {reviewedConcepts.length} concepts</h3>
              <p className="text-gray-500 mt-2">Great job! Keep up the consistent review to improve retention.</p>
            </div>

            <Button onClick={onComplete}>Return to Dashboard</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Review Session</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm font-medium">{currentIndex + 1} of {totalConcepts}</span>
            </div>
            <Progress value={progress} />
          </div>

          <ReviewForm
            concept={currentConcept}
            onReviewSubmitted={handleReviewSubmitted}
            onCancel={onComplete}
          />
        </CardContent>
      </Card>
    </div>
  );
}