import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ReviewSession } from '@/components/reviews';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import reviewsApi from '@/lib/api/reviews';
import { expect } from '@jest/globals';

// Mock the API client
jest.mock('@/lib/api/reviews', () => ({
  generateReviewSession: jest.fn(),
  markConceptReviewed: jest.fn()
}));

describe('ReviewSession Component', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const mockSession = {
    date: new Date().toISOString(),
    concepts: [
      {
        id: '1',
        title: 'React Hooks',
        content: 'React Hooks are functions that let you use state and other React features without writing a class.',
        topics: ['React', 'JavaScript'],
        reviews: [],
        next_review: null
      },
      {
        id: '2',
        title: 'TypeScript Interfaces',
        content: 'Interfaces in TypeScript provide a way to define the shape of an object.',
        topics: ['TypeScript'],
        reviews: [],
        next_review: null
      }
    ],
    new_concepts: [
      {
        id: '3',
        title: 'Next.js API Routes',
        content: 'Next.js API Routes provide a solution to build your API with Next.js.',
        topics: ['Next.js', 'API'],
        reviews: [],
        next_review: null
      }
    ]
  };

  const renderWithQueryClient = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
    (reviewsApi.generateReviewSession as jest.Mock).mockResolvedValue(mockSession);
  });

  it('renders loading state initially', () => {
    renderWithQueryClient(<ReviewSession maxReviews={5} onComplete={jest.fn()} />);

    expect(screen.getByText('Loading review session...')).toBeInTheDocument();
  });

  it('fetches and displays review session data', async () => {
    renderWithQueryClient(<ReviewSession maxReviews={5} onComplete={jest.fn()} />);

    await waitFor(() => {
      expect(reviewsApi.generateReviewSession).toHaveBeenCalledWith(5);
    });

    expect(await screen.findByText('Review Session')).toBeInTheDocument();
    expect(screen.getByText('1 of 3')).toBeInTheDocument(); // Progress indicator

    // Find the heading that contains the concept title
    const headingElements = screen.getAllByRole('heading');
    const conceptHeading = headingElements.find(el => el.textContent?.includes('React Hooks'));
    expect(conceptHeading).toBeInTheDocument();
  });

  it('navigates through concepts when submitting reviews', async () => {
    renderWithQueryClient(<ReviewSession maxReviews={5} onComplete={jest.fn()} />);

    // Wait for the session to load
    await waitFor(() => {
      expect(screen.queryByText('Loading review session...')).not.toBeInTheDocument();
    });

    // First concept should be displayed
    const headingElements = screen.getAllByRole('heading');
    const firstConceptHeading = headingElements.find(el => el.textContent?.includes('React Hooks'));
    expect(firstConceptHeading).toBeInTheDocument();

    // Select a confidence level and submit
    fireEvent.click(screen.getByLabelText('4 - Well'));
    fireEvent.click(screen.getByRole('button', { name: /Submit Review/i }));

    // Should move to the second concept
    await waitFor(() => {
      const headings = screen.getAllByRole('heading');
      const secondConceptHeading = headings.find(el => el.textContent?.includes('TypeScript Interfaces'));
      expect(secondConceptHeading).toBeInTheDocument();
      expect(screen.getByText('2 of 3')).toBeInTheDocument(); // Updated progress
    });

    // Review the second concept
    fireEvent.click(screen.getByLabelText('3 - Somewhat'));
    fireEvent.click(screen.getByRole('button', { name: /Submit Review/i }));

    // Should move to the third concept
    await waitFor(() => {
      const headings = screen.getAllByRole('heading');
      const thirdConceptHeading = headings.find(el => el.textContent?.includes('Next.js API Routes'));
      expect(thirdConceptHeading).toBeInTheDocument();
      expect(screen.getByText('3 of 3')).toBeInTheDocument(); // Updated progress
    });
  });

  it('calls onComplete when all concepts are reviewed', async () => {
    const mockOnComplete = jest.fn();
    renderWithQueryClient(<ReviewSession maxReviews={5} onComplete={mockOnComplete} />);

    // Wait for the session to load
    await waitFor(() => {
      expect(screen.queryByText('Loading review session...')).not.toBeInTheDocument();
    });

    // Review all three concepts
    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getByLabelText('4 - Well'));
      fireEvent.click(screen.getByRole('button', { name: /Submit Review/i }));

      if (i < 2) {
        await waitFor(() => {
          expect(screen.getByText(`${i + 2} of 3`)).toBeInTheDocument();
        });
      }
    }

    // After the last concept, onComplete should be called
    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalled();
    });
  });

  it('displays session summary when completed', async () => {
    renderWithQueryClient(<ReviewSession maxReviews={5} onComplete={jest.fn()} />);

    // Wait for the session to load
    await waitFor(() => {
      expect(screen.queryByText('Loading review session...')).not.toBeInTheDocument();
    });

    // Review all three concepts
    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getByLabelText('4 - Well'));
      fireEvent.click(screen.getByRole('button', { name: /Submit Review/i }));

      if (i < 2) {
        await waitFor(() => {
          expect(screen.getByText(`${i + 2} of 3`)).toBeInTheDocument();
        });
      }
    }

    // Should show session summary
    await waitFor(() => {
      expect(screen.getByText('Session Complete!')).toBeInTheDocument();
      expect(screen.getByText('You reviewed 3 concepts')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Return to Dashboard/i })).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    (reviewsApi.generateReviewSession as jest.Mock).mockRejectedValue(new Error('API Error'));

    renderWithQueryClient(<ReviewSession maxReviews={5} onComplete={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Error loading review session')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument();
    });

    // Click try again button
    fireEvent.click(screen.getByRole('button', { name: /Try Again/i }));

    // Should try to load the session again
    expect(reviewsApi.generateReviewSession).toHaveBeenCalledTimes(2);
  });
});