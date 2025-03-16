import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ReviewForm } from '@/components/reviews';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect } from '@jest/globals';
import * as reviewsApi from '@/lib/api/reviews';

// Mock the API client
jest.mock('@/lib/api/reviews', () => ({
  markConceptReviewed: jest.fn().mockResolvedValue({ id: '1', title: 'Test Concept' })
}));

// Type the mocked API
const mockedApi = reviewsApi as unknown as {
  markConceptReviewed: jest.Mock;
};

describe('ReviewForm Component', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const mockConcept = {
    id: '1',
    title: 'React Hooks',
    content: 'React Hooks are functions that let you use state and other React features without writing a class.',
    topics: ['React', 'JavaScript'],
    reviews: [],
    next_review: null
  };

  const renderWithQueryClient = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it('renders the form with concept details', () => {
    renderWithQueryClient(
      <ReviewForm
        concept={mockConcept}
        onReviewSubmitted={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(screen.getByText(`Review: ${mockConcept.title}`)).toBeInTheDocument();
    expect(screen.getByText(mockConcept.content)).toBeInTheDocument();
    expect(screen.getByText('How well do you know this concept?')).toBeInTheDocument();

    // Check confidence level options
    expect(screen.getByLabelText('1 - Not at all')).toBeInTheDocument();
    expect(screen.getByLabelText('2 - Barely')).toBeInTheDocument();
    expect(screen.getByLabelText('3 - Somewhat')).toBeInTheDocument();
    expect(screen.getByLabelText('4 - Well')).toBeInTheDocument();
    expect(screen.getByLabelText('5 - Very well')).toBeInTheDocument();

    // Check buttons
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit Review/i })).toBeInTheDocument();
  });

  it('submits the form with selected confidence level', async () => {
    const mockOnReviewSubmitted = jest.fn();

    renderWithQueryClient(
      <ReviewForm
        concept={mockConcept}
        onReviewSubmitted={mockOnReviewSubmitted}
        onCancel={jest.fn()}
      />
    );

    // Select confidence level
    fireEvent.click(screen.getByLabelText('4 - Well'));

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /Submit Review/i }));

    await waitFor(() => {
      expect(mockedApi.markConceptReviewed).toHaveBeenCalledWith('1', { confidence: 4 });
      expect(mockOnReviewSubmitted).toHaveBeenCalled();
    });
  });

  it('calls onCancel when cancel button is clicked', () => {
    const mockOnCancel = jest.fn();

    renderWithQueryClient(
      <ReviewForm
        concept={mockConcept}
        onReviewSubmitted={jest.fn()}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('shows validation error when trying to submit without selecting confidence', async () => {
    renderWithQueryClient(
      <ReviewForm
        concept={mockConcept}
        onReviewSubmitted={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    // Submit without selecting confidence
    fireEvent.click(screen.getByRole('button', { name: /Submit Review/i }));

    await waitFor(() => {
      expect(screen.getByText('Please select a confidence level')).toBeInTheDocument();
    });
  });
});