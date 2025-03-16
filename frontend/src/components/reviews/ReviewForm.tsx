import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/buttons';
import { Card, CardContent } from '@/components/ui/cards';
import reviewsApi, { Concept } from '@/lib/api/reviews';

interface ReviewFormProps {
  concept: Concept;
  onReviewSubmitted: () => void;
  onCancel: () => void;
}

export function ReviewForm({ concept, onReviewSubmitted, onCancel }: ReviewFormProps) {
  const [confidence, setConfidence] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reviewMutation = useMutation({
    mutationFn: (confidenceLevel: number) =>
      reviewsApi.markConceptReviewed(concept.id, { confidence: confidenceLevel }),
    onSuccess: () => {
      onReviewSubmitted();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (confidence === null) {
      setError('Please select a confidence level');
      return;
    }

    reviewMutation.mutate(confidence);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Review: {concept.title}</h2>

      <Card>
        <CardContent className="pt-6">
          <div className="prose max-w-none">
            <p>{concept.content}</p>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-4">How well do you know this concept?</h3>

          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((level) => (
              <div key={level} className="flex items-center">
                <input
                  type="radio"
                  id={`confidence-${level}`}
                  name="confidence"
                  value={level}
                  checked={confidence === level}
                  onChange={() => {
                    setConfidence(level);
                    setError(null);
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor={`confidence-${level}`} className="ml-2 block text-sm text-gray-700">
                  {level} - {getConfidenceLabel(level)}
                </label>
              </div>
            ))}
          </div>

          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={reviewMutation.isPending}
          >
            {reviewMutation.isPending ? 'Submitting...' : 'Submit Review'}
          </Button>
        </div>
      </form>
    </div>
  );
}

function getConfidenceLabel(level: number): string {
  switch (level) {
    case 1:
      return 'Not at all';
    case 2:
      return 'Barely';
    case 3:
      return 'Somewhat';
    case 4:
      return 'Well';
    case 5:
      return 'Very well';
    default:
      return '';
  }
}