import { AxiosError } from 'axios'
import apiClient, { withBackoff } from './client'
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
      const response = await apiClient.get('/resources/')
      return response.data
    } catch (error) {
      console.error('Error fetching resources:', error)
      throw error
    }
  },

  // Alias for getAll for backward compatibility
  getAllResources: async (): Promise<Resource[]> => {
    console.log('getAllResources called - using getAll')
    return resourcesApi.getAll()
  },

  // Get resources statistics
  getStatistics: async (): Promise<ResourceStatistics> => {
    try {
      const response = await apiClient.get('/resources/statistics')
      return response.data
    } catch (error) {
      console.error('Error fetching resource statistics:', error)
      throw error
    }
  },

  // Add alias for getStatistics for backward compatibility
  getResourceStatistics: async (): Promise<ResourceStatistics> => {
    console.log('getResourceStatistics called - using getStatistics')
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
      const { data } = await withBackoff(() => apiClient.get<Resource[]>(`/resources/${type}`))
      return data
    } catch (error) {
      return this.handleError(error)
    }
  },

  async createResource(type: ResourceType, resource: ResourceCreateInput): Promise<Resource> {
    try {
      const { data } = await withBackoff(() => apiClient.post<Resource>(`/resources/${type}`, resource))
      return data
    } catch (error) {
      return this.handleError(error)
    }
  },

  async updateResource(type: ResourceType, id: string, resource: ResourceUpdateInput): Promise<Resource> {
    try {
      const { data } = await withBackoff(() => apiClient.put<Resource>(`/resources/${type}/${id}`, resource))
      return data
    } catch (error) {
      return this.handleError(error)
    }
  },

  async deleteResource(type: ResourceType, id: string): Promise<void> {
    try {
      await withBackoff(() => apiClient.delete(`/resources/${type}/${id}`))
    } catch (error) {
      this.handleError(error)
    }
  },

  async completeResource(type: ResourceType, id: string, notes: string): Promise<Resource> {
    try {
      const { data } = await withBackoff(() => apiClient.post<Resource>(`/resources/${type}/${id}/complete`, { notes }))
      return data
    } catch (error) {
      return this.handleError(error)
    }
  },

  async toggleResourceCompletion(type: ResourceType, id: string): Promise<Resource> {
    try {
      const { data } = await withBackoff(() => apiClient.post<Resource>(`/resources/${type}/${id}/toggle-completion`))
      return data
    } catch (error) {
      return this.handleError(error)
    }
  },
}

export default resourcesApi

export async function fetchResourceStats(): Promise<ResourceStats> {
  const response = await withBackoff(() => apiClient.get<ResourceStats>('/resources/statistics'))
  return response.data
}