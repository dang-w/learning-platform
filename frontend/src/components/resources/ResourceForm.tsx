import { useState, useEffect } from 'react'
import { ResourceCreate, Resource } from '@/lib/api/resources'

interface ResourceFormProps {
  resource?: Resource
  onSubmit: (data: ResourceCreate) => Promise<void>
  onCancel: () => void
}

export const ResourceForm = ({
  resource,
  onSubmit,
  onCancel,
}: ResourceFormProps) => {
  const [formData, setFormData] = useState<ResourceCreate>({
    title: '',
    url: '',
    topics: [],
    difficulty: 'beginner',
    estimated_time: 30,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [topicInput, setTopicInput] = useState('')

  useEffect(() => {
    if (resource) {
      setFormData({
        title: resource.title,
        url: resource.url,
        topics: resource.topics,
        difficulty: resource.difficulty,
        estimated_time: resource.estimated_time,
      })
    }
  }, [resource])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      await onSubmit(formData)
      onCancel()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddTopic = () => {
    if (topicInput.trim() && !formData.topics.includes(topicInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        topics: [...prev.topics, topicInput.trim()],
      }))
      setTopicInput('')
    }
  }

  const handleRemoveTopic = (topic: string) => {
    setFormData((prev) => ({
      ...prev,
      topics: prev.topics.filter((t) => t !== topic),
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 text-sm text-red-800 bg-red-50 rounded-lg">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700"
          >
            Title
          </label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, title: e.target.value }))
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label htmlFor="url" className="block text-sm font-medium text-gray-700">
            URL
          </label>
          <input
            type="url"
            id="url"
            value={formData.url}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, url: e.target.value }))
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Topics</label>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="text"
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTopic())}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Add a topic"
            />
            <button
              type="button"
              onClick={handleAddTopic}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Add
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {formData.topics.map((topic) => (
              <span
                key={topic}
                className="inline-flex items-center px-2 py-1 rounded-full text-sm bg-gray-100"
              >
                {topic}
                <button
                  type="button"
                  onClick={() => handleRemoveTopic(topic)}
                  className="ml-1 text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        <div>
          <label
            htmlFor="difficulty"
            className="block text-sm font-medium text-gray-700"
          >
            Difficulty
          </label>
          <select
            id="difficulty"
            value={formData.difficulty}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                difficulty: e.target.value as ResourceCreate['difficulty'],
              }))
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="estimated_time"
            className="block text-sm font-medium text-gray-700"
          >
            Estimated Time (minutes)
          </label>
          <input
            type="number"
            id="estimated_time"
            value={formData.estimated_time}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                estimated_time: parseInt(e.target.value) || 0,
              }))
            }
            min="1"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : resource ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  )
}