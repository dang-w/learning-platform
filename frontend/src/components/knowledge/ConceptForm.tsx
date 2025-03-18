'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/buttons';
import { Input, FormGroup, Label, FormError } from '@/components/ui/forms';
import { Alert } from '@/components/ui/feedback';
import { Concept, ConceptCreateInput, ConceptUpdateInput } from '@/types/knowledge';
import dynamic from 'next/dynamic';
import 'react-markdown-editor-lite/lib/index.css';

// Dynamically import the markdown editor to avoid SSR issues
const MarkdownEditor = dynamic(() => import('react-markdown-editor-lite'), {
  ssr: false,
});

// Define the form schema
const conceptSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  notes: z.string().optional(),
  topics: z.string().min(1, 'At least one topic is required'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
});

export type ConceptFormData = z.infer<typeof conceptSchema>;

interface ConceptFormProps {
  initialData?: Concept;
  onSubmit: (data: ConceptCreateInput | ConceptUpdateInput) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  error: string | null;
}

export default function ConceptForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
  error,
}: ConceptFormProps) {
  const [markdownContent, setMarkdownContent] = useState('');
  const [validationTriggered, setValidationTriggered] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    trigger,
    watch,
  } = useForm<ConceptFormData>({
    resolver: zodResolver(conceptSchema),
    defaultValues: {
      title: initialData?.title || '',
      content: initialData?.content || '',
      notes: initialData?.notes || '',
      topics: initialData?.topics?.join(', ') || '',
      difficulty: initialData?.difficulty || 'beginner',
    },
    mode: 'onChange',
  });

  // Initialize markdown content from initialData
  useEffect(() => {
    if (initialData?.content) {
      setMarkdownContent(initialData.content);
    }
  }, [initialData]);

  // Handle markdown editor change
  const handleEditorChange = ({ text }: { text: string }) => {
    setMarkdownContent(text);
    setValue('content', text, { shouldValidate: validationTriggered });
  };

  // Handle form submission
  const handleFormSubmit = async (data: ConceptFormData) => {
    // Parse topics as array
    const topicsArray = data.topics
      .split(',')
      .map((topic) => topic.trim())
      .filter((topic) => topic !== '');

    const formData = {
      ...data,
      topics: topicsArray,
    };

    if (initialData?.id) {
      await onSubmit({
        ...formData,
        id: initialData.id,
      });
    } else {
      await onSubmit(formData);
    }
  };

  const contentValue = watch('content');

  // Validate all fields on first submit attempt
  const handleFormValidation = async () => {
    setValidationTriggered(true);

    // Make sure content from editor is set in the form
    if (markdownContent && !contentValue) {
      setValue('content', markdownContent, { shouldValidate: true });
    }

    // Trigger validation on all fields
    const isValid = await trigger();
    return isValid;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {error && (
        <Alert variant="error" className="mb-6">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        <FormGroup>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            {...register('title')}
            placeholder="Enter concept title"
            aria-describedby={errors.title ? "title-error" : ""}
            className={errors.title ? "border-red-500" : ""}
          />
          {errors.title && <FormError id="title-error">{errors.title.message}</FormError>}
        </FormGroup>

        <FormGroup>
          <Label htmlFor="content">Content</Label>
          <div className={`border rounded-md ${errors.content ? "border-red-500" : ""}`}>
            <MarkdownEditor
              value={markdownContent}
              onChange={handleEditorChange}
              style={{ height: '300px' }}
              renderHTML={(text: string) => text}
              placeholder="Enter concept content using Markdown..."
            />
          </div>
          <input type="hidden" {...register('content')} />
          {errors.content && <FormError>{errors.content.message}</FormError>}
          <small className="text-gray-500 mt-1">
            Use Markdown formatting for text styling, lists, and code snippets.
          </small>
        </FormGroup>

        <FormGroup>
          <Label htmlFor="notes">Notes (Optional)</Label>
          <textarea
            id="notes"
            {...register('notes')}
            placeholder="Enter additional notes"
            className={`w-full h-24 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.notes ? "border-red-500" : ""}`}
          />
          {errors.notes && <FormError>{errors.notes.message}</FormError>}
        </FormGroup>

        <FormGroup>
          <Label htmlFor="topics">Topics (comma-separated)</Label>
          <Input
            id="topics"
            {...register('topics')}
            placeholder="e.g. machine learning, neural networks, python"
            aria-describedby={errors.topics ? "topics-error" : ""}
            className={errors.topics ? "border-red-500" : ""}
          />
          {errors.topics && <FormError id="topics-error">{errors.topics.message}</FormError>}
          <small className="text-gray-500 mt-1">
            Separate each topic with a comma (e.g., &quot;machine learning, neural networks&quot;)
          </small>
        </FormGroup>

        <FormGroup>
          <Label htmlFor="difficulty">Difficulty</Label>
          <select
            id="difficulty"
            {...register('difficulty')}
            className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.difficulty ? "border-red-500" : ""}`}
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
          {errors.difficulty && <FormError>{errors.difficulty.message}</FormError>}
        </FormGroup>

        <div className="flex justify-end space-x-4 pt-4">
          <Button
            type="button"
            onClick={onCancel}
            variant="outline"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="default"
            disabled={isSubmitting}
            onClick={async (e) => {
              const isValid = await handleFormValidation();
              if (!isValid) {
                e.preventDefault();
              }
            }}
          >
            {isSubmitting
              ? (initialData ? 'Updating...' : 'Creating...')
              : (initialData ? 'Update Concept' : 'Create Concept')}
          </Button>
        </div>
      </form>
    </div>
  );
}