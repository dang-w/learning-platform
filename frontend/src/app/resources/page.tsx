'use client'

import { useState } from 'react'
import { ResourceList } from '@/components/resources/ResourceList'
import { ResourceForm } from '@/components/resources/ResourceForm'
import { ResourceType, ResourceCreate } from '@/lib/api/resources'
import { useResources } from '@/lib/hooks/useResources'

export default function ResourcesPage() {
  const [selectedType, setSelectedType] = useState<ResourceType>('articles')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const { addResource } = useResources(selectedType)

  const handleCreateResource = async (data: ResourceCreate) => {
    await addResource(data)
    setIsFormOpen(false)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Learning Resources</h1>
        <button
          onClick={() => setIsFormOpen(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          Add Resource
        </button>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Add New Resource
            </h2>
            <ResourceForm
              onSubmit={handleCreateResource}
              onCancel={() => setIsFormOpen(false)}
            />
          </div>
        </div>
      )}

      <ResourceList
        selectedType={selectedType}
        onTypeChange={setSelectedType}
      />
    </div>
  )
}