import { act, renderHook } from '@testing-library/react';
import { useResourceStore } from '@/lib/store/resource-store';
import resourcesApi from '@/lib/api/resources';
import { Resource, ResourceTypeString, ResourceCreateInput, ResourceUpdateInput, DifficultyLevel, ResourceStats } from '@/types/resource';

// Mock the resources API
jest.mock('@/lib/api/resources', () => ({
  getAllResources: jest.fn(),
  getResourcesByType: jest.fn(),
  createResource: jest.fn(),
  updateResource: jest.fn(),
  deleteResource: jest.fn(),
  completeResource: jest.fn(),
  getResourceStatistics: jest.fn(),
  toggleResourceCompletion: jest.fn(),
}));

describe('Resource Store', () => {
  const mockResources: Resource[] = [
    {
      id: '1',
      title: 'Introduction to Machine Learning',
      url: 'https://example.com/ml-intro',
      type: 'course',
      topics: ['ML', 'AI'],
      difficulty: 'beginner' as DifficultyLevel,
      estimated_time: 60,
      completed: false,
      date_added: '2023-03-15T10:30:00',
      completion_date: null,
      notes: ''
    },
    {
      id: '2',
      title: 'Advanced Neural Networks',
      url: 'https://example.com/neural-networks',
      type: 'course',
      topics: ['Neural Networks', 'Deep Learning'],
      difficulty: 'advanced' as DifficultyLevel,
      estimated_time: 120,
      completed: true,
      date_added: '2023-03-10T10:30:00',
      completion_date: '2023-03-14T10:30:00',
      notes: 'Great resource'
    }
  ];

  const mockStatistics: ResourceStats = {
    total_resources: 10,
    total_completed: 5,
    completion_percentage: 50,
    articles: { total: 4, completed: 2, completion_percentage: 50 },
    videos: { total: 3, completed: 1, completion_percentage: 33 },
    courses: { total: 2, completed: 1, completion_percentage: 50 },
    books: { total: 1, completed: 1, completion_percentage: 100 },
    documentation: { total: 0, completed: 0 },
    tool: { total: 0, completed: 0 },
    other: { total: 0, completed: 0 },
    by_difficulty: {
      beginner: { total: 4, completed: 3 },
      intermediate: { total: 4, completed: 2 },
      advanced: { total: 2, completed: 0 },
      expert: { total: 0, completed: 0 }
    },
    by_topic: {
      javascript: { total: 5, completed: 3 },
      react: { total: 3, completed: 1 },
      typescript: { total: 2, completed: 1 },
    },
    recent_completions: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchResources', () => {
    it('should fetch all resources and update state', async () => {
      (resourcesApi.getAllResources as jest.Mock).mockResolvedValueOnce(mockResources);

      const { result } = renderHook(() => useResourceStore());

      await act(async () => {
        await result.current.fetchResources();
      });

      expect(resourcesApi.getAllResources).toHaveBeenCalledTimes(1);
      expect(result.current.resources).toEqual(mockResources);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle errors when fetching resources', async () => {
      const error = new Error('Failed to fetch resources');
      (resourcesApi.getAllResources as jest.Mock).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useResourceStore());

      await act(async () => {
        await result.current.fetchResources();
      });

      expect(resourcesApi.getAllResources).toHaveBeenCalledTimes(1);
      expect(result.current.resources).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(error.message);
    });
  });

  describe('fetchResourcesByType', () => {
    it('should fetch resources by type and update state', async () => {
      const type: ResourceTypeString = 'article';
      (resourcesApi.getResourcesByType as jest.Mock).mockResolvedValueOnce(mockResources);

      const { result } = renderHook(() => useResourceStore());

      await act(async () => {
        await result.current.fetchResourcesByType(type);
      });

      expect(resourcesApi.getResourcesByType).toHaveBeenCalledWith(type);
      expect(result.current.resources).toEqual(mockResources);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle errors when fetching resources by type', async () => {
      const type: ResourceTypeString = 'article';
      const error = new Error('Failed to fetch resources by type');
      (resourcesApi.getResourcesByType as jest.Mock).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useResourceStore());

      await act(async () => {
        await result.current.fetchResourcesByType(type);
      });

      expect(resourcesApi.getResourcesByType).toHaveBeenCalledWith(type);
      expect(result.current.resources).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(error.message);
    });
  });

  describe('addResource', () => {
    it('should add a resource and update state', async () => {
      const type: ResourceTypeString = 'article';
      const newResource: ResourceCreateInput = {
        title: 'New Resource',
        url: 'https://example.com/new',
        type: 'article',
        topics: ['React', 'TypeScript'],
        difficulty: 'intermediate' as DifficultyLevel,
        estimated_time: 45,
      };

      const createdResource: Resource = {
        ...newResource,
        id: '3',
        completed: false,
        date_added: '2023-03-20T10:30:00',
        completion_date: null,
        notes: '',
      };

      (resourcesApi.createResource as jest.Mock).mockResolvedValueOnce(createdResource);
      (resourcesApi.getResourcesByType as jest.Mock).mockResolvedValueOnce([createdResource]);
      (resourcesApi.getResourceStatistics as jest.Mock).mockResolvedValueOnce(mockStatistics);

      const { result } = renderHook(() => useResourceStore());

      await act(async () => {
        await result.current.addResource(type, newResource);
      });

      expect(resourcesApi.createResource).toHaveBeenCalledWith(type, newResource);
      expect(resourcesApi.getResourcesByType).toHaveBeenCalledWith(type);
      expect(resourcesApi.getResourceStatistics).toHaveBeenCalledTimes(1);
      expect(result.current.resources).toEqual([createdResource]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle errors when adding a resource', async () => {
      const type: ResourceTypeString = 'article';
      const newResource: ResourceCreateInput = {
        title: 'New Resource',
        url: 'https://example.com/new',
        type: 'article',
        topics: ['React', 'TypeScript'],
        difficulty: 'intermediate' as DifficultyLevel,
        estimated_time: 45,
      };

      const error = new Error('Failed to add resource');
      (resourcesApi.createResource as jest.Mock).mockRejectedValueOnce(error);

      (resourcesApi.getResourcesByType as jest.Mock).mockClear();
      (resourcesApi.getResourceStatistics as jest.Mock).mockClear();

      const { result } = renderHook(() => useResourceStore());

      await act(async () => {
        await result.current.addResource(type, newResource);
      });

      expect(resourcesApi.createResource).toHaveBeenCalledWith(type, newResource);
      expect(resourcesApi.getResourcesByType).not.toHaveBeenCalled();
      expect(resourcesApi.getResourceStatistics).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(error.message);
    });
  });

  describe('updateResource', () => {
    it('should update a resource and update state', async () => {
      const type: ResourceTypeString = 'article';
      const id = '1';
      const updateData: ResourceUpdateInput = {
        title: 'Updated Resource',
        topics: ['ML', 'AI', 'Data Science'],
      };
      const originalResource = mockResources.find(r => r.id === id)!;
      const updatedResource: Resource = {
        ...originalResource,
        ...updateData,
      };
      const updatedList = mockResources.map(r => r.id === id ? updatedResource : r);

      (resourcesApi.updateResource as jest.Mock).mockResolvedValueOnce(updatedResource);
      (resourcesApi.getResourcesByType as jest.Mock).mockResolvedValueOnce(updatedList);
      (resourcesApi.getResourceStatistics as jest.Mock).mockResolvedValueOnce(mockStatistics);

      const { result } = renderHook(() => useResourceStore());

      act(() => {
        result.current.resources = [...mockResources];
      });

      await act(async () => {
        await result.current.updateResource(type, id, updateData);
      });

      expect(resourcesApi.updateResource).toHaveBeenCalledWith(type, id, updateData);
      expect(resourcesApi.getResourcesByType).toHaveBeenCalledWith(type);
      expect(resourcesApi.getResourceStatistics).toHaveBeenCalledTimes(1);
      expect(result.current.resources).toEqual(updatedList);
      expect(result.current.resources.find(r => r.id === id)).toEqual(updatedResource);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle errors when updating a resource', async () => {
      const type: ResourceTypeString = 'article';
      const id = '1';
      const updateData: ResourceUpdateInput = {
        title: 'Updated Resource',
      };

      const error = new Error('Failed to update resource');
      (resourcesApi.updateResource as jest.Mock).mockRejectedValueOnce(error);

      (resourcesApi.getResourcesByType as jest.Mock).mockClear();
      (resourcesApi.getResourceStatistics as jest.Mock).mockClear();

      const { result } = renderHook(() => useResourceStore());

      act(() => {
        result.current.resources = [...mockResources];
      });

      await act(async () => {
        await result.current.updateResource(type, id, updateData);
      });

      expect(resourcesApi.updateResource).toHaveBeenCalledWith(type, id, updateData);
      expect(resourcesApi.getResourcesByType).not.toHaveBeenCalled();
      expect(resourcesApi.getResourceStatistics).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(error.message);
      expect(result.current.resources).toEqual(mockResources);
    });
  });

  describe('deleteResource', () => {
    it('should delete a resource and update state', async () => {
      const type: ResourceTypeString = 'article';
      const id = '1';
      const remainingResources = mockResources.filter(r => r.id !== id);

      (resourcesApi.deleteResource as jest.Mock).mockResolvedValueOnce(undefined);
      (resourcesApi.getResourcesByType as jest.Mock).mockResolvedValueOnce(remainingResources);
      (resourcesApi.getResourceStatistics as jest.Mock).mockResolvedValueOnce(mockStatistics);

      const { result } = renderHook(() => useResourceStore());

      act(() => {
        result.current.resources = [...mockResources];
      });

      await act(async () => {
        await result.current.deleteResource(type, id);
      });

      expect(resourcesApi.deleteResource).toHaveBeenCalledWith(type, id);
      expect(resourcesApi.getResourcesByType).toHaveBeenCalledWith(type);
      expect(resourcesApi.getResourceStatistics).toHaveBeenCalledTimes(1);
      expect(result.current.resources).toEqual(remainingResources);
      expect(result.current.resources.find(r => r.id === id)).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle errors when deleting a resource', async () => {
      const type: ResourceTypeString = 'article';
      const id = '1';

      const error = new Error('Failed to delete resource');
      (resourcesApi.deleteResource as jest.Mock).mockRejectedValueOnce(error);

      (resourcesApi.getResourcesByType as jest.Mock).mockClear();
      (resourcesApi.getResourceStatistics as jest.Mock).mockClear();

      const { result } = renderHook(() => useResourceStore());

      act(() => {
        result.current.resources = [...mockResources];
      });

      await act(async () => {
        await result.current.deleteResource(type, id);
      });

      expect(resourcesApi.deleteResource).toHaveBeenCalledWith(type, id);
      expect(resourcesApi.getResourcesByType).not.toHaveBeenCalled();
      expect(resourcesApi.getResourceStatistics).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(error.message);
      expect(result.current.resources).toEqual(mockResources);
    });
  });

  describe('completeResource', () => {
    it('should mark a resource as complete and update state', async () => {
      const type: ResourceTypeString = 'article';
      const id = '1';
      const notes = 'Completed with notes';
      const originalResource = mockResources.find(r => r.id === id)!;

      const completedResource: Resource = {
        ...originalResource,
        completed: true,
        completion_date: '2023-03-20T10:30:00',
        notes,
      };
      const updatedList = mockResources.map(r => r.id === id ? completedResource : r);

      (resourcesApi.completeResource as jest.Mock).mockResolvedValueOnce(completedResource);
      (resourcesApi.getResourcesByType as jest.Mock).mockResolvedValueOnce(updatedList);
      (resourcesApi.getResourceStatistics as jest.Mock).mockResolvedValueOnce(mockStatistics);

      const { result } = renderHook(() => useResourceStore());

      act(() => {
        result.current.resources = [...mockResources];
      });

      await act(async () => {
        await result.current.completeResource(type, id, notes);
      });

      expect(resourcesApi.completeResource).toHaveBeenCalledWith(type, id, notes);
      expect(resourcesApi.getResourcesByType).toHaveBeenCalledWith(type);
      expect(resourcesApi.getResourceStatistics).toHaveBeenCalledTimes(1);
      expect(result.current.resources).toEqual(updatedList);
      expect(result.current.resources.find(r => r.id === id)).toEqual(completedResource);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle errors when completing a resource', async () => {
      const type: ResourceTypeString = 'article';
      const id = '1';
      const notes = 'Completed with notes';

      const error = new Error('Failed to complete resource');
      (resourcesApi.completeResource as jest.Mock).mockRejectedValueOnce(error);

      (resourcesApi.getResourcesByType as jest.Mock).mockClear();
      (resourcesApi.getResourceStatistics as jest.Mock).mockClear();

      const { result } = renderHook(() => useResourceStore());

      act(() => {
        result.current.resources = [...mockResources];
      });

      await act(async () => {
        await result.current.completeResource(type, id, notes);
      });

      expect(resourcesApi.completeResource).toHaveBeenCalledWith(type, id, notes);
      expect(resourcesApi.getResourcesByType).not.toHaveBeenCalled();
      expect(resourcesApi.getResourceStatistics).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(error.message);
      expect(result.current.resources).toEqual(mockResources);
    });
  });

  describe('fetchStatistics', () => {
    it('should fetch statistics and update state', async () => {
      (resourcesApi.getResourceStatistics as jest.Mock).mockResolvedValueOnce(mockStatistics);

      const { result } = renderHook(() => useResourceStore());

      await act(async () => {
        await result.current.fetchStatistics();
      });

      expect(resourcesApi.getResourceStatistics).toHaveBeenCalledTimes(1);
      expect(result.current.statistics).toEqual(mockStatistics);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle errors when fetching statistics', async () => {
      const error = new Error('Failed to fetch statistics');
      (resourcesApi.getResourceStatistics as jest.Mock).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useResourceStore());

      await act(async () => {
        await result.current.fetchStatistics();
      });

      expect(resourcesApi.getResourceStatistics).toHaveBeenCalledTimes(1);
      expect(result.current.statistics).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(error.message);
    });
  });

  describe('setSelectedResource', () => {
    it('should set the selected resource', () => {
      const { result } = renderHook(() => useResourceStore());

      act(() => {
        result.current.setSelectedResource(mockResources[0]);
      });

      expect(result.current.selectedResource).toEqual(mockResources[0]);

      act(() => {
        result.current.setSelectedResource(null);
      });

      expect(result.current.selectedResource).toBeNull();
    });
  });

  describe('toggleCompletion', () => {
    it('should toggle resource completion status (to completed)', async () => {
      const type: ResourceTypeString = 'article';
      const id = '1';
      const originalResource = mockResources.find(r => r.id === id)!;

      const toggledResource: Resource = {
        ...originalResource,
        completed: true,
        completion_date: '2023-03-20T10:30:00',
      };
      const updatedList = mockResources.map(r => r.id === id ? toggledResource : r);

      (resourcesApi.toggleResourceCompletion as jest.Mock).mockResolvedValueOnce(toggledResource);
      (resourcesApi.getResourcesByType as jest.Mock).mockResolvedValueOnce(updatedList);
      (resourcesApi.getResourceStatistics as jest.Mock).mockResolvedValueOnce(mockStatistics);

      const { result } = renderHook(() => useResourceStore());

      act(() => {
        result.current.resources = [...mockResources];
      });

      await act(async () => {
        await result.current.toggleCompletion(type, id);
      });

      expect(resourcesApi.toggleResourceCompletion).toHaveBeenCalledWith(type, id);
      expect(resourcesApi.getResourcesByType).toHaveBeenCalledWith(type);
      expect(resourcesApi.getResourceStatistics).toHaveBeenCalledTimes(1);
      expect(result.current.resources).toEqual(updatedList);
      expect(result.current.resources.find(r => r.id === id)?.completed).toBe(true);
      expect(result.current.resources.find(r => r.id === id)?.completion_date).not.toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should toggle resource completion status (to incomplete)', async () => {
      const type: ResourceTypeString = 'article';
      const id = '2';
      const originalResource = mockResources.find(r => r.id === id)!;

      const toggledResource: Resource = {
        ...originalResource,
        completed: false,
        completion_date: null,
      };
      const initialState = [...mockResources];
      const updatedList = initialState.map(r => r.id === id ? toggledResource : r);

      (resourcesApi.toggleResourceCompletion as jest.Mock).mockResolvedValueOnce(toggledResource);
      (resourcesApi.getResourcesByType as jest.Mock).mockResolvedValueOnce(updatedList);
      (resourcesApi.getResourceStatistics as jest.Mock).mockResolvedValueOnce(mockStatistics);

      const { result } = renderHook(() => useResourceStore());

      act(() => {
        result.current.resources = initialState;
      });

      await act(async () => {
        await result.current.toggleCompletion(type, id);
      });

      expect(resourcesApi.toggleResourceCompletion).toHaveBeenCalledWith(type, id);
      expect(resourcesApi.getResourcesByType).toHaveBeenCalledWith(type);
      expect(resourcesApi.getResourceStatistics).toHaveBeenCalledTimes(1);
      expect(result.current.resources).toEqual(updatedList);
      expect(result.current.resources.find(r => r.id === id)?.completed).toBe(false);
      expect(result.current.resources.find(r => r.id === id)?.completion_date).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle errors when toggling completion', async () => {
      const type: ResourceTypeString = 'article';
      const id = '1';

      const error = new Error('Failed to toggle completion');
      (resourcesApi.toggleResourceCompletion as jest.Mock).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useResourceStore());
      act(() => {
        result.current.resources = [...mockResources];
      });

      (resourcesApi.getResourcesByType as jest.Mock).mockClear();
      (resourcesApi.getResourceStatistics as jest.Mock).mockClear();

      await act(async () => {
        await result.current.toggleCompletion(type, id);
      });

      expect(resourcesApi.toggleResourceCompletion).toHaveBeenCalledWith(type, id);
      expect(resourcesApi.getResourcesByType).not.toHaveBeenCalled();
      expect(resourcesApi.getResourceStatistics).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(error.message);
      expect(result.current.resources).toEqual(mockResources);
    });
  });

  describe('reset', () => {
    it('should reset the store state', () => {
      const { result } = renderHook(() => useResourceStore());

      act(() => {
        result.current.resources = [...mockResources];
        result.current.error = 'Some error';
        result.current.isLoading = true;
        result.current.selectedResource = mockResources[0];
        result.current.statistics = mockStatistics;
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.resources).toEqual([]);
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.selectedResource).toBeNull();
      expect(result.current.statistics).toBeNull();
    });
  });
});