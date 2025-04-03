import apiClient from './client'
import { Resource, ResourceType, ResourceCreateInput, ResourceUpdateInput, ResourceStats } from '@/types/resources'

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
      const response = await apiClient.get<Resource[]>('/api/resources');
      return response.data;
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
      const response = await apiClient.get<ResourceStatistics>('/resources/statistics');
      return response.data;
    } catch (error) {
      console.error('Error fetching resource statistics:', error);
      throw error;
    }
  },

  // Add alias for getStatistics for backward compatibility
  getResourceStatistics: async (): Promise<ResourceStatistics> => {
    return resourcesApi.getStatistics()
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
      const response = await apiClient.post<Resource>(`/api/resources/${type}`, resource);
      return response.data;
    } catch (error) {
      console.error(`Error creating resource of type ${type}:`, error);
      throw error;
    }
  },

  // New dedicated creation methods
  async createVideo(resource: ResourceCreateInput): Promise<Resource> {
    try {
      const response = await apiClient.post<Resource>('/api/resources/videos', resource);
      return response.data;
    } catch (error) {
      console.error('Error creating video resource:', error);
      throw error;
    }
  },

  async createCourse(resource: ResourceCreateInput): Promise<Resource> {
    try {
      const response = await apiClient.post<Resource>('/api/resources/courses', resource);
      return response.data;
    } catch (error) {
      console.error('Error creating course resource:', error);
      throw error;
    }
  },

  async createBook(resource: ResourceCreateInput): Promise<Resource> {
    try {
      const response = await apiClient.post<Resource>('/api/resources/books', resource);
      return response.data;
    } catch (error) {
      console.error('Error creating book resource:', error);
      throw error;
    }
  },

  async updateResource(type: ResourceType, id: string, resource: ResourceUpdateInput): Promise<Resource> {
    try {
      const response = await apiClient.put<Resource>(`/api/resources/${type}/${id}`, resource);
      return response.data;
    } catch (error) {
      console.error(`Error updating resource ${id} of type ${type}:`, error);
      throw error;
    }
  },

  async deleteResource(type: ResourceType, id: string): Promise<void> {
    try {
      await apiClient.delete(`/api/resources/${type}/${id}`);
    } catch (error) {
      console.error(`Error deleting resource ${id} of type ${type}:`, error);
      throw error;
    }
  },

  async completeResource(type: ResourceType, id: string, notes: string): Promise<Resource> {
    try {
      const response = await apiClient.patch<Resource>(`/api/resources/${type}/${id}/complete`, { notes });
      return response.data;
    } catch (error) {
      console.error(`Error completing resource ${id} of type ${type}:`, error);
      throw error;
    }
  },

  async toggleResourceCompletion(type: ResourceType, id: string): Promise<Resource> {
    try {
      const response = await apiClient.post<Resource>(`/api/resources/${type}/${id}/toggle-completion`);
      return response.data;
    } catch (error) {
      console.error(`Error toggling completion for resource ${id} of type ${type}:`, error);
      throw error;
    }
  },

  async getResourceById(type: ResourceType, id: string): Promise<Resource> {
    try {
      const response = await apiClient.get<Resource>(`/api/resources/${type}/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching resource ${id} of type ${type}:`, error);
      throw error;
    }
  },

  async getResourceStats(type: ResourceType, id: string): Promise<ResourceStats> {
    try {
      const response = await apiClient.get<ResourceStats>(`/api/resources/${type}/${id}/stats`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching stats for resource ${id} of type ${type}:`, error);
      throw error;
    }
  },

  getResource: async (type: ResourceType, id: string): Promise<Resource> => {
    return resourcesApi.getResourceById(type, id);
  },
}

export default resourcesApi

export async function fetchResourceStats(): Promise<ResourceStats> {
  try {
    const response = await apiClient.get<ResourceStats>('/api/resources/statistics');
    return response.data;
  } catch (error) {
    console.error('Error in fetchResourceStats:', error);
    throw error;
  }
}