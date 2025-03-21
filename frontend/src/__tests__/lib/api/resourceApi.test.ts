import resourcesApi, { ResourceStatistics, fetchResourceStats } from '@/lib/api/resources';
import apiClient from '@/lib/api/client';
import { Resource, ResourceType, ResourceCreateInput, ResourceUpdateInput } from '@/types/resources';

// Mock the API client
jest.mock('@/lib/api/client', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  withBackoff: jest.fn((fn) => fn())
}));

describe('resourcesApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockResource: Resource = {
    id: '123',
    title: 'Test Resource',
    url: 'https://example.com',
    topics: ['javascript', 'react'],
    difficulty: 'intermediate',
    estimated_time: 60,
    completed: false,
    date_added: '2023-01-01',
    completion_date: null,
    notes: '',
  };

  const mockResourceInput: ResourceCreateInput = {
    title: 'Test Resource',
    url: 'https://example.com',
    topics: ['javascript', 'react'],
    difficulty: 'intermediate',
    estimated_time: 60,
  };

  const mockResourceUpdate: ResourceUpdateInput = {
    title: 'Updated Resource',
    topics: ['javascript', 'react', 'typescript'],
  };

  const mockStatistics: ResourceStatistics = {
    total: 10,
    completed: 5,
    completion_percentage: 50,
    by_type: {
      articles: { total: 4, completed: 2, completion_percentage: 50 },
      videos: { total: 3, completed: 1, completion_percentage: 33 },
      courses: { total: 2, completed: 1, completion_percentage: 50 },
      books: { total: 1, completed: 1, completion_percentage: 100 },
    },
    by_difficulty: {
      beginner: { total: 4, completed: 3, completion_percentage: 75 },
      intermediate: { total: 4, completed: 2, completion_percentage: 50 },
      advanced: { total: 2, completed: 0, completion_percentage: 0 },
    },
    by_topic: {
      javascript: { total: 5, completed: 3, completion_percentage: 60 },
      react: { total: 3, completed: 1, completion_percentage: 33 },
      typescript: { total: 2, completed: 1, completion_percentage: 50 },
    },
    recent_completions: [
      { ...mockResource, completed: true, completion_date: '2023-01-15', resource_type: 'articles' },
    ],
  };

  describe('getAllResources', () => {
    it('should fetch all resources', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({ data: [mockResource] });

      const result = await resourcesApi.getAllResources();

      expect(apiClient.get).toHaveBeenCalledWith('/resources/');
      expect(result).toEqual([mockResource]);
    });

    it('should handle errors', async () => {
      const error = new Error('Network error');
      (apiClient.get as jest.Mock).mockRejectedValueOnce(error);

      await expect(resourcesApi.getAllResources()).rejects.toThrow();
    });
  });

  describe('getResourcesByType', () => {
    it('should fetch resources by type', async () => {
      const mockResource = {
        id: '1',
        title: 'Test Resource',
        url: 'https://example.com',
        topics: ['javascript'],
        difficulty: 'intermediate',
        completed: false,
        date_added: '2023-01-01',
        completion_date: null,
        notes: '',
        estimated_time: 30,
      };

      (apiClient.get as jest.Mock).mockResolvedValue({ data: [mockResource] });

      const type = 'articles' as ResourceType;

      const result = await resourcesApi.getResourcesByType(type);

      expect(apiClient.get).toHaveBeenCalledWith(`/resources/${type}`);
      expect(result).toEqual([mockResource]);
    });

    it('should handle errors', async () => {
      const error = new Error('Network error');
      (apiClient.get as jest.Mock).mockRejectedValueOnce(error);

      await expect(resourcesApi.getResourcesByType('articles')).rejects.toThrow();
    });
  });

  describe('createResource', () => {
    it('should create a resource', async () => {
      const mockResource = {
        id: '1',
        title: 'Test Resource',
        url: 'https://example.com',
        topics: ['javascript', 'react'],
        difficulty: 'intermediate',
        completed: false,
        date_added: '2023-01-01',
        completion_date: null,
        notes: '',
        estimated_time: 60,
      };

      (apiClient.post as jest.Mock).mockResolvedValue({ data: mockResource });

      const type = 'articles' as ResourceType;
      const mockResourceInput = {
        title: 'Test Resource',
        url: 'https://example.com',
        topics: ['javascript', 'react'],
        difficulty: 'intermediate',
        estimated_time: 60,
      };

      const result = await resourcesApi.createResource(type, mockResourceInput);

      expect(apiClient.post).toHaveBeenCalledWith(`/resources/${type}`, mockResourceInput);
      expect(result).toEqual(mockResource);
    });

    it('should handle errors', async () => {
      const error = new Error('Network error');
      (apiClient.post as jest.Mock).mockRejectedValueOnce(error);

      await expect(resourcesApi.createResource('articles', mockResourceInput)).rejects.toThrow();
    });
  });

  describe('updateResource', () => {
    it('should update a resource', async () => {
      const updatedResource = {
        id: '123',
        title: 'Updated Resource',
        url: 'https://example.com',
        topics: ['javascript', 'react', 'typescript'],
        difficulty: 'intermediate',
        completed: false,
        date_added: '2023-01-01',
        completion_date: null,
        notes: '',
        estimated_time: 60,
      };

      (apiClient.put as jest.Mock).mockResolvedValue({ data: updatedResource });

      const type = 'articles' as ResourceType;
      const id = '123';
      const mockResourceUpdate = {
        title: 'Updated Resource',
        topics: ['javascript', 'react', 'typescript'],
      };

      const result = await resourcesApi.updateResource(type, id, mockResourceUpdate);

      expect(apiClient.put).toHaveBeenCalledWith(`/resources/${type}/${id}`, mockResourceUpdate);
      expect(result).toEqual(updatedResource);
    });

    it('should handle errors', async () => {
      const error = new Error('Network error');
      (apiClient.put as jest.Mock).mockRejectedValueOnce(error);

      await expect(resourcesApi.updateResource('articles', '123', mockResourceUpdate)).rejects.toThrow();
    });
  });

  describe('deleteResource', () => {
    it('should delete a resource', async () => {
      (apiClient.delete as jest.Mock).mockResolvedValue({});

      const type = 'articles' as ResourceType;
      const id = '123';

      await resourcesApi.deleteResource(type, id);

      expect(apiClient.delete).toHaveBeenCalledWith(`/resources/${type}/${id}`);
    });

    it('should handle errors', async () => {
      const error = new Error('Network error');
      (apiClient.delete as jest.Mock).mockRejectedValueOnce(error);

      await expect(resourcesApi.deleteResource('articles', '123')).rejects.toThrow();
    });
  });

  describe('completeResource', () => {
    it('should mark a resource as complete', async () => {
      const completedResource = {
        id: '123',
        title: 'Test Resource',
        url: 'https://example.com',
        topics: ['javascript'],
        difficulty: 'intermediate',
        completed: true,
        date_added: '2023-01-01',
        completion_date: '2023-01-10',
        notes: 'Completed with notes',
        estimated_time: 60,
      };

      (apiClient.post as jest.Mock).mockResolvedValue({ data: completedResource });

      const type = 'articles' as ResourceType;
      const id = '123';
      const notes = 'Completed with notes';

      const result = await resourcesApi.completeResource(type, id, notes);

      expect(apiClient.post).toHaveBeenCalledWith(`/resources/${type}/${id}/complete`, { notes });
      expect(result).toEqual(completedResource);
    });

    it('should handle errors', async () => {
      const error = new Error('Network error');
      (apiClient.post as jest.Mock).mockRejectedValueOnce(error);

      await expect(resourcesApi.completeResource('articles', '123', 'notes')).rejects.toThrow();
    });
  });

  describe('getResourceStatistics', () => {
    it('should fetch resource statistics', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockStatistics });

      const result = await resourcesApi.getResourceStatistics();

      expect(apiClient.get).toHaveBeenCalledWith('/resources/statistics');
      expect(result).toEqual(mockStatistics);
    });

    it('should handle errors', async () => {
      const error = new Error('Network error');
      (apiClient.get as jest.Mock).mockRejectedValueOnce(error);

      await expect(resourcesApi.getResourceStatistics()).rejects.toThrow();
    });
  });

  describe('fetchResourceStats', () => {
    it('should fetch resource stats', async () => {
      const mockStats = {
        total_resources: 50,
        total_completed: 20,
        total_in_progress: 30,
        articles: {
          total: 20,
          completed: 10,
          in_progress: 10,
        },
        videos: {
          total: 15,
          completed: 5,
          in_progress: 10,
        },
        courses: {
          total: 10,
          completed: 3,
          in_progress: 7,
        },
        books: {
          total: 5,
          completed: 2,
          in_progress: 3,
        },
      };

      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockStats });

      const result = await fetchResourceStats();

      expect(apiClient.get).toHaveBeenCalledWith('/resources/statistics');
      expect(result).toEqual(mockStats);
    });

    it('should handle errors', async () => {
      const error = new Error('Network error');
      (apiClient.get as jest.Mock).mockRejectedValueOnce(error);

      await expect(fetchResourceStats()).rejects.toThrow();
    });
  });
});