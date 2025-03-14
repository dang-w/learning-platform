import { act, renderHook } from '@testing-library/react';
import { useResourceStore } from '@/lib/store/resource-store';
import resourcesApi from '@/lib/api/resources';
import { Resource, ResourceType, ResourceCreateInput, ResourceUpdateInput } from '@/types/resources';

// Mock the resources API
jest.mock('@/lib/api/resources', () => ({
  getAllResources: jest.fn(),
  getResourcesByType: jest.fn(),
  createResource: jest.fn(),
  updateResource: jest.fn(),
  deleteResource: jest.fn(),
  completeResource: jest.fn(),
  getResourceStatistics: jest.fn(),
}));

describe('Resource Store', () => {
  // Sample resource data for testing
  const mockResources: Resource[] = [
    {
      id: '1',
      title: 'Learn React',
      url: 'https://reactjs.org',
      topics: ['react', 'javascript'],
      difficulty: 'intermediate',
      estimated_time: 120,
      completed: false,
      date_added: '2023-01-01T00:00:00Z',
      completion_date: null,
      notes: '',
    },
    {
      id: '2',
      title: 'TypeScript Tutorial',
      url: 'https://www.typescriptlang.org',
      topics: ['typescript', 'javascript'],
      difficulty: 'beginner',
      estimated_time: 60,
      completed: true,
      date_added: '2023-01-02T00:00:00Z',
      completion_date: '2023-01-03T00:00:00Z',
      notes: 'Great tutorial!',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchResources', () => {
    it('should fetch all resources and update state', async () => {
      // Mock API response
      (resourcesApi.getAllResources as jest.Mock).mockResolvedValue(mockResources);

      // Render the hook
      const { result } = renderHook(() => useResourceStore());

      // Initial state
      expect(result.current.resources).toEqual([]);
      expect(result.current.isLoading).toBe(false);

      // Fetch resources
      await act(async () => {
        await result.current.fetchResources();
      });

      // Check updated state
      expect(result.current.resources).toEqual(mockResources);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();

      // Verify API call
      expect(resourcesApi.getAllResources).toHaveBeenCalled();
    });

    it('should handle fetch error', async () => {
      // Mock API error
      const mockError = new Error('Failed to fetch resources');
      (resourcesApi.getAllResources as jest.Mock).mockRejectedValue(mockError);

      // Render the hook
      const { result } = renderHook(() => useResourceStore());

      // Set initial resources to empty array
      act(() => {
        result.current.resources = [];
      });

      // Fetch resources with error
      await act(async () => {
        await result.current.fetchResources();
      });

      // Check error state
      expect(result.current.resources).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Failed to fetch resources');
    });
  });

  describe('fetchResourcesByType', () => {
    it('should fetch resources by type and update state', async () => {
      // Filter for articles only
      const articleResources = mockResources.filter(r => r.topics.includes('react'));

      // Mock API response
      (resourcesApi.getResourcesByType as jest.Mock).mockResolvedValue(articleResources);

      // Render the hook
      const { result } = renderHook(() => useResourceStore());

      // Fetch resources by type
      await act(async () => {
        await result.current.fetchResourcesByType('articles' as ResourceType);
      });

      // Check updated state
      expect(result.current.resources).toEqual(articleResources);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();

      // Verify API call
      expect(resourcesApi.getResourcesByType).toHaveBeenCalledWith('articles');
    });
  });

  describe('addResource', () => {
    it('should add a new resource and update state', async () => {
      // New resource to add
      const newResource: ResourceCreateInput = {
        title: 'New Resource',
        url: 'https://example.com',
        difficulty: 'beginner',
        topics: ['test'],
        estimated_time: 30,
      };

      // Mock API response with ID and timestamps added
      const createdResource: Resource = {
        ...newResource,
        id: '3',
        completed: false,
        date_added: '2023-01-03T00:00:00Z',
        completion_date: null,
        notes: '',
      };

      (resourcesApi.createResource as jest.Mock).mockResolvedValue(createdResource);

      // Render the hook with initial state
      const { result } = renderHook(() => useResourceStore());

      // Set initial resources
      act(() => {
        result.current.resources = [...mockResources];
      });

      // Add new resource
      await act(async () => {
        await result.current.addResource('articles' as ResourceType, newResource);
      });

      // Check updated state
      expect(result.current.resources).toEqual([...mockResources, createdResource]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();

      // Verify API call
      expect(resourcesApi.createResource).toHaveBeenCalledWith('articles', newResource);
    });
  });

  describe('updateResource', () => {
    it('should update an existing resource and update state', async () => {
      // Update data
      const updateData: ResourceUpdateInput = {
        title: 'Updated React Guide',
        estimated_time: 150,
      };

      // Mock API response
      const updatedResource: Resource = {
        ...mockResources[0],
        ...updateData,
      };

      (resourcesApi.updateResource as jest.Mock).mockResolvedValue(updatedResource);

      // Render the hook with initial state
      const { result } = renderHook(() => useResourceStore());

      // Set initial resources
      act(() => {
        result.current.resources = [...mockResources];
      });

      // Update resource
      await act(async () => {
        await result.current.updateResource('articles' as ResourceType, '1', updateData);
      });

      // Check updated state
      expect(result.current.resources).toEqual([updatedResource, mockResources[1]]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();

      // Verify API call
      expect(resourcesApi.updateResource).toHaveBeenCalledWith('articles', '1', updateData);
    });
  });

  describe('deleteResource', () => {
    it('should delete a resource and update state', async () => {
      // Mock API response
      (resourcesApi.deleteResource as jest.Mock).mockResolvedValue(undefined);

      // Render the hook with initial state
      const { result } = renderHook(() => useResourceStore());

      // Set initial resources
      act(() => {
        result.current.resources = [...mockResources];
      });

      // Delete resource
      await act(async () => {
        await result.current.deleteResource('articles' as ResourceType, '1');
      });

      // Check updated state - first resource should be removed
      expect(result.current.resources).toEqual([mockResources[1]]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();

      // Verify API call
      expect(resourcesApi.deleteResource).toHaveBeenCalledWith('articles', '1');
    });
  });

  describe('completeResource', () => {
    it('should mark a resource as completed and update state', async () => {
      // Completion notes
      const notes = 'This was a great resource!';

      // Mock API response
      const completedResource: Resource = {
        ...mockResources[0],
        completed: true,
        completion_date: '2023-01-05T00:00:00Z',
        notes,
      };

      (resourcesApi.completeResource as jest.Mock).mockResolvedValue(completedResource);

      // Render the hook with initial state
      const { result } = renderHook(() => useResourceStore());

      // Set initial resources
      act(() => {
        result.current.resources = [...mockResources];
      });

      // Complete resource
      await act(async () => {
        await result.current.completeResource('articles' as ResourceType, '1', notes);
      });

      // Check updated state
      expect(result.current.resources).toEqual([completedResource, mockResources[1]]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();

      // Verify API call
      expect(resourcesApi.completeResource).toHaveBeenCalledWith('articles', '1', notes);
    });
  });

  describe('setSelectedResource', () => {
    it('should update the selected resource', () => {
      // Render the hook
      const { result } = renderHook(() => useResourceStore());

      // Initial state
      expect(result.current.selectedResource).toBeNull();

      // Set selected resource
      act(() => {
        result.current.setSelectedResource(mockResources[0]);
      });

      // Check updated state
      expect(result.current.selectedResource).toEqual(mockResources[0]);

      // Clear selected resource
      act(() => {
        result.current.setSelectedResource(null);
      });

      // Check updated state
      expect(result.current.selectedResource).toBeNull();
    });
  });
});