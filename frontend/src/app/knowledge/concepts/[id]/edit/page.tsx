'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { knowledgeApi } from '@/lib/api';
import { useKnowledgeStore } from '@/lib/store/knowledge-store';
import { ConceptCreateInput, ConceptUpdateInput } from '@/types/knowledge';
import ConceptForm from '@/components/knowledge/ConceptForm';
import { Alert, Spinner } from '@/components/ui/feedback';
import { Button } from '@/components/ui/buttons';

export default function EditConceptPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { updateConcept, conceptsError, clearErrors } = useKnowledgeStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch concept details
  const { data: concept, isLoading, error } = useQuery({
    queryKey: ['concept', params.id],
    queryFn: () => knowledgeApi.getConcept(params.id),
  });

  const handleSubmit = async (data: ConceptCreateInput | ConceptUpdateInput) => {
    try {
      setIsSubmitting(true);
      clearErrors();
      await updateConcept({
        ...data,
        id: params.id,
      });
      router.push(`/knowledge/concepts/${params.id}`);
    } catch (error) {
      console.error('Failed to update concept:', error);
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push(`/knowledge/concepts/${params.id}`);
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
          <Button onClick={handleCancel}>Back to Concept</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Edit Concept</h1>
      </div>

      <ConceptForm
        initialData={concept}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={isSubmitting}
        error={conceptsError}
      />
    </div>
  );
}