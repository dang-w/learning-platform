import { renderHook, act } from '@testing-library/react';
import { useResources } from '@/lib/hooks/useResources';
import { useResourceStore } from '@/lib/store/resource-store';
import { ResourceTypeString, DifficultyLevel, Resource, ResourceCreateInput, ResourceUpdateInput } from '@/types/resource';

// Define a type for the resource store return value
interface MockResourceStore {
  resources: Resource[];
  statistics: { total_resources: number; total_completed: number };
  isLoading: boolean;
  error: string | null;
  selectedResource: Resource | null;
  fetchResources: jest.Mock;
  fetchResourcesByType: jest.Mock;
  fetchStatistics: jest.Mock;
  addResource: jest.Mock;
  updateResource: jest.Mock;
  deleteResource: jest.Mock;
  completeResource: jest.Mock;
  setSelectedResource: jest.Mock;
}

// Mock the resource store
jest.mock('@/lib/store/resource-store', () => ({
  useResourceStore: jest.fn(),
}));

describe('useResources Hook', () => {
  // Mock store functions
  const fetchResources = jest.fn();
  const fetchResourcesByType = jest.fn();
  const fetchStatistics = jest.fn();
  const addResource = jest.fn();
  const updateResource = jest.fn();
  const deleteResource = jest.fn();
  const completeResource = jest.fn();
  const setSelectedResource = jest.fn();

  // Mock store state
  const mockResources: Partial<Resource>[] = [
    { id: '1', title: 'Resource 1', type: 'article' },
    { id: '2', title: 'Resource 2', type: 'video' },
  ];
  const mockStatistics = { total_resources: 2, total_completed: 1 };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock implementation
    (useResourceStore as jest.MockedFunction<typeof useResourceStore>).mockReturnValue({
      resources: mockResources,
      statistics: mockStatistics,
      isLoading: false,
      error: null,
      selectedResource: null,
      fetchResources,
      fetchResourcesByType,
      fetchStatistics,
      addResource,
      updateResource,
      deleteResource,
      completeResource,
      setSelectedResource,
    } as MockResourceStore);
  });

  it('should fetch all resources when no type is provided', () => {
    renderHook(() => useResources());

    expect(fetchResources).toHaveBeenCalledTimes(1);
    expect(fetchResourcesByType).not.toHaveBeenCalled();
    expect(fetchStatistics).toHaveBeenCalledTimes(1);
  });

  it('should fetch resources by type when type is provided', () => {
    const type = 'article' as ResourceTypeString;
    renderHook(() => useResources(type));

    expect(fetchResourcesByType).toHaveBeenCalledWith(type);
    expect(fetchResources).not.toHaveBeenCalled();
    expect(fetchStatistics).toHaveBeenCalledTimes(1);
  });

  it('should add a resource and refresh statistics', async () => {
    const type = 'article' as ResourceTypeString;
    const newResource: ResourceCreateInput = {
      title: 'New Resource',
      url: 'https://example.com',
      type: 'article',
      topics: [],
      difficulty: 'beginner' as DifficultyLevel,
      estimated_time: 30
    };

    const { result } = renderHook(() => useResources(type));

    await act(async () => {
      await result.current.addResource(newResource);
    });

    expect(addResource).toHaveBeenCalledWith(type, newResource);
    expect(fetchStatistics).toHaveBeenCalledTimes(2); // Initial + after add
  });

  it('should update a resource and refresh statistics', async () => {
    const type = 'article' as ResourceTypeString;
    const id = '1';
    const updatedResource: ResourceUpdateInput = { title: 'Updated Resource' };

    const { result } = renderHook(() => useResources(type));

    await act(async () => {
      await result.current.updateResource(id, updatedResource);
    });

    expect(updateResource).toHaveBeenCalledWith(type, id, updatedResource);
    expect(fetchStatistics).toHaveBeenCalledTimes(2); // Initial + after update
  });

  it('should delete a resource and refresh statistics', async () => {
    const type = 'article' as ResourceTypeString;
    const id = '1';

    const { result } = renderHook(() => useResources(type));

    await act(async () => {
      await result.current.deleteResource(id);
    });

    expect(deleteResource).toHaveBeenCalledWith(type, id);
    expect(fetchStatistics).toHaveBeenCalledTimes(2); // Initial + after delete
  });

  it('should complete a resource and refresh statistics', async () => {
    const type = 'article' as ResourceTypeString;
    const id = '1';
    const notes = 'Completed resource notes';

    const { result } = renderHook(() => useResources(type));

    await act(async () => {
      await result.current.completeResource(id, notes);
    });

    expect(completeResource).toHaveBeenCalledWith(type, id, notes);
    expect(fetchStatistics).toHaveBeenCalledTimes(2); // Initial + after complete
  });

  it('should throw an error when trying to add a resource without a type', async () => {
    const newResource: ResourceCreateInput = {
      title: 'New Resource',
      url: 'https://example.com',
      type: 'article',
      topics: [],
      difficulty: 'beginner' as DifficultyLevel,
      estimated_time: 30
    };

    const { result } = renderHook(() => useResources());

    await expect(async () => {
      await act(async () => {
        await result.current.addResource(newResource);
      });
    }).rejects.toThrow('Resource type is required for adding a resource');
  });

  it('should expose the correct properties and methods', () => {
    const { result } = renderHook(() => useResources());

    expect(result.current).toHaveProperty('resources', mockResources);
    expect(result.current).toHaveProperty('statistics', mockStatistics);
    expect(result.current).toHaveProperty('isLoading', false);
    expect(result.current).toHaveProperty('error', null);
    expect(result.current).toHaveProperty('selectedResource', null);
    expect(result.current).toHaveProperty('setSelectedResource');
    expect(result.current).toHaveProperty('addResource');
    expect(result.current).toHaveProperty('updateResource');
    expect(result.current).toHaveProperty('deleteResource');
    expect(result.current).toHaveProperty('completeResource');
  });
});