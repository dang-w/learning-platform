import '@testing-library/jest-dom';
import resourcesApi, { ResourceStatistics } from '@/lib/api/resources';
import { Resource } from '@/types/resources';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Don't mock the module, but spy on each method
const getAllSpy = jest.spyOn(resourcesApi, 'getAll');
const getStatisticsSpy = jest.spyOn(resourcesApi, 'getStatistics');
const getResourcesByTypeSpy = jest.spyOn(resourcesApi, 'getResourcesByType');

describe('Resources API', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should call the resources endpoint with the correct parameters', async () => {
      // Setup mock response
      const mockResources: Resource[] = [
        {
          id: '1',
          title: 'Test Resource',
          url: 'https://example.com',
          topics: ['test', 'example'],
          difficulty: 'beginner',
          estimated_time: 30,
          completed: false,
          date_added: '2023-01-01T00:00:00Z',
          completion_date: null,
          notes: '',
        },
      ];

      // Setup the mock with proper typing
      getAllSpy.mockResolvedValue(mockResources);

      // Call the getAll function
      const result = await resourcesApi.getAll();

      // Check if the API was called
      expect(resourcesApi.getAll).toHaveBeenCalled();

      // Check if the result matches the mock data
      expect(result).toEqual(mockResources);
    });
  });

  describe('getStatistics', () => {
    it('should call the resource statistics endpoint', async () => {
      // Setup mock response
      const mockStatistics: ResourceStatistics = {
        total: 10,
        completed: 5,
        completion_percentage: 50,
        by_type: {
          articles: {
            total: 5,
            completed: 3,
            completion_percentage: 60
          },
          videos: {
            total: 3,
            completed: 1,
            completion_percentage: 33
          },
          courses: {
            total: 1,
            completed: 1,
            completion_percentage: 100
          },
          books: {
            total: 1,
            completed: 0,
            completion_percentage: 0
          }
        },
        by_difficulty: {
          beginner: {
            total: 5,
            completed: 3,
            completion_percentage: 60
          },
          intermediate: {
            total: 3,
            completed: 2,
            completion_percentage: 66
          },
          advanced: {
            total: 2,
            completed: 0,
            completion_percentage: 0
          }
        },
        by_topic: {
          'javascript': {
            total: 5,
            completed: 3,
            completion_percentage: 60
          },
          'python': {
            total: 3,
            completed: 2,
            completion_percentage: 66
          }
        },
        recent_completions: []
      };

      // Setup the mock with proper typing
      getStatisticsSpy.mockResolvedValue(mockStatistics);

      // Call the getStatistics function
      const result = await resourcesApi.getStatistics();

      // Check if the API was called
      expect(resourcesApi.getStatistics).toHaveBeenCalled();

      // Check if the result matches the mock data
      expect(result).toEqual(mockStatistics);
    });
  });

  describe('getResourcesByType', () => {
    it('should call the correct endpoint for the specified resource type', async () => {
      // Setup mock response
      const mockResources: Resource[] = [
        {
          id: '1',
          title: 'Test Article',
          url: 'https://example.com/article',
          topics: ['test', 'javascript'],
          difficulty: 'beginner',
          estimated_time: 15,
          completed: false,
          date_added: '2023-01-01T00:00:00Z',
          completion_date: null,
          notes: '',
        },
      ];

      // Setup the mock with proper typing
      getResourcesByTypeSpy.mockResolvedValue(mockResources);

      // Call the getResourcesByType function
      const result = await resourcesApi.getResourcesByType('articles');

      // Check if the API was called with the correct type
      expect(resourcesApi.getResourcesByType).toHaveBeenCalledWith('articles');

      // Check if the result matches the mock data
      expect(result).toEqual(mockResources);
    });
  });

  // Tests for other methods would follow the same pattern
});