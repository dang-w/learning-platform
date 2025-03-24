import { AxiosError } from 'axios'
import apiClient from './client'
import { Resource, ResourceType, ResourceCreateInput, ResourceUpdateInput, ResourceStats } from '@/types/resources'
import { fetchJsonWithAuth, withRetry } from '../utils/api'

export interface ResourceStatistics {
  total: number
  completed: number
  completion_percentage: number
  by_type: Record<ResourceType, {
    total: number
    completed: number
    completion_percentage: number
  }>
  by_difficulty: Record<'beginner' | 'intermediate' | 'advanced', {
    total: number
    completed: number
    completion_percentage: number
  }>
  by_topic: Record<string, {
    total: number
    completed: number
    completion_percentage: number
  }>
  recent_completions: (Resource & { resource_type: string })[]
}

const resourcesApi = {
  // Get all resources
  getAll: async (): Promise<Resource[]> => {
    try {
      return await fetchJsonWithAuth<Resource[]>('/api/resources');
    } catch (error) {
      console.error('Error fetching resources:', error)
      throw error
    }
  },

  // Alias for getAll for backward compatibility
  getAllResources: async (): Promise<Resource[]> => {
    return resourcesApi.getAll()
  },

  // Get resources statistics
  getStatistics: async (): Promise<ResourceStatistics> => {
    try {
      return await fetchJsonWithAuth<ResourceStatistics>('/api/resources/statistics');
    } catch (error) {
      // Try the direct backend API as fallback
      try {
        // Use apiClient as a fallback
        const response = await apiClient.get('/resources/statistics');
        return response.data;
      } catch (backendError) {
        console.error('Error fetching resource statistics:', backendError);
        // Re-throw the original error since it's more likely to be accurate
        throw error;
      }
    }
  },

  // Add alias for getStatistics for backward compatibility
  getResourceStatistics: async (): Promise<ResourceStatistics> => {
    return resourcesApi.getStatistics()
  },

  handleError(error: unknown): never {
    if (error instanceof AxiosError) {
      throw new Error(error.response?.data?.message || error.message)
    }
    throw error
  },

  async getResourcesByType(type: ResourceType): Promise<Resource[]> {
    try {
      const response = await apiClient.get<Resource[]>(`/api/resources/${type}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching resources of type ${type}:`, error);
      throw error;
    }
  },

  // New dedicated methods for videos, courses and books
  async getVideos(): Promise<Resource[]> {
    try {
      const response = await apiClient.get<Resource[]>('/api/resources/videos');
      return response.data;
    } catch (error) {
      console.error('Error fetching video resources:', error);
      throw error;
    }
  },

  async getCourses(): Promise<Resource[]> {
    try {
      const response = await apiClient.get<Resource[]>('/api/resources/courses');
      return response.data;
    } catch (error) {
      console.error('Error fetching course resources:', error);
      throw error;
    }
  },

  async getBooks(): Promise<Resource[]> {
    try {
      const response = await apiClient.get<Resource[]>('/api/resources/books');
      return response.data;
    } catch (error) {
      console.error('Error fetching book resources:', error);
      throw error;
    }
  },

  async createResource(type: ResourceType, resource: ResourceCreateInput): Promise<Resource> {
    try {
      // Use dedicated endpoints for videos, courses, and books if available
      if (type === 'videos' || type === 'courses' || type === 'books') {
        return await fetchJsonWithAuth<Resource>(`/api/resources/${type}`, {
          method: 'POST',
          body: JSON.stringify(resource)
        });
      }

      // Use the generic endpoint for other resource types
      return await fetchJsonWithAuth<Resource>(`/api/resources/${type}`, {
        method: 'POST',
        body: JSON.stringify(resource)
      });
    } catch (error) {
      console.error(`Error creating resource of type ${type}:`, error);
      throw error;
    }
  },

  // New dedicated creation methods
  async createVideo(resource: ResourceCreateInput): Promise<Resource> {
    try {
      return await fetchJsonWithAuth<Resource>('/api/resources/videos', {
        method: 'POST',
        body: JSON.stringify(resource)
      });
    } catch (error) {
      console.error('Error creating video resource:', error);
      throw error;
    }
  },

  async createCourse(resource: ResourceCreateInput): Promise<Resource> {
    try {
      return await fetchJsonWithAuth<Resource>('/api/resources/courses', {
        method: 'POST',
        body: JSON.stringify(resource)
      });
    } catch (error) {
      console.error('Error creating course resource:', error);
      throw error;
    }
  },

  async createBook(resource: ResourceCreateInput): Promise<Resource> {
    try {
      return await fetchJsonWithAuth<Resource>('/api/resources/books', {
        method: 'POST',
        body: JSON.stringify(resource)
      });
    } catch (error) {
      console.error('Error creating book resource:', error);
      throw error;
    }
  },

  async updateResource(type: ResourceType, id: string, resource: ResourceUpdateInput): Promise<Resource> {
    try {
      return await fetchJsonWithAuth<Resource>(`/api/resources/${type}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(resource)
      });
    } catch (error) {
      console.error(`Error updating resource ${id} of type ${type}:`, error);
      throw error;
    }
  },

  async deleteResource(type: ResourceType, id: string): Promise<void> {
    try {
      await fetchJsonWithAuth(`/api/resources/${type}/${id}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error(`Error deleting resource ${id} of type ${type}:`, error);
      throw error;
    }
  },

  async completeResource(type: ResourceType, id: string, notes: string): Promise<Resource> {
    try {
      return await fetchJsonWithAuth<Resource>(`/api/resources/${type}/${id}/complete`, {
        method: 'POST',
        body: JSON.stringify({ notes })
      });
    } catch (error) {
      console.error(`Error completing resource ${id} of type ${type}:`, error);
      throw error;
    }
  },

  async toggleResourceCompletion(type: ResourceType, id: string): Promise<Resource> {
    try {
      return await fetchJsonWithAuth<Resource>(`/api/resources/${type}/${id}/toggle-completion`, {
        method: 'POST'
      });
    } catch (error) {
      console.error(`Error toggling completion for resource ${id} of type ${type}:`, error);
      throw error;
    }
  },
}

export default resourcesApi

export async function fetchResourceStats(): Promise<ResourceStats> {
  return withRetry(async () => {
    try {
      return await fetchJsonWithAuth<ResourceStats>('/api/resources/statistics');
    } catch (error) {
      console.error('Error in fetchResourceStats:', error);
      throw error;
    }
  }, 2, 1000); // Retry up to 2 times with 1000ms initial delay
}