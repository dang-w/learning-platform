'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useKnowledgeStore } from '@/lib/store/knowledge-store';
import ConceptForm from '@/components/knowledge/ConceptForm';
import { ConceptCreateInput, ConceptUpdateInput } from '@/types/knowledge';

export default function CreateConceptPage() {
  const router = useRouter();
  const { createConcept, conceptsError, clearErrors } = useKnowledgeStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: ConceptCreateInput | ConceptUpdateInput) => {
    try {
      setIsSubmitting(true);
      clearErrors();
      await createConcept(data as ConceptCreateInput);
      router.push('/knowledge/concepts');
    } catch (error) {
      console.error('Failed to create concept:', error);
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/knowledge/concepts');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Create New Concept</h1>
      </div>

      <ConceptForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={isSubmitting}
        error={conceptsError}
      />
    </div>
  );
}