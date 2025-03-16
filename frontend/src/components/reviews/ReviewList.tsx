import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/cards';
import { Button } from '@/components/ui/buttons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import reviewsApi, { Concept } from '@/lib/api/reviews';

interface ReviewListProps {
  onStartReview: (concepts: Concept[]) => void;
}

export function ReviewList({ onStartReview }: ReviewListProps) {
  const [selectedTab, setSelectedTab] = useState('due');
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);

  // Fetch due concepts
  const { data: dueConcepts = [], isLoading: isDueLoading, isError: isDueError, refetch: refetchDue } = useQuery({
    queryKey: ['dueConcepts'],
    queryFn: () => reviewsApi.getDueConcepts(),
  });

  // Fetch new concepts
  const { data: newConcepts = [], isLoading: isNewLoading, isError: isNewError, refetch: refetchNew } = useQuery({
    queryKey: ['newConcepts'],
    queryFn: () => reviewsApi.getNewConcepts(3),
  });

  const handleConceptClick = (concept: Concept) => {
    setSelectedConcept(concept);
  };

  const handleStartReview = () => {
    onStartReview(dueConcepts);
  };

  const handleTryAgain = () => {
    refetchDue();
    refetchNew();
  };

  const isLoading = isDueLoading || isNewLoading;
  const isError = isDueError || isNewError;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
        <p className="ml-2">Loading concepts...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-red-500 mb-4">Error loading concepts</p>
        <Button onClick={handleTryAgain}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Knowledge Review</h2>
        {dueConcepts.length > 0 && (
          <Button onClick={handleStartReview}>
            Start Review ({dueConcepts.length})
          </Button>
        )}
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="due">Due for Review</TabsTrigger>
          <TabsTrigger value="new">New Concepts</TabsTrigger>
        </TabsList>

        <TabsContent value="due" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Concepts Due for Review</CardTitle>
            </CardHeader>
            <CardContent>
              {dueConcepts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    {dueConcepts.map((concept) => (
                      <div
                        key={concept.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedConcept?.id === concept.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => handleConceptClick(concept)}
                      >
                        <h3 className="font-medium">{concept.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {concept.topics.join(', ')}
                        </p>
                      </div>
                    ))}
                  </div>

                  {selectedConcept && (
                    <div className="p-4 border rounded-lg bg-gray-50">
                      <h3 className="font-medium mb-2">{selectedConcept.title}</h3>
                      <p className="text-sm mb-4">{selectedConcept.content}</p>

                      <div className="text-sm text-gray-500 space-y-1">
                        <p>Topics: {selectedConcept.topics.join(', ')}</p>
                        {selectedConcept.reviews.length > 0 && (
                          <>
                            <p>
                              Last reviewed: {format(parseISO(selectedConcept.reviews[selectedConcept.reviews.length - 1].date), 'MMM dd, yyyy')}
                            </p>
                            <p>
                              Confidence: {selectedConcept.reviews[selectedConcept.reviews.length - 1].confidence}/5
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">You don&apos;t have any concepts due for review</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Add new concepts or check back later
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="new" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>New Concepts to Learn</CardTitle>
            </CardHeader>
            <CardContent>
              {newConcepts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    {newConcepts.map((concept) => (
                      <div
                        key={concept.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedConcept?.id === concept.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => handleConceptClick(concept)}
                      >
                        <h3 className="font-medium">{concept.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {concept.topics.join(', ')}
                        </p>
                      </div>
                    ))}
                  </div>

                  {selectedConcept && (
                    <div className="p-4 border rounded-lg bg-gray-50">
                      <h3 className="font-medium mb-2">{selectedConcept.title}</h3>
                      <p className="text-sm mb-4">{selectedConcept.content}</p>

                      <div className="text-sm text-gray-500">
                        <p>Topics: {selectedConcept.topics.join(', ')}</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">You don&apos;t have any new concepts to learn</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Add new concepts to start learning
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}