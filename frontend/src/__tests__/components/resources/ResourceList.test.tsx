import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ResourceList } from '@/components/resources/ResourceList';
import { useResourceStore } from '@/lib/store/resource-store';

// Mock the store
jest.mock('@/lib/store/resource-store');

describe('ResourceList Component', () => {
  const mockResources = [
    {
      id: '1',
      title: 'Introduction to Machine Learning',
      url: 'https://example.com/ml-intro',
      topics: ['ML', 'AI'],
      difficulty: 'beginner',
      estimated_time: 60,
      completed: false,
      date_added: '2023-03-15T10:30:00',
      completion_date: null,
      notes: ''
    },
    {
      id: '2',
      title: 'Advanced Neural Networks',
      url: 'https://example.com/neural-networks',
      topics: ['Neural Networks', 'Deep Learning'],
      difficulty: 'advanced',
      estimated_time: 120,
      completed: true,
      date_added: '2023-03-10T10:30:00',
      completion_date: '2023-03-14T10:30:00',
      notes: 'Great resource'
    }
  ];

  const mockDeleteResource = jest.fn();
  const mockToggleCompletion = jest.fn();
  const mockFetchResources = jest.fn();
  const mockFetchResourcesByType = jest.fn();
  const mockFetchStatistics = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useResourceStore as unknown as jest.Mock).mockReturnValue({
      resources: mockResources,
      statistics: null,
      isLoading: false,
      error: null,
      deleteResource: mockDeleteResource,
      toggleCompletion: mockToggleCompletion,
      fetchResources: mockFetchResources,
      fetchResourcesByType: mockFetchResourcesByType,
      fetchStatistics: mockFetchStatistics
    });
  });

  it('renders the resource list correctly', () => {
    render(<ResourceList selectedType="articles" onTypeChange={jest.fn()} />);

    expect(screen.getByText('Introduction to Machine Learning')).toBeInTheDocument();
    expect(screen.getByText('Advanced Neural Networks')).toBeInTheDocument();
    expect(screen.getByText('ML')).toBeInTheDocument();
    expect(screen.getByText('AI')).toBeInTheDocument();
    expect(screen.getByText('Neural Networks')).toBeInTheDocument();
    expect(screen.getByText('Deep Learning')).toBeInTheDocument();
  });

  it('shows loading state when resources are loading', () => {
    (useResourceStore as unknown as jest.Mock).mockReturnValue({
      resources: [],
      statistics: null,
      isLoading: true,
      error: null,
      deleteResource: mockDeleteResource,
      toggleCompletion: mockToggleCompletion,
      fetchResources: mockFetchResources,
      fetchResourcesByType: mockFetchResourcesByType,
      fetchStatistics: mockFetchStatistics
    });

    render(<ResourceList selectedType="articles" onTypeChange={jest.fn()} />);

    // The component uses a Spinner component, not text
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows error message when there is an error', () => {
    (useResourceStore as unknown as jest.Mock).mockReturnValue({
      resources: [],
      statistics: null,
      isLoading: false,
      error: 'Failed to fetch resources',
      deleteResource: mockDeleteResource,
      toggleCompletion: mockToggleCompletion,
      fetchResources: mockFetchResources,
      fetchResourcesByType: mockFetchResourcesByType,
      fetchStatistics: mockFetchStatistics
    });

    render(<ResourceList selectedType="articles" onTypeChange={jest.fn()} />);

    expect(screen.getByText(/Failed to load resources/i)).toBeInTheDocument();
  });

  it('calls fetchResources on component mount', () => {
    render(<ResourceList selectedType="articles" onTypeChange={jest.fn()} />);

    expect(mockFetchResourcesByType).toHaveBeenCalledWith('articles');
  });

  // Removing tests for UI elements that don't exist in the component
  // The component doesn't have delete buttons or checkboxes
  // The component doesn't have search input or filter select
});