'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FilterSidebar } from '@/components/library/filter-sidebar';
import { ResourceCard } from '@/components/library/resource-card';
import { Resource, Filters, ResourceStatusUpdate, ResourceCreateInput, ResourceTypeString, DifficultyLevel } from '@/types/resource';
import { XMarkIcon, FunnelIcon, PlusIcon } from '@heroicons/react/24/outline';
import { ResourceForm } from '@/components/resources/ResourceForm';
import { Notification } from '@/components/ui/notifications/Notification';

// Simple type for expected validation error detail
interface ValidationErrorDetail {
    loc: (string | number)[];
    msg: string;
    type: string;
    input?: unknown;
}

type LibraryView = 'central' | 'user';

const PAGE_LIMIT = 10;
const DEBOUNCE_DELAY = 500;

const LibraryPage = () => {
  const [activeView, setActiveView] = useState<LibraryView>('central');
  const [searchTerm, setSearchTerm] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [resourceUpdateStatus, setResourceUpdateStatus] = useState<{ [key: string]: boolean }>({});
  const [availableTopics, setAvailableTopics] = useState<string[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<Filters>({
    topics: [],
    types: [],
    difficulty: [],
  });
  const [editingNoteResource, setEditingNoteResource] = useState<Resource | null>(null);
  const [currentNote, setCurrentNote] = useState<string>('');
  const [isNoteModalOpen, setIsNoteModalOpen] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const response = await fetch('/api/resources/topics');
        if (!response.ok) {
          throw new Error('Failed to fetch topics');
        }
        const topics: string[] = await response.json();
        setAvailableTopics(topics);
      } catch (err) {
        console.error('Error fetching topics:', err);
      }
    };
    fetchTopics();
  }, []);

  useEffect(() => {
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }
    const timeoutId = setTimeout(() => {
      setSearchTerm(inputValue);
      setCurrentPage(1);
    }, DEBOUNCE_DELAY);
    setDebounceTimeout(timeoutId);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [inputValue]);

  const fetchResources = useCallback(async () => {
    setResources([]);
    setError(null);
    setIsLoading(true);

    const endpoint = activeView === 'central' ? '/api/resources/library' : '/api/resources/user';
    const params = new URLSearchParams();
    if (searchTerm) params.append('search', searchTerm);

    // Correctly append multiple query parameters for each filter type
    selectedFilters.topics.forEach(topic => params.append('topic', topic));
    selectedFilters.types.forEach(type => params.append('type', type));
    selectedFilters.difficulty.forEach(diff => params.append('difficulty', diff));

    params.append('page', currentPage.toString());
    params.append('limit', PAGE_LIMIT.toString());

    const url = `${endpoint}?${params.toString()}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        let errorDetails = response.statusText;
        try {
          const errorData = await response.json();
          errorDetails = errorData.detail || errorDetails;
        } catch { }
        throw new Error(`Failed to fetch resources: ${errorDetails}`);
      }
      const totalPagesHeader = response.headers.get('X-Total-Pages');
      setTotalPages(totalPagesHeader ? parseInt(totalPagesHeader, 10) : 1);
      const data: Resource[] = await response.json();
      setResources(data);
    } catch (err) {
      console.error('Error fetching resources:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [activeView, searchTerm, selectedFilters, currentPage]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const handleInputChange = (term: string) => {
    setInputValue(term);
  };

  const handleFilterChange = (newFilters: Partial<Filters>) => {
    setSelectedFilters(prevFilters => ({
      ...prevFilters,
      ...newFilters
    }));
    setCurrentPage(1);
  };

  const handleViewChange = (view: LibraryView) => {
    setActiveView(view);
    setSearchTerm('');
    setInputValue('');
    setSelectedFilters({ topics: [], types: [], difficulty: [] });
    setCurrentPage(1);
    setTotalPages(1);
    setError(null);
    setActionError(null);
    setSuccessMessage(null);
  };

  const handleToggleComplete = async (
    resourceId: string,
    currentStatus: boolean,
    resourceType: Resource['type']
  ) => {
    setActionError(null);
    setSuccessMessage(null);
    setResourceUpdateStatus(prev => ({ ...prev, [resourceId]: true }));

    const isUserResource = activeView === 'user';
    const newCompletedStatus = !currentStatus;
    let endpoint = '';
    let body: Partial<ResourceStatusUpdate>;

    if (isUserResource) {
      endpoint = `/api/resources/${resourceType.toLowerCase()}/${resourceId}/complete`;
      body = {};
    } else {
      endpoint = `/api/resources/library/${resourceId}/status`;
      const currentResource = resources.find(r => r.id === resourceId);
      body = {
        completed: newCompletedStatus,
        notes: currentResource?.notes || undefined
      };
    }

    try {
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        ...(Object.keys(body).length > 0 && { body: JSON.stringify(body) }),
      });
      if (!response.ok) {
        let errorDetails = response.statusText;
        try { const errorData = await response.json(); errorDetails = errorData.detail || errorDetails; } catch { }
        throw new Error(`Failed to update resource status: ${errorDetails}`);
      }
      setResources(prevResources =>
        prevResources.map(res =>
          res.id === resourceId
            ? { ...res, completed: newCompletedStatus, completion_date: newCompletedStatus ? new Date().toISOString() : null }
            : res
        )
      );
      setSuccessMessage('Resource status updated.');
    } catch (err) {
      console.error('Error updating resource status:', err);
      setActionError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setResourceUpdateStatus(prev => ({ ...prev, [resourceId]: false }));
    }
  };

  const openNoteEditor = (resource: Resource) => {
    setEditingNoteResource(resource);
    setCurrentNote(resource.notes || '');
    setIsNoteModalOpen(true);
    setActionError(null);
    setSuccessMessage(null);
  };

  const closeNoteEditor = () => {
    setIsNoteModalOpen(false);
    setEditingNoteResource(null);
    setCurrentNote('');
  };

  const handleNoteChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentNote(event.target.value);
  };

  const saveNote = async () => {
    if (!editingNoteResource) return;
    setActionError(null);
    setSuccessMessage(null);
    setResourceUpdateStatus(prev => ({ ...prev, [editingNoteResource.id]: true }));

    const resourceId = editingNoteResource.id;
    const isUserResource = activeView === 'user';
    const resourceType = editingNoteResource.type;
    let endpoint = '';
    let method = 'PATCH';
    let body: Partial<ResourceStatusUpdate> | Resource;

    if (isUserResource) {
      endpoint = `/api/resources/${resourceType.toLowerCase()}/${resourceId}`;
      method = 'PUT';
      body = { ...editingNoteResource, notes: currentNote };
    } else {
      endpoint = `/api/resources/library/${resourceId}/status`;
      method = 'PATCH';
      body = {
        completed: !!editingNoteResource.completed,
        notes: currentNote
      };
    }

    try {
      const response = await fetch(endpoint, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        let errorDetails = response.statusText;
        try { const errorData = await response.json(); errorDetails = errorData.detail || errorDetails; } catch { }
        throw new Error(`Failed to save note: ${errorDetails}`);
      }
      setResources(prevResources =>
        prevResources.map(res =>
          res.id === resourceId ? { ...res, notes: currentNote } : res
        )
      );
      setSuccessMessage('Note saved successfully.');
      closeNoteEditor();
    } catch (err) {
      console.error('Error saving note:', err);
      setActionError(err instanceof Error ? err.message : 'Failed to save note');
    } finally {
      setResourceUpdateStatus(prev => ({ ...prev, [editingNoteResource.id]: false }));
    }
  };

  const handleCreateUserResource = async (formData: {
    url: string;
    title: string;
    description?: string | undefined;
    type: ResourceTypeString;
    estimated_time: number;
    difficulty: DifficultyLevel;
    topics: string[];
  }) => {
    if (activeView !== 'user') return;
    setActionError(null);
    setSuccessMessage(null);

    const resourceToCreate: ResourceCreateInput = {
      title: formData.title,
      url: formData.url,
      type: formData.type,
      topics: formData.topics,
      difficulty: formData.difficulty,
      estimated_time: formData.estimated_time,
      summary: formData.description,
    };

    const resourceType = resourceToCreate.type;
    const endpoint = `/api/resources/${resourceType.toLowerCase()}`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resourceToCreate),
      });
      if (!response.ok) {
        let errorDetails = response.statusText;
        try {
          const errorData = await response.json();
          if (Array.isArray(errorData.detail)) {
            errorDetails = errorData.detail.map((e: ValidationErrorDetail) => `${e.loc.join('.')}: ${e.msg}`).join(', ');
          } else {
            errorDetails = errorData.detail || errorDetails;
          }
        } catch { }
        throw new Error(`Failed to add resource: ${errorDetails}`);
      }
      setSuccessMessage('Resource added successfully!');
      setIsAddModalOpen(false);
      fetchResources();
    } catch (err) {
      console.error('Error creating resource:', err);
      setActionError(err instanceof Error ? err.message : 'Failed to add resource');
    } finally {
    }
  };

  // Placeholder for deleting a user resource
  const handleDeleteUserResource = async (resourceId: string, resourceType: ResourceTypeString) => {
    if (activeView !== 'user') return;
    setActionError(null);
    setSuccessMessage(null);
    setResourceUpdateStatus(prev => ({ ...prev, [resourceId]: true }));

    const endpoint = `/api/resources/${resourceType.toLowerCase()}/${resourceId}`;
    console.log(`Attempting to delete resource: ${endpoint}`);

    try {
      const response = await fetch(endpoint, { method: 'DELETE' });
      if (!response.ok) {
        let errorDetails = response.statusText;
        try { const errorData = await response.json(); errorDetails = errorData.detail || errorDetails; } catch { }
        throw new Error(`Failed to delete resource: ${errorDetails}`);
      }
      // Remove resource from state
      setResources(prev => prev.filter(r => r.id !== resourceId));
      setSuccessMessage('Resource deleted successfully.');
      // Optionally refetch or adjust pagination/totals if needed
    } catch (err) {
      console.error('Error deleting resource:', err);
      setActionError(err instanceof Error ? err.message : 'Failed to delete resource');
    } finally {
      setResourceUpdateStatus(prev => ({ ...prev, [resourceId]: false }));
    }
  };

  // Placeholder for initiating the edit process for a user resource
  const handleEditUserResource = (resource: Resource) => {
    if (activeView !== 'user') return;
    console.log('Editing resource:', resource);
    setEditingResource(resource);
    setIsEditModalOpen(true);
    setActionError(null);
    setSuccessMessage(null);
  };

  // Handler for submitting the updated resource data
  const handleUpdateUserResource = async (formData: {
    url: string;
    title: string;
    description?: string | undefined;
    type: ResourceTypeString;
    estimated_time: number;
    difficulty: DifficultyLevel;
    topics: string[];
  }) => {
    if (!editingResource || activeView !== 'user') return;
    setActionError(null);
    setSuccessMessage(null);
    setResourceUpdateStatus(prev => ({ ...prev, [editingResource.id]: true }));

    const resourceToUpdate: Resource = {
      ...editingResource,
      title: formData.title,
      url: formData.url,
      type: formData.type,
      topics: formData.topics,
      difficulty: formData.difficulty,
      estimated_time: formData.estimated_time,
      notes: formData.description || editingResource.notes,
      description: formData.description,
    };

    const endpoint = `/api/resources/${resourceToUpdate.type.toLowerCase()}/${resourceToUpdate.id}`;

    try {
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resourceToUpdate),
      });
      if (!response.ok) {
        let errorDetails = response.statusText;
        try { const errorData = await response.json(); errorDetails = errorData.detail || errorDetails; } catch { }
        throw new Error(`Failed to update resource: ${errorDetails}`);
      }
      setResources(prev => prev.map(r => r.id === editingResource.id ? resourceToUpdate : r));
      setSuccessMessage('Resource updated successfully.');
      setIsEditModalOpen(false);
      setEditingResource(null);
    } catch (err) {
      console.error('Error updating resource:', err);
      setActionError(err instanceof Error ? err.message : 'Failed to update resource');
    } finally {
      setResourceUpdateStatus(prev => ({ ...prev, [editingResource.id]: false }));
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <button
        data-testid="sidebar-toggle"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="md:hidden fixed top-4 left-4 z-20 p-2 bg-white rounded-md shadow-md"
      >
        <FunnelIcon className="h-6 w-6 text-gray-600" />
      </button>

      <FilterSidebar
        availableTopics={availableTopics}
        selectedFilters={selectedFilters}
        onFilterChange={handleFilterChange}
        searchTerm={inputValue}
        onSearchChange={handleInputChange}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="flex-1 p-6 overflow-y-auto relative">
        <Notification
          isOpen={!!actionError || !!successMessage}
          type={actionError ? 'error' : 'success'}
          message={actionError || successMessage || ''}
          onClose={() => {
            setActionError(null);
            setSuccessMessage(null);
          }}
        />

        <h1 className="text-2xl font-semibold text-gray-800 mb-6">Resource Library</h1>

        <div className="mb-6">
          <button
            data-testid="central-library-tab"
            onClick={() => handleViewChange('central')}
            className={`px-4 py-2 mr-2 rounded-md ${activeView === 'central' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
          >
            Central Library
          </button>
          <button
            data-testid="user-resources-tab"
            onClick={() => handleViewChange('user')}
            className={`px-4 py-2 rounded-md ${activeView === 'user' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
          >
            My Resources
          </button>
        </div>

        {activeView === 'user' && (
          <div className="mb-4 text-right">
            <button
              data-testid="library-add-resource-button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
              Add Resource
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white rounded-lg shadow p-4 mb-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full mb-3"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-3"></div>
                <div className="flex flex-wrap gap-1 mb-3">
                  <div className="h-4 bg-gray-200 rounded-full w-16"></div>
                  <div className="h-4 bg-gray-200 rounded-full w-20"></div>
                </div>
                <div className="h-5 bg-gray-200 rounded w-1/4 mt-3 pt-3 border-t"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div data-testid="fetch-error-message" className="text-center text-red-600 bg-red-100 p-4 rounded-md">{error}</div>
        ) : resources.length > 0 ? (
          <div className="space-y-4">
            {resources.map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                onToggleComplete={handleToggleComplete}
                onEditNote={openNoteEditor}
                isLoading={resourceUpdateStatus[resource.id] ?? false}
                onDelete={activeView === 'user' ? handleDeleteUserResource : undefined}
                onEdit={activeView === 'user' ? handleEditUserResource : undefined}
              />
            ))}
          </div>
        ) : (
          <div data-testid="empty-state-message" className="text-center text-gray-500">
            No resources found for the current view/filters.
          </div>
        )}

        {!isLoading && !error && resources.length > 0 && totalPages > 1 && (
          <div data-testid="pagination-controls" className="flex justify-center items-center space-x-2 mt-6">
            <button
              data-testid="pagination-previous-button"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              data-testid="pagination-next-button"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </main>

      {isNoteModalOpen && editingNoteResource && (
        <div data-testid="note-dialog" className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 data-testid="note-dialog-title" className="text-xl font-semibold text-gray-900">Edit Note for: {editingNoteResource.title}</h2>
              <button onClick={closeNoteEditor} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <textarea
              data-testid="note-textarea"
              value={currentNote}
              onChange={handleNoteChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm mb-4"
              placeholder="Enter your notes here..."
            />
            <div className="flex justify-end space-x-2">
              <button
                data-testid="cancel-note-button"
                onClick={closeNoteEditor}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                data-testid="save-note-button"
                onClick={saveNote}
                disabled={resourceUpdateStatus[editingNoteResource.id] ?? false}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-wait"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddModalOpen && (
        <div data-testid="add-resource-modal" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Add New Resource to My Collection
              </h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <ResourceForm
              onSubmit={handleCreateUserResource}
              onCancel={() => setIsAddModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Edit Resource Modal */}
      {isEditModalOpen && editingResource && (
        <div data-testid="edit-resource-modal" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Edit Resource: {editingResource.title}
              </h2>
              <button onClick={() => { setIsEditModalOpen(false); setEditingResource(null); }} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <ResourceForm
              resource={editingResource}
              onSubmit={handleUpdateUserResource}
              onCancel={() => { setIsEditModalOpen(false); setEditingResource(null); }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default LibraryPage;
