import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResourcesPage from '@/app/resources/page';
import { useResources } from '@/lib/hooks/useResources';
import { expect } from '@jest/globals';

// Mock the useResources hook
jest.mock('@/lib/hooks/useResources', () => ({
  useResources: jest.fn(),
}));

// Mock the ResourceList component
jest.mock('@/components/resources/ResourceList', () => ({
  ResourceList: ({ selectedType, onTypeChange }: { selectedType: string; onTypeChange: (type: string) => void }) => (
    <div data-testid="resource-list">
      <div>Selected Type: {selectedType}</div>
      <button onClick={() => onTypeChange('articles')}>Articles</button>
      <button onClick={() => onTypeChange('videos')}>Videos</button>
      <button onClick={() => onTypeChange('courses')}>Courses</button>
    </div>
  ),
}));

// Mock the ResourceForm component
jest.mock('@/components/resources/ResourceForm', () => ({
  ResourceForm: ({ onSubmit, onCancel }: {
    onSubmit: (resource: { title: string; url: string; type: string }) => void;
    onCancel: () => void
  }) => (
    <div data-testid="resource-form">
      <button onClick={() => onSubmit({ title: 'Test Resource', url: 'https://test.com', type: 'articles' })}>
        Submit
      </button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

describe('ResourcesPage', () => {
  const mockAddResource = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock the useResources hook
    (useResources as jest.Mock).mockReturnValue({
      addResource: mockAddResource,
      resources: [],
      isLoading: false,
      error: null,
    });
  });

  it('renders the resources page correctly', () => {
    render(<ResourcesPage />);

    // Check if the page title is rendered
    expect(screen.getByRole('heading', { name: /Learning Resources/i })).toBeInTheDocument();

    // Check if the add resource button is rendered
    expect(screen.getByRole('button', { name: /Add Resource/i })).toBeInTheDocument();

    // Check if the resource list is rendered
    expect(screen.getByTestId('resource-list')).toBeInTheDocument();

    // Check if the default selected type is 'articles'
    expect(screen.getByText(/Selected Type: articles/i)).toBeInTheDocument();
  });

  it('opens the resource form when add resource button is clicked', () => {
    render(<ResourcesPage />);

    // Initially, the form should not be visible
    expect(screen.queryByTestId('resource-form')).not.toBeInTheDocument();

    // Click the add resource button
    fireEvent.click(screen.getByRole('button', { name: /Add Resource/i }));

    // Now the form should be visible
    expect(screen.getByTestId('resource-form')).toBeInTheDocument();
  });

  it('closes the form when cancel button is clicked', () => {
    render(<ResourcesPage />);

    // Open the form
    fireEvent.click(screen.getByRole('button', { name: /Add Resource/i }));

    // Click the cancel button
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));

    // The form should be closed
    expect(screen.queryByTestId('resource-form')).not.toBeInTheDocument();
  });

  it('submits the form and adds a resource', async () => {
    render(<ResourcesPage />);

    // Open the form
    fireEvent.click(screen.getByRole('button', { name: /Add Resource/i }));

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /Submit/i }));

    // Check if addResource was called with the correct data
    expect(mockAddResource).toHaveBeenCalledWith({
      title: 'Test Resource',
      url: 'https://test.com',
      type: 'articles',
    });

    // Wait for the form to close
    await waitFor(() => {
      expect(screen.queryByTestId('resource-form')).not.toBeInTheDocument();
    });
  });

  it('changes the selected resource type', () => {
    render(<ResourcesPage />);

    // Initially, the selected type should be 'articles'
    expect(screen.getByText(/Selected Type: articles/i)).toBeInTheDocument();

    // Click the videos button
    fireEvent.click(screen.getByRole('button', { name: /Videos/i }));

    // Now the selected type should be 'videos'
    expect(screen.getByText(/Selected Type: videos/i)).toBeInTheDocument();

    // Click the courses button
    fireEvent.click(screen.getByRole('button', { name: /Courses/i }));

    // Now the selected type should be 'courses'
    expect(screen.getByText(/Selected Type: courses/i)).toBeInTheDocument();
  });
});