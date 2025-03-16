import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ResourceList } from '@/components/resources/ResourceList';
import { useResourceStore } from '@/lib/store/resourceStore';

// Mock the store
jest.mock('@/lib/store/resourceStore');

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

  beforeEach(() => {
    jest.clearAllMocks();

    (useResourceStore as jest.Mock).mockReturnValue({
      resources: mockResources,
      isLoading: false,
      error: null,
      deleteResource: mockDeleteResource,
      toggleCompletion: mockToggleCompletion,
      fetchResources: mockFetchResources
    });
  });

  it('renders the resource list correctly', () => {
    render(<ResourceList resourceType="articles" />);

    expect(screen.getByText('Introduction to Machine Learning')).toBeInTheDocument();
    expect(screen.getByText('Advanced Neural Networks')).toBeInTheDocument();
    expect(screen.getByText('ML, AI')).toBeInTheDocument();
    expect(screen.getByText('Neural Networks, Deep Learning')).toBeInTheDocument();
  });

  it('shows loading state when resources are loading', () => {
    (useResourceStore as jest.Mock).mockReturnValue({
      resources: [],
      isLoading: true,
      error: null,
      deleteResource: mockDeleteResource,
      toggleCompletion: mockToggleCompletion,
      fetchResources: mockFetchResources
    });

    render(<ResourceList resourceType="articles" />);

    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('shows error message when there is an error', () => {
    (useResourceStore as jest.Mock).mockReturnValue({
      resources: [],
      isLoading: false,
      error: 'Failed to fetch resources',
      deleteResource: mockDeleteResource,
      toggleCompletion: mockToggleCompletion,
      fetchResources: mockFetchResources
    });

    render(<ResourceList resourceType="articles" />);

    expect(screen.getByText(/Failed to fetch resources/i)).toBeInTheDocument();
  });

  it('calls fetchResources on component mount', () => {
    render(<ResourceList resourceType="articles" />);

    expect(mockFetchResources).toHaveBeenCalledWith('articles');
  });

  it('calls deleteResource when delete button is clicked', async () => {
    render(<ResourceList resourceType="articles" />);

    const deleteButtons = screen.getAllByRole('button', { name: /Delete/i });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mockDeleteResource).toHaveBeenCalledWith('articles', '1');
    });
  });

  it('calls toggleCompletion when completion checkbox is clicked', async () => {
    render(<ResourceList resourceType="articles" />);

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);

    await waitFor(() => {
      expect(mockToggleCompletion).toHaveBeenCalledWith('articles', '1');
    });
  });

  it('filters resources based on search input', () => {
    render(<ResourceList resourceType="articles" />);

    const searchInput = screen.getByPlaceholderText(/Search/i);
    fireEvent.change(searchInput, { target: { value: 'neural' } });

    expect(screen.queryByText('Introduction to Machine Learning')).not.toBeInTheDocument();
    expect(screen.getByText('Advanced Neural Networks')).toBeInTheDocument();
  });

  it('filters resources based on completion status', () => {
    render(<ResourceList resourceType="articles" />);

    const filterSelect = screen.getByLabelText(/Filter by status/i);
    fireEvent.change(filterSelect, { target: { value: 'completed' } });

    expect(screen.queryByText('Introduction to Machine Learning')).not.toBeInTheDocument();
    expect(screen.getByText('Advanced Neural Networks')).toBeInTheDocument();
  });
});