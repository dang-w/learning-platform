import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '../ui/buttons'
import { Input, FormGroup, Label, FormError } from '../ui/forms'
import { Alert } from '../ui/feedback'
import { Resource, ResourceCreateInput } from '@/types/resources'
import { useUrlMetadata } from '@/lib/hooks/useUrlMetadata'

const resourceSchema = z.object({
  url: z.string().url('Please enter a valid URL'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  resourceType: z.enum(['articles', 'videos', 'courses', 'books'] as const),
  estimated_time: z.number().min(1, 'Estimated time is required'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced'] as const),
  topics: z.array(z.string()).min(1, 'At least one topic is required'),
})

type ResourceFormData = z.infer<typeof resourceSchema>

interface ResourceFormProps {
  resource?: Resource
  onSubmit: (data: ResourceCreateInput) => Promise<void>
  onCancel: () => void
}

export const ResourceForm = ({
  resource,
  onSubmit: submitHandler,
  onCancel,
}: ResourceFormProps) => {
  const { isExtracting, error: extractionError, extractMetadata } = useUrlMetadata()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResourceFormData>({
    resolver: zodResolver(resourceSchema),
    defaultValues: resource ? {
      url: resource.url,
      title: resource.title,
      description: resource.notes || '',
      resourceType: 'articles',
      estimated_time: resource.estimated_time,
      difficulty: resource.difficulty,
      topics: resource.topics,
    } : undefined
  })

  const handleExtractMetadata = async () => {
    const url = watch('url')
    if (!url) return

    try {
      const metadata = await extractMetadata(url)
      if (!metadata) return

      // Auto-fill form fields with extracted metadata
      if (metadata.title) setValue('title', metadata.title)
      if (metadata.description) setValue('description', metadata.description)
      if (metadata.resource_type) setValue('resourceType', metadata.resource_type)
      if (metadata.estimated_time) setValue('estimated_time', metadata.estimated_time)
      if (metadata.difficulty) setValue('difficulty', metadata.difficulty)
      if (metadata.topics && metadata.topics.length > 0) setValue('topics', metadata.topics)
    } catch (err) {
      console.error('Metadata extraction error:', err)
    }
  }

  const onSubmitForm = async (data: ResourceFormData) => {
    try {
      const createInput: ResourceCreateInput = {
        url: data.url,
        title: data.title,
        estimated_time: data.estimated_time,
        difficulty: data.difficulty,
        topics: data.topics,
      }
      await submitHandler(createInput)
      onCancel()
    } catch (err) {
      console.error('Form submission error:', err)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-6">
      <FormGroup>
        <Label htmlFor="url">URL</Label>
        <div className="flex gap-2">
          <Input
            id="url"
            {...register('url')}
            type="url"
            placeholder="Enter resource URL"
            className="flex-1"
            data-testid="resource-url"
          />
          <Button
            type="button"
            onClick={handleExtractMetadata}
            disabled={isExtracting}
            variant="secondary"
            data-testid="extract-metadata"
          >
            {isExtracting ? 'Extracting...' : 'Extract Metadata'}
          </Button>
        </div>
        {errors.url && <FormError>{errors.url.message}</FormError>}
      </FormGroup>

      {extractionError && (
        <Alert variant="error">{extractionError}</Alert>
      )}

      <FormGroup>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          {...register('title')}
          placeholder="Resource title"
          data-testid="resource-title-input"
        />
        {errors.title && <FormError>{errors.title.message}</FormError>}
      </FormGroup>

      <FormGroup>
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          {...register('description')}
          placeholder="Resource description"
          className="w-full h-32 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          data-testid="resource-description"
        />
        {errors.description && <FormError>{errors.description.message}</FormError>}
      </FormGroup>

      <FormGroup>
        <Label htmlFor="resourceType">Resource Type</Label>
        <select
          id="resourceType"
          {...register('resourceType')}
          className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          data-testid="resource-type"
        >
          <option value="">Select Resource Type</option>
          <option value="articles" data-testid="resource-type-articles">Article</option>
          <option value="videos" data-testid="resource-type-videos">Video</option>
          <option value="courses" data-testid="resource-type-courses">Course</option>
          <option value="books" data-testid="resource-type-books">Book</option>
        </select>
        {errors.resourceType && <FormError>{errors.resourceType.message}</FormError>}
      </FormGroup>

      <FormGroup>
        <Label htmlFor="estimated_time">Estimated Time (minutes)</Label>
        <Input
          id="estimated_time"
          {...register('estimated_time', { valueAsNumber: true })}
          type="number"
          placeholder="Estimated completion time"
          data-testid="resource-estimated-time"
        />
        {errors.estimated_time && <FormError>{errors.estimated_time.message}</FormError>}
      </FormGroup>

      <FormGroup>
        <Label htmlFor="difficulty">Difficulty Level</Label>
        <select
          id="difficulty"
          {...register('difficulty')}
          className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          data-testid="resource-difficulty"
        >
          <option value="">Select Difficulty</option>
          <option value="beginner" data-testid="resource-difficulty-beginner">Beginner</option>
          <option value="intermediate" data-testid="resource-difficulty-intermediate">Intermediate</option>
          <option value="advanced" data-testid="resource-difficulty-advanced">Advanced</option>
        </select>
        {errors.difficulty && <FormError>{errors.difficulty.message}</FormError>}
      </FormGroup>

      <FormGroup>
        <Label htmlFor="topics">Topics</Label>
        <div className="flex flex-wrap gap-2 mb-2">
          {watch('topics')?.map((topic, index) => (
            <span
              key={index}
              className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center"
            >
              {topic}
              <button
                type="button"
                className="ml-1.5 text-blue-600 hover:text-blue-800"
                onClick={() => {
                  const currentTopics = watch('topics').filter((_, i) => i !== index);
                  setValue('topics', currentTopics, { shouldValidate: true });
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex">
          <Input
            id="topics-input"
            placeholder="Add a topic and press Enter"
            data-testid="resource-topics"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const target = e.target as HTMLInputElement;
                const value = target.value.trim();
                if (value) {
                  const currentTopics = watch('topics') || [];
                  if (!currentTopics.includes(value)) {
                    setValue('topics', [...currentTopics, value], { shouldValidate: true });
                  }
                  target.value = '';
                }
              }
            }}
          />
        </div>
        {errors.topics && <FormError>{errors.topics.message}</FormError>}
      </FormGroup>

      <div className="flex gap-4 justify-end">
        <Button
          type="button"
          onClick={onCancel}
          variant="outline"
          data-testid="cancel-button"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          data-testid="submit-button"
        >
          {isSubmitting ? 'Saving...' : resource ? 'Update Resource' : 'Create Resource'}
        </Button>
      </div>
    </form>
  )
}