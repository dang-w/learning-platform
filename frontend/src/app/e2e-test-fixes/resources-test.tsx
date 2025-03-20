'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store/auth-store';
import { ResourceForm } from '@/components/resources/ResourceForm';
import { ResourceList } from '@/components/resources/ResourceList';
import { ResourceType, Resource, ResourceCreateInput } from '@/types/resources';

// This is a special version of the resources page for testing
// It doesn't require authentication and directly renders the components

export default function ResourcesTestPage() {
  const [showForm, setShowForm] = useState(false);
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedType, setSelectedType] = useState<ResourceType>('articles');
  const authStore = useAuthStore();

  // Mock authentication for test
  useEffect(() => {
    if (!authStore.isAuthenticated) {
      // Set a test token directly in auth store for tests
      authStore.setDirectAuthState('test-token', true);
    }
  }, [authStore]);

  // Handle form submission
  const handleResourceSubmit = async (resource: ResourceCreateInput): Promise<void> => {
    const newResource: Resource = {
      ...resource,
      id: `test-${Date.now()}`,
      date_added: new Date().toISOString(),
      completion_date: null,
      completed: false,
      notes: ''
    };

    setResources([newResource, ...resources]);
    setShowForm(false);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4" data-testid="resources-heading">Test Resources Page</h1>

      <button
        onClick={() => setShowForm(true)}
        data-testid="add-resource"
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4"
      >
        Add Resource
      </button>

      {showForm && (
        <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
          <ResourceForm onSubmit={handleResourceSubmit} onCancel={() => setShowForm(false)} />
        </div>
      )}

      <ResourceList
        selectedType={selectedType}
        onTypeChange={setSelectedType}
      />
    </div>
  );
}