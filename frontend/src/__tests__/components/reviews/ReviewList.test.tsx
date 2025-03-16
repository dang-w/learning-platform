import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ReviewList } from '@/components/reviews';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import reviewsApi from '@/lib/api/reviews';
import { expect } from '@jest/globals';
// Mock the API client
jest.mock('@/lib/api/reviews', () => ({
  getDueConcepts: jest.fn(),
  getNewConcepts: jest.fn()
}));

describe('ReviewList Component', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const mockDueConcepts = [
    {
      id: '1',
      title: 'React Hooks',
      content: 'React Hooks are functions that let you use state and other React features without writing a class.',
      topics: ['React', 'JavaScript'],
      reviews: [
        { date: '2023-02-15', confidence: 3 }
      ],
      next_review: '2023-03-15'
    },
    {
      id: '2',
      title: 'TypeScript Interfaces',
      content: 'Interfaces in TypeScript provide a way to define the shape of an object.',
      topics: ['TypeScript'],
      reviews: [
        { date: '2023-02-20', confidence: 2 }
      ],
      next_review: '2023-03-16'
    }
  ];

  const mockNewConcepts = [
    {
      id: '3',
      title: 'Next.js API Routes',
      content: 'Next.js API Routes provide a solution to build your API with Next.js.',
      topics: ['Next.js', 'API'],
      reviews: [],
      next_review: null
    }
  ];

  const renderWithQueryClient = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
    (reviewsApi.getDueConcepts as jest.Mock).mockResolvedValue(mockDueConcepts);
    (reviewsApi.getNewConcepts as jest.Mock).mockResolvedValue(mockNewConcepts);
  });

  it('renders loading state initially', () => {
    renderWithQueryClient(<ReviewList onStartReview={jest.fn()} />);

    expect(screen.getByText('Loading concepts...')).toBeInTheDocument();
  });

  it('fetches and displays due concepts', async () => {
    renderWithQueryClient(<ReviewList onStartReview={jest.fn()} />);

    await waitFor(() => {
      expect(reviewsApi.getDueConcepts).toHaveBeenCalled();
    });

    expect(await screen.findByText('Concepts Due for Review')).toBeInTheDocument();
    expect(screen.getByText('React Hooks')).toBeInTheDocument();
    expect(screen.getByText('TypeScript Interfaces')).toBeInTheDocument();
  });

  it('displays new concepts section', async () => {
    renderWithQueryClient(<ReviewList onStartReview={jest.fn()} />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText('Loading concepts...')).not.toBeInTheDocument();
    });

    // Verify the New Concepts tab exists
    expect(screen.getByRole('tab', { name: /New Concepts/i })).toBeInTheDocument();

    // Verify the due concepts are displayed
    expect(screen.getByText('React Hooks')).toBeInTheDocument();
    expect(screen.getByText('TypeScript Interfaces')).toBeInTheDocument();
  });

  it('calls onStartReview when start review button is clicked', async () => {
    const mockOnStartReview = jest.fn();
    renderWithQueryClient(<ReviewList onStartReview={mockOnStartReview} />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText('Loading concepts...')).not.toBeInTheDocument();
    });

    // Click start review button
    fireEvent.click(screen.getByRole('button', { name: /Start Review/i }));

    // Should call onStartReview with due concepts
    expect(mockOnStartReview).toHaveBeenCalledWith(mockDueConcepts);
  });

  it('displays concept details when a concept is clicked', async () => {
    renderWithQueryClient(<ReviewList onStartReview={jest.fn()} />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText('Loading concepts...')).not.toBeInTheDocument();
    });

    // Click on a concept
    fireEvent.click(screen.getByText('React Hooks'));

    // Should display concept details
    expect(screen.getByText('React Hooks are functions that let you use state and other React features without writing a class.')).toBeInTheDocument();
    expect(screen.getByText('Topics: React, JavaScript')).toBeInTheDocument();
    expect(screen.getByText('Last reviewed: Feb 15, 2023')).toBeInTheDocument();
    expect(screen.getByText('Confidence: 3/5')).toBeInTheDocument();
  });

  it('handles empty due concepts list', async () => {
    (reviewsApi.getDueConcepts as jest.Mock).mockResolvedValue([]);

    renderWithQueryClient(<ReviewList onStartReview={jest.fn()} />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText('Loading concepts...')).not.toBeInTheDocument();
    });

    // Should display empty state message
    expect(screen.getByText("You don't have any concepts due for review")).toBeInTheDocument();
  });

  it('handles empty new concepts list', async () => {
    (reviewsApi.getNewConcepts as jest.Mock).mockResolvedValue([]);

    renderWithQueryClient(<ReviewList onStartReview={jest.fn()} />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText('Loading concepts...')).not.toBeInTheDocument();
    });

    // Verify the New Concepts tab exists
    expect(screen.getByRole('tab', { name: /New Concepts/i })).toBeInTheDocument();

    // Verify the due concepts are displayed
    expect(screen.getByText('React Hooks')).toBeInTheDocument();
    expect(screen.getByText('TypeScript Interfaces')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    (reviewsApi.getDueConcepts as jest.Mock).mockRejectedValue(new Error('API Error'));

    renderWithQueryClient(<ReviewList onStartReview={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Error loading concepts')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument();
    });

    // Click try again button
    fireEvent.click(screen.getByRole('button', { name: /Try Again/i }));

    // Should try to load the concepts again
    expect(reviewsApi.getDueConcepts).toHaveBeenCalledTimes(2);
  });
});