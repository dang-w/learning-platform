import { useCallback, useEffect } from 'react'
import { useResourceStore } from '@/lib/store/resource-store'
import { ResourceType, ResourceCreateInput, ResourceUpdateInput } from '@/types/resources'

export const useResources = (type?: ResourceType) => {
  const {
    resources,
    statistics,
    isLoading,
    error,
    selectedResource,
    fetchResources,
    fetchResourcesByType,
    fetchStatistics,
    addResource,
    updateResource,
    deleteResource,
    completeResource,
    setSelectedResource,
  } = useResourceStore()

  useEffect(() => {
    if (type) {
      fetchResourcesByType(type)
    } else {
      fetchResources()
    }
    fetchStatistics()
  }, [type, fetchResources, fetchResourcesByType, fetchStatistics])

  const handleAddResource = useCallback(
    async (resource: ResourceCreateInput) => {
      if (!type) throw new Error('Resource type is required for adding a resource')
      await addResource(type, resource)
      await fetchStatistics()
    },
    [type, addResource, fetchStatistics]
  )

  const handleUpdateResource = useCallback(
    async (id: string, resource: ResourceUpdateInput) => {
      if (!type) throw new Error('Resource type is required for updating a resource')
      await updateResource(type, id, resource)
      await fetchStatistics()
    },
    [type, updateResource, fetchStatistics]
  )

  const handleDeleteResource = useCallback(
    async (id: string) => {
      if (!type) throw new Error('Resource type is required for deleting a resource')
      await deleteResource(type, id)
      await fetchStatistics()
    },
    [type, deleteResource, fetchStatistics]
  )

  const handleCompleteResource = useCallback(
    async (id: string, notes: string) => {
      if (!type) throw new Error('Resource type is required for completing a resource')
      await completeResource(type, id, notes)
      await fetchStatistics()
    },
    [type, completeResource, fetchStatistics]
  )

  return {
    resources,
    statistics,
    isLoading,
    error,
    selectedResource,
    setSelectedResource,
    addResource: handleAddResource,
    updateResource: handleUpdateResource,
    deleteResource: handleDeleteResource,
    completeResource: handleCompleteResource,
  }
}