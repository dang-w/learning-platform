import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import KnowledgePage from '@/app/knowledge/page';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { expect } from '@jest/globals';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock React Query
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

// Mock UI components
jest.mock('@/components/ui/buttons', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

jest.mock('@/components/ui/feedback', () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div role="alert">{children}</div>,
}));

describe('KnowledgePage', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock router
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });

    // Mock default query responses
    (useQuery as jest.Mock).mockImplementation(({ queryKey }) => {
      if (queryKey[0] === 'knowledge' && queryKey[1] === 'statistics') {
        return {
          data: {
            total_concepts: 50,
            concepts_due: 5,
            review_streak: 7,
            average_confidence: 4.2,
            concepts_by_confidence: {
              1: 5,
              2: 10,
              3: 15,
              4: 10,
              5: 10,
            },
            concepts_by_topic: {
              'Machine Learning': 15,
              'Deep Learning': 10,
              'Natural Language Processing': 8,
              'Computer Vision': 7,
              'Reinforcement Learning': 5,
              'Statistics': 5,
            },
          },
          isLoading: false,
        };
      } else if (queryKey[0] === 'knowledge' && queryKey[1] === 'due') {
        return {
          data: [
            { id: '1', title: 'Concept 1' },
            { id: '2', title: 'Concept 2' },
            { id: '3', title: 'Concept 3' },
            { id: '4', title: 'Concept 4' },
            { id: '5', title: 'Concept 5' },
          ],
          isLoading: false,
        };
      }
      return { isLoading: true };
    });
  });

  it('renders the knowledge page with concepts tab active by default', () => {
    render(<KnowledgePage />);

    // Check if the page title is rendered
    expect(screen.getByRole('heading', { name: /Knowledge Management/i })).toBeInTheDocument();

    // Check if the tabs are rendered - use more specific selectors
    const tabButtons = screen.getAllByRole('button');
    const conceptsTab = tabButtons.find(button => button.textContent?.match(/^Concepts$/));
    const dueTab = tabButtons.find(button => button.textContent?.match(/Due for Review/));
    const statsTab = tabButtons.find(button => button.textContent?.match(/^Statistics$/));

    expect(conceptsTab).toBeInTheDocument();
    expect(dueTab).toBeInTheDocument();
    expect(statsTab).toBeInTheDocument();

    // Check if the concepts tab content is rendered
    expect(screen.getByText(/Your Knowledge Base/i)).toBeInTheDocument();
    expect(screen.getByText(/Popular Topics/i)).toBeInTheDocument();

    // Check if the create concept button is rendered
    const createButton = screen.getByRole('button', { name: /^Create Concept$/i });
    expect(createButton).toBeInTheDocument();

    // Check if the start review button is rendered with the correct count
    const startReviewButton = screen.getByRole('button', { name: /Start Review \(5\)/i });
    expect(startReviewButton).toBeInTheDocument();
  });

  it('switches to the due tab when clicked', () => {
    render(<KnowledgePage />);

    // Click on the due tab - use more specific selector
    const tabButtons = screen.getAllByRole('button');
    const dueTab = tabButtons.find(button => button.textContent?.match(/Due for Review/));
    fireEvent.click(dueTab!);

    // Check if the due tab content is rendered - use more specific selectors
    const dueHeading = screen.getByRole('heading', { name: /Concepts Due for Review/i });
    expect(dueHeading).toBeInTheDocument();

    // Use a more specific selector for the text
    const dueParagraph = screen.getByText(text =>
      text.includes('concepts due for review') && text.includes('Start a review session')
    );
    expect(dueParagraph).toBeInTheDocument();

    const startSessionButton = screen.getByRole('button', { name: /Start Review Session/i });
    expect(startSessionButton).toBeInTheDocument();
  });

  it('switches to the statistics tab when clicked', () => {
    render(<KnowledgePage />);

    // Click on the statistics tab - use more specific selector
    const tabButtons = screen.getAllByRole('button');
    const statsTab = tabButtons.find(button => button.textContent?.match(/^Statistics$/));
    fireEvent.click(statsTab!);

    // Check if the statistics tab content is rendered
    const overviewHeading = screen.getByRole('heading', { name: /Overview/i });
    expect(overviewHeading).toBeInTheDocument();

    const confidenceLevelsHeading = screen.getByRole('heading', { name: /Confidence Levels/i });
    expect(confidenceLevelsHeading).toBeInTheDocument();

    // Check if the statistics are rendered - use more specific selectors
    const totalConceptsLabel = screen.getByText(/^Total Concepts$/i);
    expect(totalConceptsLabel).toBeInTheDocument();

    const totalConceptsValue = screen.getByText(/^50$/);
    expect(totalConceptsValue).toBeInTheDocument();

    const dueForReviewLabel = screen.getAllByText(/Due for Review/i)[1]; // Get the second occurrence
    expect(dueForReviewLabel).toBeInTheDocument();

    const dueForReviewValue = screen.getAllByText(/^5$/)[0]; // Get the first occurrence
    expect(dueForReviewValue).toBeInTheDocument();

    const reviewStreakLabel = screen.getByText(/^Review Streak$/i);
    expect(reviewStreakLabel).toBeInTheDocument();

    const reviewStreakValue = screen.getByText(/7 days/i);
    expect(reviewStreakValue).toBeInTheDocument();

    const avgConfidenceLabel = screen.getByText(/Avg. Confidence/i);
    expect(avgConfidenceLabel).toBeInTheDocument();

    const avgConfidenceValue = screen.getByText(/4.2\/5/i);
    expect(avgConfidenceValue).toBeInTheDocument();
  });

  it('navigates to create concept page when create button is clicked', () => {
    render(<KnowledgePage />);

    // Click on the create concept button
    fireEvent.click(screen.getByRole('button', { name: /Create Concept/i }));

    // Check if the router was called with the correct path
    expect(mockPush).toHaveBeenCalledWith('/knowledge/concepts/create');
  });

  it('navigates to review session when start review button is clicked', () => {
    render(<KnowledgePage />);

    // Click on the start review button
    fireEvent.click(screen.getByRole('button', { name: /Start Review \(5\)/i }));

    // Check if the router was called with the correct path
    expect(mockPush).toHaveBeenCalledWith('/knowledge/session');
  });

  it('navigates to concepts page when view all concepts button is clicked', () => {
    render(<KnowledgePage />);

    // Click on the view all concepts button
    fireEvent.click(screen.getByRole('button', { name: /View All Concepts/i }));

    // Check if the router was called with the correct path
    expect(mockPush).toHaveBeenCalledWith('/knowledge/concepts');
  });

  it('shows no concepts due message when there are no due concepts', () => {
    // Mock no due concepts
    (useQuery as jest.Mock).mockImplementation(({ queryKey }) => {
      if (queryKey[0] === 'knowledge' && queryKey[1] === 'statistics') {
        return {
          data: {
            total_concepts: 50,
            concepts_due: 0,
            review_streak: 7,
            average_confidence: 4.2,
            concepts_by_confidence: {
              1: 5,
              2: 10,
              3: 15,
              4: 10,
              5: 10,
            },
            concepts_by_topic: {
              'Machine Learning': 15,
              'Deep Learning': 10,
              'Natural Language Processing': 8,
              'Computer Vision': 7,
              'Reinforcement Learning': 5,
              'Statistics': 5,
            },
          },
          isLoading: false,
        };
      } else if (queryKey[0] === 'knowledge' && queryKey[1] === 'due') {
        return {
          data: [],
          isLoading: false,
        };
      }
      return { isLoading: true };
    });

    render(<KnowledgePage />);

    // Click on the due tab
    fireEvent.click(screen.getByRole('button', { name: /Due for Review/i }));

    // Check if the no concepts due message is rendered
    expect(screen.getByText(/No Concepts Due/i)).toBeInTheDocument();
    expect(screen.getByText(/You don't have any concepts due for review/i)).toBeInTheDocument();
  });
});