import { create } from 'zustand'
import resourcesApi from '@/lib/api/resources'
import { Resource, ResourceTypeString as ResourceType, ResourceCreateInput, ResourceUpdateInput, ResourceStats } from '@/types/resource'

interface ResourceState {
  resources: Resource[]
  statistics: ResourceStats | null
  isLoading: boolean
  error: string | null
  selectedResource: Resource | null
  // Actions
  fetchResources: () => Promise<void>
  fetchResourcesByType: (type: ResourceType) => Promise<void>
  addResource: (type: ResourceType, resource: ResourceCreateInput) => Promise<void>
  updateResource: (type: ResourceType, id: string, resource: ResourceUpdateInput) => Promise<void>
  deleteResource: (type: ResourceType, id: string) => Promise<void>
  completeResource: (type: ResourceType, id: string, notes: string) => Promise<void>
  toggleCompletion: (type: ResourceType, id: string) => Promise<void>
  fetchStatistics: () => Promise<void>
  setSelectedResource: (resource: Resource | null) => void
  reset: () => void
}

export const useResourceStore = create<ResourceState>((set) => ({
  resources: [],
  statistics: null,
  isLoading: false,
  error: null,
  selectedResource: null,

  fetchResources: async () => {
    set({ isLoading: true, error: null })
    try {
      const resources = await resourcesApi.getAllResources()
      set({ resources, isLoading: false })
    } catch (error) {
      set({ resources: [], error: (error as Error).message, isLoading: false })
    }
  },

  fetchResourcesByType: async (type) => {
    set({ isLoading: true, error: null })
    try {
      const resources = await resourcesApi.getResourcesByType(type)
      set({ resources, isLoading: false })
    } catch (error) {
      set({ resources: [], error: (error as Error).message, isLoading: false })
    }
  },

  addResource: async (type, resource) => {
    set({ isLoading: true, error: null })
    try {
      await resourcesApi.createResource(type, resource)
      useResourceStore.getState().fetchResourcesByType(type)
      useResourceStore.getState().fetchStatistics()
      set({ isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  updateResource: async (type, id, resource) => {
    set({ isLoading: true, error: null })
    try {
      await resourcesApi.updateResource(type, id, resource)
      useResourceStore.getState().fetchResourcesByType(type)
      useResourceStore.getState().fetchStatistics()
      set({ isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  deleteResource: async (type, id) => {
    set({ isLoading: true, error: null })
    try {
      await resourcesApi.deleteResource(type, id)
      useResourceStore.getState().fetchResourcesByType(type)
      useResourceStore.getState().fetchStatistics()
      set({ isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  completeResource: async (type, id, notes) => {
    set({ isLoading: true, error: null })
    try {
      await resourcesApi.completeResource(type, id, notes)
      useResourceStore.getState().fetchResourcesByType(type)
      useResourceStore.getState().fetchStatistics()
      set({ isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  toggleCompletion: async (type, id) => {
    set({ isLoading: true, error: null })
    try {
      await resourcesApi.toggleResourceCompletion(type, id)
      useResourceStore.getState().fetchResourcesByType(type)
      useResourceStore.getState().fetchStatistics()
      set({ isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  fetchStatistics: async () => {
    set({ isLoading: true, error: null })
    try {
      const statistics = await resourcesApi.getResourceStatistics()
      set({ statistics, isLoading: false })
    } catch (error) {
      set({ statistics: null, error: (error as Error).message, isLoading: false })
    }
  },

  setSelectedResource: (resource) => {
    set({ selectedResource: resource })
  },

  reset: () => {
    set({
      resources: [],
      statistics: null,
      isLoading: false,
      error: null,
      selectedResource: null
    })
  }
}))