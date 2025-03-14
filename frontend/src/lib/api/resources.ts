import { AxiosError } from 'axios'
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

class ResourcesApi {
  private handleError(error: unknown): never {
    if (error instanceof AxiosError) {
      throw new Error(error.response?.data?.message || error.message)
    }
    throw error
  }

  async getAllResources(): Promise<Resource[]> {
    try {
      const { data } = await apiClient.get<Resource[]>('/api/resources')
      return data
    } catch (error) {
      return this.handleError(error)
    }
  }

  async getResourcesByType(type: ResourceType): Promise<Resource[]> {
    try {
      const { data } = await apiClient.get<Resource[]>(`/api/resources/${type}`)
      return data
    } catch (error) {
      return this.handleError(error)
    }
  }

  async createResource(type: ResourceType, resource: ResourceCreateInput): Promise<Resource> {
    try {
      const { data } = await apiClient.post<Resource>(`/api/resources/${type}`, resource)
      return data
    } catch (error) {
      return this.handleError(error)
    }
  }

  async updateResource(type: ResourceType, id: string, resource: ResourceUpdateInput): Promise<Resource> {
    try {
      const { data } = await apiClient.put<Resource>(`/api/resources/${type}/${id}`, resource)
      return data
    } catch (error) {
      return this.handleError(error)
    }
  }

  async deleteResource(type: ResourceType, id: string): Promise<void> {
    try {
      await apiClient.delete(`/api/resources/${type}/${id}`)
    } catch (error) {
      this.handleError(error)
    }
  }

  async completeResource(type: ResourceType, id: string, notes: string): Promise<Resource> {
    try {
      const { data } = await apiClient.post<Resource>(`/api/resources/${type}/${id}/complete`, { notes })
      return data
    } catch (error) {
      return this.handleError(error)
    }
  }

  async getResourceStatistics(): Promise<ResourceStatistics> {
    try {
      const { data } = await apiClient.get<ResourceStatistics>('/api/resources/statistics')
      return data
    } catch (error) {
      return this.handleError(error)
    }
  }
}

export const resourcesApi = new ResourcesApi()
export default resourcesApi

export async function fetchResourceStats(): Promise<ResourceStats> {
  const response = await apiClient.get<ResourceStats>('/api/resources/stats')
  return response.data
}