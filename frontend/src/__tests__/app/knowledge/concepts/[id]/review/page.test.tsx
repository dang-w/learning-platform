import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import '@testing-library/jest-dom';
import ConceptReviewPage from '@/app/knowledge/concepts/[id]/review/page';
import { knowledgeApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { expect } from '@jest/globals';

// Mock the knowledgeApi
jest.mock('@/lib/api', () => ({
  knowledgeApi: {
    getConcept: jest.fn(),
    getConceptReviewHistory: jest.fn(),
    reviewConcept: jest.fn(),
  },
}));

// Mock the useRouter hook
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock ReactMarkdown component
jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }: { children: string }) => <div data-testid="markdown">{children}</div>,
}));

// Helper function for type assertion
const expectElement = (element: HTMLElement) => ({
  toHaveClass: (className: string) => expect(element.classList.contains(className)).toBe(true),
});

describe('ConceptReviewPage', () => {
  const mockRouter = {
    push: jest.fn(),
    refresh: jest.fn(),
  };

  const mockConcept = {
    id: '123',
    title: 'Test Concept',
    content: 'This is test content',
    topics: ['AI', 'Machine Learning'],
    difficulty: 'intermediate',
    created_at: '2025-03-20T12:00:00Z',
    updated_at: '2025-03-20T12:00:00Z',
  };

  const mockReviews = [
    {
      id: '1',
      concept_id: '123',
      confidence_level: 1, // Very Hard (danger)
      notes: 'This was very difficult',
      created_at: '2025-03-19T12:00:00Z',
    },
    {
      id: '2',
      concept_id: '123',
      confidence_level: 3, // Medium (warning)
      notes: 'Getting better',
      created_at: '2025-03-20T12:00:00Z',
    },
    {
      id: '3',
      concept_id: '123',
      confidence_level: 5, // Very Easy (success)
      notes: 'Now I understand it',
      created_at: '2025-03-21T12:00:00Z',
    },
    {
      id: '4',
      concept_id: '123',
      confidence_level: null, // Missing confidence level (default)
      notes: '',
      created_at: '2025-03-22T12:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (knowledgeApi.getConcept as jest.Mock).mockResolvedValue(mockConcept);
    (knowledgeApi.getConceptReviewHistory as jest.Mock).mockResolvedValue(mockReviews);
    (knowledgeApi.reviewConcept as jest.Mock).mockResolvedValue({
      id: 'new-review',
      concept_id: '123',
      confidence_level: 4,
      notes: 'Test notes',
      created_at: '2025-03-22T12:00:00Z',
    });
  });

  it('displays loading state initially', () => {
    render(<ConceptReviewPage params={{ id: '123' }} />);
    expect(screen.getByTestId('loading-spinner')).toBeTruthy();
  });

  it('displays concept information and review history when loaded', async () => {
    await act(async () => {
      render(<ConceptReviewPage params={{ id: '123' }} />);
    });

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).toBeFalsy();
    });

    // Check concept information is displayed
    expect(screen.getByTestId('concept-title').textContent).toBe('Test Concept');
    expect(screen.getAllByTestId('topic-badge').length).toBe(2);
    expect(screen.getByTestId('concept-question')).toBeTruthy();

    // Check review history is displayed with correct badge variants
    expect(screen.getByTestId('review-history')).toBeTruthy();

    const confidenceBadges = screen.getAllByTestId('confidence-badge');
    expect(confidenceBadges.length).toBe(4);

    // Check each badge has the correct class based on confidence level
    expectElement(confidenceBadges[0]).toHaveClass('bg-red-100'); // danger variant (confidence level 1)
    expectElement(confidenceBadges[1]).toHaveClass('bg-yellow-100'); // warning variant (confidence level 3)
    expectElement(confidenceBadges[2]).toHaveClass('bg-green-100'); // success variant (confidence level 5)
    expectElement(confidenceBadges[3]).toHaveClass('bg-indigo-100'); // default variant (null confidence)

    // Check badge text
    expect(confidenceBadges[0].textContent).toBe('Very Hard');
    expect(confidenceBadges[1].textContent).toBe('Medium');
    expect(confidenceBadges[2].textContent).toBe('Very Easy');
    expect(confidenceBadges[3].textContent).toBe('Unknown');
  });

  it('allows user to submit a review', async () => {
    await act(async () => {
      render(<ConceptReviewPage params={{ id: '123' }} />);
    });

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).toBeFalsy();
    });

    // Show answer
    fireEvent.click(screen.getByTestId('show-answer-button'));

    // Select confidence level
    fireEvent.click(screen.getByTestId('confidence-level-4'));

    // Add notes
    fireEvent.change(screen.getByTestId('review-notes'), {
      target: { value: 'Test notes' },
    });

    // Submit review
    fireEvent.click(screen.getByTestId('submit-review-button'));

    await waitFor(() => {
      expect(knowledgeApi.reviewConcept).toHaveBeenCalledWith({
        concept_id: '123',
        confidence_level: 4,
        notes: 'Test notes',
      });
    });

    // Should display success message
    expect(screen.getByTestId('review-success')).toBeTruthy();
  });

  it('handles API errors gracefully', async () => {
    // Mock the API to throw an error
    (knowledgeApi.getConcept as jest.Mock).mockRejectedValue(new Error('API error'));

    await act(async () => {
      render(<ConceptReviewPage params={{ id: '123' }} />);
    });

    // Wait for error to display
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy();
    });

    // Should have retry button
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
  });
});