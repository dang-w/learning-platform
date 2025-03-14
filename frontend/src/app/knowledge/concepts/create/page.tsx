'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useKnowledgeStore } from '@/lib/store/knowledge-store';
import { Button } from '@/components/ui/buttons';
import { Input, FormGroup, Label, FormError } from '@/components/ui/forms';
import { Alert } from '@/components/ui/feedback';

// Define the form schema
const conceptSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  notes: z.string().optional(),
  topics: z.string().min(1, 'At least one topic is required'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
});

type ConceptFormData = z.infer<typeof conceptSchema>;

export default function CreateConceptPage() {
  const router = useRouter();
  const { createConcept, conceptsError, clearErrors } = useKnowledgeStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ConceptFormData>({
    resolver: zodResolver(conceptSchema),
    defaultValues: {
      title: '',
      content: '',
      notes: '',
      topics: '',
      difficulty: 'intermediate',
    },
  });

  const onSubmit = async (data: ConceptFormData) => {
    try {
      setIsSubmitting(true);
      clearErrors();

      // Convert comma-separated topics to array
      const topicsArray = data.topics.split(',').map(topic => topic.trim()).filter(Boolean);

      await createConcept({
        title: data.title,
        content: data.content,
        notes: data.notes,
        topics: topicsArray,
        difficulty: data.difficulty,
      });

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

      <div className="bg-white rounded-lg shadow-md p-6">
        {conceptsError && (
          <Alert variant="error" className="mb-6">
            {conceptsError}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <FormGroup>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              {...register('title')}
              placeholder="Enter concept title"
            />
            {errors.title && <FormError>{errors.title.message}</FormError>}
          </FormGroup>

          <FormGroup>
            <Label htmlFor="content">Content</Label>
            <textarea
              id="content"
              {...register('content')}
              placeholder="Enter concept content"
              className="w-full h-48 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.content && <FormError>{errors.content.message}</FormError>}
          </FormGroup>

          <FormGroup>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <textarea
              id="notes"
              {...register('notes')}
              placeholder="Enter additional notes"
              className="w-full h-24 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.notes && <FormError>{errors.notes.message}</FormError>}
          </FormGroup>

          <FormGroup>
            <Label htmlFor="topics">Topics (comma-separated)</Label>
            <Input
              id="topics"
              {...register('topics')}
              placeholder="e.g. machine learning, neural networks, python"
            />
            {errors.topics && <FormError>{errors.topics.message}</FormError>}
          </FormGroup>

          <FormGroup>
            <Label htmlFor="difficulty">Difficulty</Label>
            <select
              id="difficulty"
              {...register('difficulty')}
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
            {errors.difficulty && <FormError>{errors.difficulty.message}</FormError>}
          </FormGroup>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              onClick={handleCancel}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Concept'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}