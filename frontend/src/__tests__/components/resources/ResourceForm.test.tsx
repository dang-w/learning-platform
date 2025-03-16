import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ResourceForm } from '@/components/resources/ResourceForm';
import { useResourceStore } from '@/lib/store/resource-store';
import { useUrlMetadata } from '@/lib/hooks/useUrlMetadata';
import { DifficultyLevel } from '@/types/resources';

// Mock the stores and hooks
jest.mock('@/lib/store/resource-store');
jest.mock('@/lib/hooks/useUrlMetadata');

describe('ResourceForm Component', () => {
  const mockAddResource = jest.fn();
  const mockUpdateResource = jest.fn();
  const mockExtractMetadata = jest.fn();
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Cast to unknown first, then to jest.Mock
    ((useResourceStore as unknown) as jest.Mock).mockReturnValue({
      addResource: mockAddResource,
      updateResource: mockUpdateResource,
    });

    ((useUrlMetadata as unknown) as jest.Mock).mockReturnValue({
      extractMetadata: mockExtractMetadata,
      isLoading: false,
      metadata: null,
    });
  });

  it('renders the form correctly for new resource', () => {
    render(<ResourceForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    expect(screen.getByText(/Create Resource/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/URL/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Topics/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Difficulty/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Estimated Time/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Resource/i })).toBeInTheDocument();
  });

  it('renders the form correctly for editing resource', () => {
    const existingResource = {
      id: '123',
      title: 'Test Resource',
      url: 'https://example.com',
      topics: ['AI', 'ML'],
      difficulty: 'beginner' as DifficultyLevel,
      estimated_time: 60,
      completed: false,
      date_added: '2023-03-15T10:30:00',
      completion_date: null,
      notes: 'Test notes'
    };

    render(<ResourceForm resource={existingResource} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    expect(screen.getByText(/Update Resource/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Title/i)).toHaveValue('Test Resource');
    expect(screen.getByLabelText(/URL/i)).toHaveValue('https://example.com');
    expect(screen.getByLabelText(/Difficulty/i)).toHaveValue('beginner');
    expect(screen.getByLabelText(/Estimated Time/i)).toHaveValue('60');
  });

  it('calls onSubmit when submitting a new resource', async () => {
    render(<ResourceForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'New Article' } });
    fireEvent.change(screen.getByLabelText(/URL/i), { target: { value: 'https://example.com/new' } });
    fireEvent.change(screen.getByLabelText(/Topics/i), { target: { value: 'AI, ML' } });
    fireEvent.change(screen.getByLabelText(/Difficulty/i), { target: { value: 'beginner' } });
    fireEvent.change(screen.getByLabelText(/Estimated Time/i), { target: { value: '30' } });

    fireEvent.click(screen.getByRole('button', { name: /Create Resource/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        title: 'New Article',
        url: 'https://example.com/new',
        topics: ['AI', 'ML'],
        difficulty: 'beginner',
        estimated_time: 30,
      });
    });
  });

  it('calls onSubmit when editing an existing resource', async () => {
    const existingResource = {
      id: '123',
      title: 'Test Resource',
      url: 'https://example.com',
      topics: ['AI', 'ML'],
      difficulty: 'beginner' as DifficultyLevel,
      estimated_time: 60,
      completed: false,
      date_added: '2023-03-15T10:30:00',
      completion_date: null,
      notes: 'Test notes'
    };

    render(<ResourceForm resource={existingResource} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'Updated Article' } });
    fireEvent.click(screen.getByRole('button', { name: /Update Resource/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Updated Article',
      }));
    });
  });

  it('extracts metadata when URL is entered and extract button is clicked', async () => {
    render(<ResourceForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    fireEvent.change(screen.getByLabelText(/URL/i), { target: { value: 'https://example.com/article' } });
    fireEvent.click(screen.getByRole('button', { name: /Extract Metadata/i }));

    await waitFor(() => {
      expect(mockExtractMetadata).toHaveBeenCalledWith('https://example.com/article');
    });
  });

  it('populates form with extracted metadata', async () => {
    ((useUrlMetadata as unknown) as jest.Mock).mockReturnValue({
      extractMetadata: mockExtractMetadata,
      isLoading: false,
      metadata: {
        title: 'Extracted Title',
        topics: ['AI', 'Neural Networks'],
        estimated_time: 45
      },
    });

    render(<ResourceForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    fireEvent.change(screen.getByLabelText(/URL/i), { target: { value: 'https://example.com/article' } });
    fireEvent.click(screen.getByRole('button', { name: /Extract Metadata/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/Title/i)).toHaveValue('Extracted Title');
    });
  });
});