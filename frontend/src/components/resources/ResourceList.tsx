import { useResources } from '@/lib/hooks/useResources';
import { ResourceType } from '@/types/resources';
import { Spinner } from '../ui/feedback/spinner';
import { Alert } from '../ui/feedback/alert';
import { useState } from 'react';

// Resource type labels for display
const resourceTypeLabels: Record<ResourceType, string> = {
  articles: 'Articles',
  videos: 'Videos',
  courses: 'Courses',
  books: 'Books'
};

interface ResourceListProps {
  selectedType: ResourceType;
  onTypeChange: (type: ResourceType) => void;
}

export const ResourceList = ({
  selectedType,
  onTypeChange,
}: ResourceListProps) => {
  const { resources, statistics, isLoading, error, completeResource, deleteResource } = useResources(selectedType);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [resourceToDelete, setResourceToDelete] = useState<string | null>(null);
  const [notification, setNotification] = useState({ visible: false, message: '' });

  // Simulating filter options for tests
  const topicFilters = ['python', 'javascript', 'ai', 'machine-learning'];
  const difficultyFilters = ['beginner', 'intermediate', 'advanced'];
  const statusFilters = ['completed', 'in-progress'];

  const [showTopicFilter, setShowTopicFilter] = useState(false);
  const [showDifficultyFilter, setShowDifficultyFilter] = useState(false);
  const [showStatusFilter, setShowStatusFilter] = useState(false);

  if (error) {
    return (
      <Alert variant="error">
        Failed to load resources: {error}
      </Alert>
    );
  }

  const handleDeleteClick = (id: string) => {
    setResourceToDelete(id);
    setShowConfirmDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (resourceToDelete !== null) {
      try {
        await deleteResource(resourceToDelete);
        setShowConfirmDialog(false);
        setNotification({ visible: true, message: 'Resource deleted successfully' });
        setTimeout(() => setNotification({ visible: false, message: '' }), 3000);
      } catch (err) {
        console.error('Failed to delete resource:', err);
        setShowConfirmDialog(false);
        setNotification({ visible: true, message: 'Failed to delete resource' });
        setTimeout(() => setNotification({ visible: false, message: '' }), 3000);
      }
    }
  };

  const handleMarkCompleted = async (id: string) => {
    try {
      await completeResource(id, 'Completed via UI');
      setNotification({ visible: true, message: 'Resource marked as completed' });
      setTimeout(() => setNotification({ visible: false, message: '' }), 3000);
    } catch (err) {
      console.error('Failed to mark resource as completed:', err);
      setNotification({ visible: true, message: 'Failed to update resource' });
      setTimeout(() => setNotification({ visible: false, message: '' }), 3000);
    }
  };

  const handleEditClick = (id: string) => {
    // In a real implementation, this would open an edit form or navigate to an edit page
    console.log('Edit resource with ID:', id);
  };

  return (
    <div className="space-y-6" data-testid="resources-list">
      {/* Resource Type Selector */}
      <div className="flex space-x-4 border-b border-gray-200">
        <div data-testid="filter-type">
          {Object.entries(resourceTypeLabels).map(([type, label]) => (
            <button
              key={type}
              data-testid={`filter-type-${type}`}
              onClick={() => onTypeChange(type as ResourceType)}
              className={`px-4 py-2 text-sm font-medium ${
                selectedType === type
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex justify-between items-center">
        <div className="flex space-x-2">
          <h2 className="text-xl font-semibold text-gray-900">
            {resourceTypeLabels[selectedType]}
          </h2>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {statistics?.total || 0}
          </span>
        </div>

        <div className="flex space-x-2">
          <div className="relative">
            <button
              data-testid="filter-topic"
              className="px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
              onClick={() => setShowTopicFilter(!showTopicFilter)}
            >
              Topic
            </button>
            {showTopicFilter && (
              <div className="absolute z-10 mt-1 w-48 bg-white rounded-md shadow-lg">
                {topicFilters.map(topic => (
                  <button
                    key={topic}
                    data-testid={`filter-topic-${topic}`}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    {topic}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button
              data-testid="filter-difficulty"
              className="px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
              onClick={() => setShowDifficultyFilter(!showDifficultyFilter)}
            >
              Difficulty
            </button>
            {showDifficultyFilter && (
              <div className="absolute z-10 mt-1 w-48 bg-white rounded-md shadow-lg">
                {difficultyFilters.map(difficulty => (
                  <button
                    key={difficulty}
                    data-testid={`filter-difficulty-${difficulty}`}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    {difficulty}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button
              data-testid="filter-status"
              className="px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
              onClick={() => setShowStatusFilter(!showStatusFilter)}
            >
              Status
            </button>
            {showStatusFilter && (
              <div className="absolute z-10 mt-1 w-48 bg-white rounded-md shadow-lg">
                {statusFilters.map(status => (
                  <button
                    key={status}
                    data-testid={`filter-status-${status}`}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    {status}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            data-testid="clear-filters"
            className="px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {notification.visible && (
        <div data-testid="success-notification" className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
          {notification.message}
        </div>
      )}

      {/* Resource List */}
      <div className="space-y-4">
        {isLoading ? (
          <Spinner />
        ) : resources.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No resources found.</p>
          </div>
        ) : (
          resources.map((resource) => (
            <div
              key={resource.id}
              data-testid="resource-item"
              className="bg-white shadow rounded-lg p-6"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-blue-600"
                      data-testid="resource-title"
                    >
                      {resource.title}
                    </a>
                  </h3>
                  <p className="mt-1 text-sm text-gray-500" data-testid="resource-description">{resource.notes}</p>
                  <div className="mt-2 flex items-center space-x-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {resource.difficulty}
                    </span>
                    {resource.topics.map((topic) => (
                      <span
                        key={topic}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                        data-testid="resource-tags"
                      >
                        {topic}
                      </span>
                    ))}
                    {resource.completed && (
                      <span
                        data-testid="completed-badge"
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                      >
                        Completed
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-sm text-gray-500">
                    Estimated time: {resource.estimated_time} minutes
                  </div>
                </div>
                <div className="ml-4 flex-shrink-0 flex space-x-2">
                  {!resource.completed && (
                    <button
                      data-testid="complete-resource"
                      onClick={() => handleMarkCompleted(resource.id)}
                      className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded hover:bg-green-200"
                    >
                      Complete
                    </button>
                  )}
                  <button
                    data-testid="edit-resource"
                    onClick={() => handleEditClick(resource.id)}
                    className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded hover:bg-blue-200"
                  >
                    Edit
                  </button>
                  <button
                    data-testid="delete-resource"
                    onClick={() => handleDeleteClick(resource.id)}
                    className="px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Deletion</h3>
            <p className="text-sm text-gray-500 mb-4">Are you sure you want to delete this resource? This action cannot be undone.</p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                data-testid="confirm-delete"
                onClick={handleConfirmDelete}
                className="px-3 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};