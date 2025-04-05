'use client';

import React from 'react';
import { Resource, ResourceTypeString } from '@/types/resource';
import { CheckCircleIcon, PencilIcon, TagIcon, ArrowPathIcon, TrashIcon } from '@heroicons/react/24/outline'; // Example icons

interface ResourceCardProps {
  resource: Resource;
  onToggleComplete: (resourceId: string, currentStatus: boolean, type: Resource['type']) => void;
  isLoading?: boolean; // Add optional isLoading prop
  onEditNote: (resource: Resource) => void; // Add onEditNote prop
  // TODO: Add handler for notes
  onDelete?: (resourceId: string, resourceType: ResourceTypeString) => Promise<void>;
  onEdit?: (resource: Resource) => void;
}

export const ResourceCard: React.FC<ResourceCardProps> = ({
  resource,
  onToggleComplete,
  isLoading = false, // Default to false
  onEditNote,
  onDelete,
  onEdit,
}) => {
  const bgColor = resource.completed ? 'bg-green-50' : 'bg-white';
  const borderColor = resource.completed ? 'border-green-300' : 'border-gray-200';

  return (
    <div
      data-testid="resource-card"
      className={`border ${borderColor} ${bgColor} rounded-lg shadow-sm p-4 mb-4`}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 data-testid="resource-title" className="text-lg font-semibold text-gray-800">
          <a href={resource.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 hover:underline">
            {resource.title}
          </a>
        </h3>
        <span className="text-xs uppercase font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded">
          {resource.type}
        </span>
      </div>

      {resource.description && (
        <p className="text-sm text-gray-600 mb-3">{resource.description}</p>
      )}

      <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
        {resource.difficulty && <span>Difficulty: {resource.difficulty}</span>}
        {resource.estimated_time && <span>Est. Time: {resource.estimated_time} min</span>}
      </div>

      {resource.topics && resource.topics.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {resource.topics.map((topic) => (
            <span
              key={topic}
              className="flex items-center text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full"
              data-topic={topic}
            >
              <TagIcon className="h-3 w-3 mr-1" />
              {topic}
            </span>
          ))}
        </div>
      )}

      <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <button
            data-testid="mark-complete-button"
            onClick={() => onToggleComplete(resource.id, !!resource.completed, resource.type)}
            className="flex items-center text-sm text-gray-500 hover:text-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading} // Disable button if loading
          >
            {isLoading ? (
              <ArrowPathIcon className="h-5 w-5 mr-1 animate-spin" />
            ) : (
              <CheckCircleIcon className={`h-5 w-5 mr-1 ${resource.completed ? 'text-green-500' : 'text-gray-400'}`} />
            )}
            {resource.completed ?
              <span data-testid="completed-badge">Completed</span> :
              <span>Mark Complete</span>
            }
          </button>
          <button
            data-testid="add-edit-note-button"
            onClick={() => onEditNote(resource)} // Call onEditNote with the resource
            className="flex items-center text-sm text-gray-500 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading} // Disable button if loading
          >
            {isLoading ? (
              <ArrowPathIcon className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <PencilIcon className="h-4 w-4 mr-1" />
            )}
            {resource.notes ? 'Edit Note' : 'Add Note'}
          </button>

          {onEdit && (
            <button
              data-testid="edit-resource-button"
              onClick={() => onEdit(resource)}
              className="flex items-center text-sm text-gray-500 hover:text-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? (
                <ArrowPathIcon className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <PencilIcon className="h-4 w-4 mr-1" />
              )}
              Edit
            </button>
          )}

          {onDelete && (
            <button
              data-testid="delete-resource-button"
              onClick={() => onDelete(resource.id, resource.type)}
              className="flex items-center text-sm text-gray-500 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? (
                <ArrowPathIcon className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <TrashIcon className="h-4 w-4 mr-1" />
              )}
              Delete
            </button>
          )}
        </div>
        {resource.completion_date && (
          <span className="text-xs text-gray-400">Completed on: {new Date(resource.completion_date).toLocaleDateString()}</span>
        )}
      </div>
    </div>
  );
};