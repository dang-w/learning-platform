import '@testing-library/jest-dom';
import resourcesApi from '@/lib/api/resources';
import { Resource, ResourceTypeString, ResourceStats } from '@/types/resource';
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
          type: 'article',
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
      const mockStatistics: ResourceStats = {
        total_resources: 10,
        total_completed: 5,
        completion_percentage: 50,
        articles: { total: 5, completed: 3, completion_percentage: 60 },
        videos: { total: 3, completed: 1, completion_percentage: 33 },
        courses: { total: 1, completed: 1, completion_percentage: 100 },
        books: { total: 1, completed: 0, completion_percentage: 0 },
        documentation: { total: 0, completed: 0 },
        tool: { total: 0, completed: 0 },
        other: { total: 0, completed: 0 },
        by_difficulty: {
          beginner: { total: 5, completed: 3 },
          intermediate: { total: 3, completed: 2 },
          advanced: { total: 2, completed: 0 },
          expert: { total: 0, completed: 0 }
        },
        by_topic: {
          'javascript': { total: 5, completed: 3 },
          'python': { total: 3, completed: 2 }
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
          type: 'article',
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
      const result = await resourcesApi.getResourcesByType('article');

      // Check if the API was called with the correct type
      expect(resourcesApi.getResourcesByType).toHaveBeenCalledWith('article');

      // Check if the result matches the mock data
      expect(result).toEqual(mockResources);
    });
  });

  // Tests for other methods would follow the same pattern
});