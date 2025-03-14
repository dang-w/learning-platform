import resourcesApi, { ResourceStatistics, fetchResourceStats } from '@/lib/api/resources';
import apiClient from '@/lib/api/client';
import { Resource, ResourceType, ResourceCreateInput, ResourceUpdateInput, ResourceStats } from '@/types/resources';

// Mock the apiClient
jest.mock('@/lib/api/client', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

describe('Resources API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllResources', () => {
    it('should call the getAllResources endpoint', async () => {
      // Mock response
      const mockResources: Resource[] = [
        {
          id: '1',
          title: 'Test Resource',
          url: 'https://example.com',
          topics: ['test'],
          difficulty: 'beginner',
          completed: false,
          date_added: '2023-01-01T00:00:00Z',
          completion_date: null,
          notes: '',
          estimated_time: 10,
        },
      ];
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockResources });

      // Call the function
      const result = await resourcesApi.getAllResources();

      // Assertions
      expect(apiClient.get).toHaveBeenCalledWith('/api/resources');
      expect(result).toEqual(mockResources);
    });
  });

  describe('getResourcesByType', () => {
    it('should call the getResourcesByType endpoint', async () => {
      // Mock response
      const mockResources: Resource[] = [
        {
          id: '1',
          title: 'Test Article',
          url: 'https://example.com',
          topics: ['test'],
          difficulty: 'beginner',
          completed: false,
          date_added: '2023-01-01T00:00:00Z',
          completion_date: null,
          notes: '',
          estimated_time: 10,
        },
      ];
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockResources });

      // Test type
      const resourceType: ResourceType = 'articles';

      // Call the function
      const result = await resourcesApi.getResourcesByType(resourceType);

      // Assertions
      expect(apiClient.get).toHaveBeenCalledWith(`/api/resources/${resourceType}`);
      expect(result).toEqual(mockResources);
    });
  });

  describe('createResource', () => {
    it('should call the createResource endpoint', async () => {
      // Mock response
      const mockResource: Resource = {
        id: '1',
        title: 'Test Resource',
        url: 'https://example.com',
        topics: ['test'],
        difficulty: 'beginner',
        completed: false,
        date_added: '2023-01-01T00:00:00Z',
        completion_date: null,
        notes: '',
        estimated_time: 10,
      };
      (apiClient.post as jest.Mock).mockResolvedValue({ data: mockResource });

      // Test data
        const resourceType: ResourceType = 'articles';
      const resourceData: ResourceCreateInput = {
        title: 'Test Resource',
        url: 'https://example.com',
        topics: ['test'],
        difficulty: 'beginner',
        estimated_time: 10,
      };

      // Call the function
      const result = await resourcesApi.createResource(resourceType, resourceData);

      // Assertions
      expect(apiClient.post).toHaveBeenCalledWith(`/api/resources/${resourceType}`, resourceData);
      expect(result).toEqual(mockResource);
    });
  });

  describe('updateResource', () => {
    it('should call the updateResource endpoint', async () => {
      // Mock response
      const mockResource: Resource = {
        id: '1',
        title: 'Updated Resource',
        url: 'https://example.com',
        topics: ['test'],
        difficulty: 'beginner',
        completed: false,
        date_added: '2023-01-01T00:00:00Z',
        completion_date: null,
        notes: '',
        estimated_time: 10,
      };
      (apiClient.put as jest.Mock).mockResolvedValue({ data: mockResource });

      // Test data
      const resourceType: ResourceType = 'articles';
      const resourceId = '1';
      const resourceData: ResourceUpdateInput = {
        title: 'Updated Resource',
        url: 'https://example.com',
        topics: ['test'],
        difficulty: 'beginner',
        estimated_time: 10,
      };

      // Call the function
      const result = await resourcesApi.updateResource(resourceType, resourceId, resourceData);

      // Assertions
      expect(apiClient.put).toHaveBeenCalledWith(`/api/resources/${resourceType}/${resourceId}`, resourceData);
      expect(result).toEqual(mockResource);
    });
  });

  describe('deleteResource', () => {
    it('should call the deleteResource endpoint', async () => {
      // Mock response
      (apiClient.delete as jest.Mock).mockResolvedValue({});

      // Test data
      const resourceType: ResourceType = 'articles';
      const resourceId = '1';

      // Call the function
      await resourcesApi.deleteResource(resourceType, resourceId);

      // Assertions
      expect(apiClient.delete).toHaveBeenCalledWith(`/api/resources/${resourceType}/${resourceId}`);
    });
  });

  describe('completeResource', () => {
    it('should call the completeResource endpoint', async () => {
      // Mock response
      const mockResource: Resource = {
        id: '1',
        title: 'Test Resource',
        url: 'https://example.com',
        topics: ['test'],
        difficulty: 'beginner',
        completed: false,
        date_added: '2023-01-01T00:00:00Z',
        completion_date: null,
        notes: '',
        estimated_time: 10,
      };
      (apiClient.post as jest.Mock).mockResolvedValue({ data: mockResource });

      // Test data
      const resourceType: ResourceType = 'articles';
      const resourceId = '1';
      const notes = 'Completed this resource';

      // Call the function
      const result = await resourcesApi.completeResource(resourceType, resourceId, notes);

      // Assertions
      expect(apiClient.post).toHaveBeenCalledWith(`/api/resources/${resourceType}/${resourceId}/complete`, { notes });
      expect(result).toEqual(mockResource);
    });
  });

  describe('getResourceStatistics', () => {
    it('should call the getResourceStatistics endpoint', async () => {
      // Mock response
      const mockStats: ResourceStatistics = {
        total: 10,
        completed: 5,
        completion_percentage: 50,
        by_type: {
          articles: {
            total: 5,
            completed: 3,
            completion_percentage: 60,
          },
          videos: {
            total: 3,
            completed: 1,
            completion_percentage: 33.33,
          },
          books: {
            total: 2,
            completed: 1,
            completion_percentage: 50,
          },
          courses: {
            total: 2,
            completed: 1,
            completion_percentage: 50,
          },
        },
        by_difficulty: {
          beginner: {
            total: 4,
            completed: 2,
            completion_percentage: 50,
          },
          intermediate: {
            total: 4,
            completed: 2,
            completion_percentage: 50,
          },
          advanced: {
            total: 2,
            completed: 1,
            completion_percentage: 50,
          },
        },
        by_topic: {
          javascript: {
            total: 5,
            completed: 3,
            completion_percentage: 60,
          },
          react: {
            total: 3,
            completed: 1,
            completion_percentage: 33.33,
          },
          typescript: {
            total: 2,
            completed: 1,
            completion_percentage: 50,
          },
        },
        recent_completions: [
          {
            id: '1',
            title: 'Test Resource',
            url: 'https://example.com',
            topics: ['test'],
            difficulty: 'beginner',
            estimated_time: 10,
            completed: true,
            date_added: '2023-01-01T00:00:00Z',
            completion_date: '2023-01-01T00:00:00Z',
            notes: '',
            resource_type: 'article',
          },
        ],
      };
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockStats });

      // Call the function
      const result = await resourcesApi.getResourceStatistics();

      // Assertions
      expect(apiClient.get).toHaveBeenCalledWith('/api/resources/statistics');
      expect(result).toEqual(mockStats);
    });
  });

  describe('fetchResourceStats', () => {
    it('should call the fetchResourceStats endpoint', async () => {
      // Mock response
      const mockStats: ResourceStats = {
        total_completed: 10,
        total_in_progress: 5,
        total_resources: 15,
        articles: {
          total: 5,
          completed: 3,
          in_progress: 2,
        },
        videos: {
          total: 3,
          completed: 1,
          in_progress: 2,
        },
        books: {
          total: 2,
          completed: 1,
          in_progress: 1,
        },
        courses: {
          total: 2,
          completed: 1,
          in_progress: 1,
        },
      };
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockStats });

      // Call the function
      const result = await fetchResourceStats();

      // Assertions
      expect(apiClient.get).toHaveBeenCalledWith('/api/resources/stats');
      expect(result).toEqual(mockStats);
    });
  });
});