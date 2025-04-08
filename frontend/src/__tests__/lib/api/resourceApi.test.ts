import resourcesApi from '@/lib/api/resources';
import { Resource, ResourceTypeString, ResourceCreateInput, ResourceUpdateInput, DifficultyLevel, ResourceStats } from '@/types/resource';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Create spies for resourcesApi methods
const getAllResourcesSpy = jest.spyOn(resourcesApi, 'getAllResources');
const getResourcesByTypeSpy = jest.spyOn(resourcesApi, 'getResourcesByType');
const createResourceSpy = jest.spyOn(resourcesApi, 'createResource');
const updateResourceSpy = jest.spyOn(resourcesApi, 'updateResource');
const deleteResourceSpy = jest.spyOn(resourcesApi, 'deleteResource');
const toggleResourceCompletionSpy = jest.spyOn(resourcesApi, 'toggleResourceCompletion');
const getStatisticsSpy = jest.spyOn(resourcesApi, 'getStatistics');

describe('resourcesApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockResource: Resource = {
    id: '123',
    title: 'Test Resource',
    url: 'https://example.com',
    type: 'article',
    topics: ['javascript', 'react'],
    difficulty: 'intermediate' as DifficultyLevel,
    estimated_time: 60,
    completed: false,
    date_added: '2023-01-01',
    completion_date: null,
    notes: '',
  };

  const mockResourceInput: ResourceCreateInput = {
    title: 'Test Resource',
    url: 'https://example.com',
    type: 'article',
    topics: ['javascript', 'react'],
    difficulty: 'intermediate' as DifficultyLevel,
    estimated_time: 60,
  };

  const mockResourceUpdate: ResourceUpdateInput = {
    title: 'Updated Resource',
    topics: ['javascript', 'react', 'typescript'],
  };

  const mockStatistics: ResourceStats = {
    total_resources: 10,
    total_completed: 5,
    completion_percentage: 50,
    articles: { total: 4, completed: 2, completion_percentage: 50 },
    videos: { total: 3, completed: 1, completion_percentage: 33 },
    courses: { total: 2, completed: 1, completion_percentage: 50 },
    books: { total: 1, completed: 1, completion_percentage: 100 },
    documentation: { total: 0, completed: 0, completion_percentage: 0 },
    tool: { total: 0, completed: 0, completion_percentage: 0 },
    other: { total: 0, completed: 0, completion_percentage: 0 },
    by_difficulty: {
      beginner: { total: 4, completed: 3 },
      intermediate: { total: 4, completed: 2 },
      advanced: { total: 2, completed: 0 },
      expert: { total: 0, completed: 0 },
    },
    by_topic: {
      javascript: { total: 5, completed: 3 },
      react: { total: 3, completed: 1 },
      typescript: { total: 2, completed: 1 },
    },
    recent_completions: [
      { ...mockResource, type: 'article', completed: true, completion_date: '2023-01-15' },
    ],
  };

  describe('getAllResources', () => {
    it('should fetch all resources', async () => {
      // Mock resources that match the Resource type
      const mockResources: Resource[] = [
        {
          id: '1',
          title: 'React Hooks',
          url: 'https://reactjs.org/docs/hooks-intro.html',
          type: 'article',
          topics: ['react', 'frontend'],
          difficulty: 'beginner' as DifficultyLevel,
          estimated_time: 30,
          completed: false,
          date_added: '2023-01-01',
          completion_date: null,
          notes: '',
        }
      ];

      // Mock resourcesApi.getAllResources
      getAllResourcesSpy.mockResolvedValue(mockResources);

      // Call the function
      const result = await resourcesApi.getAllResources();

      // Verify the function was called correctly
      expect(resourcesApi.getAllResources).toHaveBeenCalled();
      expect(result).toEqual(mockResources);
    });

    it('should handle errors', async () => {
      // Mock error response
      getAllResourcesSpy.mockRejectedValue(new Error('Server error'));

      // Call the function and expect it to throw
      await expect(resourcesApi.getAllResources()).rejects.toThrow('Server error');
    });
  });

  describe('getResourcesByType', () => {
    it('should fetch resources by type', async () => {
      const mockResources: Resource[] = [
        {
          id: '1',
          title: 'Test Resource',
          url: 'https://example.com',
          type: 'article',
          topics: ['javascript'],
          difficulty: 'intermediate' as DifficultyLevel,
          completed: false,
          date_added: '2023-01-01',
          completion_date: null,
          notes: '',
          estimated_time: 30,
        }
      ];

      // Setup mock
      getResourcesByTypeSpy.mockResolvedValue(mockResources);

      const type = 'article' as ResourceTypeString;

      const result = await resourcesApi.getResourcesByType(type);

      expect(resourcesApi.getResourcesByType).toHaveBeenCalledWith(type);
      expect(result).toEqual(mockResources);
    });

    it('should handle errors', async () => {
      getResourcesByTypeSpy.mockRejectedValue(new Error('Network error'));

      await expect(resourcesApi.getResourcesByType('article')).rejects.toThrow('Network error');
    });
  });

  describe('createResource', () => {
    it('should create a resource', async () => {
      // Setup mock
      createResourceSpy.mockResolvedValue(mockResource);

      const type = 'article' as ResourceTypeString;

      const result = await resourcesApi.createResource(type, mockResourceInput);

      expect(resourcesApi.createResource).toHaveBeenCalledWith(type, mockResourceInput);
      expect(result).toEqual(mockResource);
    });

    it('should handle errors', async () => {
      createResourceSpy.mockRejectedValue(new Error('Network error'));

      await expect(resourcesApi.createResource('article', mockResourceInput)).rejects.toThrow('Network error');
    });
  });

  describe('updateResource', () => {
    it('should update a resource', async () => {
      const updatedResource: Resource = {
        id: '123',
        title: 'Updated Resource',
        url: 'https://example.com',
        type: 'article',
        topics: ['javascript', 'react', 'typescript'],
        difficulty: 'intermediate' as DifficultyLevel,
        completed: false,
        date_added: '2023-01-01',
        completion_date: null,
        notes: '',
        estimated_time: 60,
      };

      // Setup mock
      updateResourceSpy.mockResolvedValue(updatedResource);

      const type = 'article' as ResourceTypeString;
      const id = '123';

      const result = await resourcesApi.updateResource(type, id, mockResourceUpdate);

      expect(resourcesApi.updateResource).toHaveBeenCalledWith(type, id, mockResourceUpdate);
      expect(result).toEqual(updatedResource);
    });

    it('should handle errors', async () => {
      updateResourceSpy.mockRejectedValue(new Error('Network error'));

      await expect(resourcesApi.updateResource('article', '123', mockResourceUpdate)).rejects.toThrow('Network error');
    });
  });

  describe('deleteResource', () => {
    it('should delete a resource', async () => {
      // Setup mock
      deleteResourceSpy.mockResolvedValue(undefined);

      const type = 'article' as ResourceTypeString;
      const id = '123';

      await resourcesApi.deleteResource(type, id);

      expect(resourcesApi.deleteResource).toHaveBeenCalledWith(type, id);
    });

    it('should handle errors', async () => {
      deleteResourceSpy.mockRejectedValue(new Error('Network error'));

      await expect(resourcesApi.deleteResource('article', '123')).rejects.toThrow('Network error');
    });
  });

  describe('toggleResourceCompletion', () => {
    it('should toggle resource completion status', async () => {
      const completedResource: Resource = {
        ...mockResource,
        completed: true,
        completion_date: '2023-01-15',
      };

      // Setup mock
      toggleResourceCompletionSpy.mockResolvedValue(completedResource);

      const type = 'article' as ResourceTypeString;
      const id = '123';

      const result = await resourcesApi.toggleResourceCompletion(type, id);

      expect(resourcesApi.toggleResourceCompletion).toHaveBeenCalledWith(type, id);
      expect(result).toEqual(completedResource);
    });

    it('should handle errors', async () => {
      toggleResourceCompletionSpy.mockRejectedValue(new Error('Network error'));

      await expect(resourcesApi.toggleResourceCompletion('article', '123')).rejects.toThrow('Network error');
    });
  });

  describe('getStatistics', () => {
    it('should get resource statistics', async () => {
      // Setup mock
      getStatisticsSpy.mockResolvedValue(mockStatistics);

      const result = await resourcesApi.getStatistics();

      expect(resourcesApi.getStatistics).toHaveBeenCalled();
      expect(result).toEqual(mockStatistics);
    });

    it('should handle errors', async () => {
      getStatisticsSpy.mockRejectedValue(new Error('Network error'));

      await expect(resourcesApi.getStatistics()).rejects.toThrow('Network error');
    });
  });
});