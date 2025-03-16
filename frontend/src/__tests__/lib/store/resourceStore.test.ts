import { renderHook, act } from '@testing-library/react';
import { useResourceStore } from '@/lib/store/resourceStore';
import * as resourceApi from '@/lib/api/resourceApi';

// Mock the API
jest.mock('@/lib/api/resourceApi');

describe('Resource Store', () => {
  const mockResources = [
    {
      id: '1',
      title: 'Introduction to Machine Learning',
      url: 'https://example.com/ml-intro',
      topics: ['ML', 'AI'],
      difficulty: 'beginner',
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
      topics: ['Neural Networks', 'Deep Learning'],
      difficulty: 'advanced',
      estimated_time: 120,
      completed: true,
      date_added: '2023-03-10T10:30:00',
      completion_date: '2023-03-14T10:30:00',
      notes: 'Great resource'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset the store state
    const { result } = renderHook(() => useResourceStore());
    act(() => {
      result.current.reset();
    });
  });

  describe('fetchResources', () => {
    it('fetches resources and updates the store', async () => {
      (resourceApi.fetchResources as jest.Mock).mockResolvedValue(mockResources);

      const { result } = renderHook(() => useResourceStore());

      await act(async () => {
        await result.current.fetchResources('articles');
      });

      expect(resourceApi.fetchResources).toHaveBeenCalledWith('articles');
      expect(result.current.resources).toEqual(mockResources);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('handles errors correctly', async () => {
      const mockError = new Error('Failed to fetch resources');
      (resourceApi.fetchResources as jest.Mock).mockRejectedValue(mockError);

      const { result } = renderHook(() => useResourceStore());

      await act(async () => {
        await result.current.fetchResources('articles').catch(() => {});
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Failed to fetch resources');
    });
  });

  describe('addResource', () => {
    it('adds a resource and updates the store', async () => {
      const newResource = {
        title: 'New Resource',
        url: 'https://example.com/new',
        topics: ['AI', 'ML'],
        difficulty: 'beginner',
        estimated_time: 30
      };

      const createdResource = {
        ...newResource,
        id: '3',
        completed: false,
        date_added: '2023-03-16T10:30:00',
        completion_date: null,
        notes: ''
      };

      (resourceApi.addResource as jest.Mock).mockResolvedValue(createdResource);

      const { result } = renderHook(() => useResourceStore());

      // First set some initial resources
      act(() => {
        result.current.setResources(mockResources);
      });

      await act(async () => {
        await result.current.addResource('articles', newResource);
      });

      expect(resourceApi.addResource).toHaveBeenCalledWith('articles', newResource);
      expect(result.current.resources).toEqual([...mockResources, createdResource]);
    });

    it('handles errors correctly', async () => {
      const newResource = { title: 'New Resource' };
      const mockError = new Error('Validation error');
      (resourceApi.addResource as jest.Mock).mockRejectedValue(mockError);

      const { result } = renderHook(() => useResourceStore());

      await act(async () => {
        await result.current.addResource('articles', newResource).catch(() => {});
      });

      expect(result.current.error).toBe('Validation error');
    });
  });

  describe('updateResource', () => {
    it('updates a resource and updates the store', async () => {
      const updatedData = { title: 'Updated Title' };
      const updatedResource = { ...mockResources[0], ...updatedData };

      (resourceApi.updateResource as jest.Mock).mockResolvedValue(updatedResource);

      const { result } = renderHook(() => useResourceStore());

      // First set some initial resources
      act(() => {
        result.current.setResources(mockResources);
      });

      await act(async () => {
        await result.current.updateResource('articles', '1', updatedData);
      });

      expect(resourceApi.updateResource).toHaveBeenCalledWith('articles', '1', updatedData);
      expect(result.current.resources[0].title).toBe('Updated Title');
    });
  });

  describe('deleteResource', () => {
    it('deletes a resource and updates the store', async () => {
      (resourceApi.deleteResource as jest.Mock).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useResourceStore());

      // First set some initial resources
      act(() => {
        result.current.setResources(mockResources);
      });

      await act(async () => {
        await result.current.deleteResource('articles', '1');
      });

      expect(resourceApi.deleteResource).toHaveBeenCalledWith('articles', '1');
      expect(result.current.resources.length).toBe(1);
      expect(result.current.resources[0].id).toBe('2');
    });
  });

  describe('toggleCompletion', () => {
    it('toggles resource completion status', async () => {
      const toggledResource = { ...mockResources[0], completed: true };

      (resourceApi.toggleResourceCompletion as jest.Mock).mockResolvedValue(toggledResource);

      const { result } = renderHook(() => useResourceStore());

      // First set some initial resources
      act(() => {
        result.current.setResources(mockResources);
      });

      await act(async () => {
        await result.current.toggleCompletion('articles', '1');
      });

      expect(resourceApi.toggleResourceCompletion).toHaveBeenCalledWith('articles', '1');
      expect(result.current.resources[0].completed).toBe(true);
    });
  });
});