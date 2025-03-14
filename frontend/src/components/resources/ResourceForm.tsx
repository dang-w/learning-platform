import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '../ui/buttons'
import { Input, FormGroup, Label, FormError } from '../ui/forms'
import { Alert } from '../ui/feedback'
import { Resource, ResourceCreateInput } from '@/types/resources'

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
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractionError, setExtractionError] = useState<string | null>(null)

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

  const extractMetadata = async () => {
    const url = watch('url')
    if (!url) return

    setIsExtracting(true)
    setExtractionError(null)

    try {
      const response = await fetch('/api/url/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) {
        throw new Error('Failed to extract metadata')
      }

      const metadata = await response.json()

      // Auto-fill form fields with extracted metadata
      setValue('title', metadata.title)
      setValue('description', metadata.description)
      setValue('resourceType', metadata.resource_type)
      setValue('estimated_time', metadata.estimated_time)
      setValue('difficulty', metadata.difficulty)
      setValue('topics', metadata.topics)
    } catch (err) {
      setExtractionError('Failed to extract metadata from URL')
      console.error('Metadata extraction error:', err)
    } finally {
      setIsExtracting(false)
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
          />
          <Button
            type="button"
            onClick={extractMetadata}
            disabled={isExtracting}
            variant="secondary"
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
        />
        {errors.description && <FormError>{errors.description.message}</FormError>}
      </FormGroup>

      <FormGroup>
        <Label htmlFor="resourceType">Resource Type</Label>
        <select
          id="resourceType"
          {...register('resourceType')}
          className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select Resource Type</option>
          <option value="articles">Article</option>
          <option value="videos">Video</option>
          <option value="courses">Course</option>
          <option value="books">Book</option>
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
        />
        {errors.estimated_time && <FormError>{errors.estimated_time.message}</FormError>}
      </FormGroup>

      <FormGroup>
        <Label htmlFor="difficulty">Difficulty Level</Label>
        <select
          id="difficulty"
          {...register('difficulty')}
          className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select Difficulty</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
        {errors.difficulty && <FormError>{errors.difficulty.message}</FormError>}
      </FormGroup>

      <div className="flex gap-4 justify-end">
        <Button
          type="button"
          onClick={onCancel}
          variant="outline"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : resource ? 'Update Resource' : 'Create Resource'}
        </Button>
      </div>
    </form>
  )
}