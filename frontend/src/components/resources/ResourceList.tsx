import { useResources } from '@/lib/hooks/useResources'
import { ResourceType } from '@/types/resources'
import { Spinner } from '../ui/Spinner'
import { Alert } from '../ui/Alert'

const resourceTypeLabels: Record<ResourceType, string> = {
  articles: 'Articles',
  videos: 'Videos',
  courses: 'Courses',
  books: 'Books',
}

interface ResourceListProps {
  selectedType: ResourceType
  onTypeChange: (type: ResourceType) => void
}

export const ResourceList = ({
  selectedType,
  onTypeChange,
}: ResourceListProps) => {
  const { resources, statistics, isLoading, error } = useResources(selectedType)

  if (error) {
    return (
      <Alert variant="error">
        Failed to load resources: {error}
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Resource Type Selector */}
      <div className="flex space-x-4 border-b border-gray-200">
        {Object.entries(resourceTypeLabels).map(([type, label]) => (
          <button
            key={type}
            onClick={() => onTypeChange(type as ResourceType)}
            className={`px-4 py-2 -mb-px text-sm font-medium ${
              selectedType === type
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {label}
            {statistics && (
              <span className="ml-2 text-xs text-gray-500">
                ({statistics.by_type[type as ResourceType].total})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Resource List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Spinner />
          </div>
        ) : resources.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No {selectedType} found. Add some to get started!
          </div>
        ) : (
          resources.map((resource) => (
            <div
              key={resource.id}
              className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-blue-600"
                    >
                      {resource.title}
                    </a>
                  </h3>
                  <div className="mt-1 text-sm text-gray-500">
                    {resource.topics.map((topic: string) => (
                      <span
                        key={topic}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 mr-2"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    resource.completed
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {resource.completed ? 'Completed' : 'In Progress'}
                  </span>
                  <span className="text-sm text-gray-500">
                    {resource.estimated_time} min
                  </span>
                </div>
              </div>
              {resource.notes && (
                <p className="mt-2 text-sm text-gray-600">{resource.notes}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}