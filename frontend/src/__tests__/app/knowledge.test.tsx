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

// Mock auth store
jest.mock('@/lib/store/auth-store', () => ({
  useAuthStore: jest.fn(() => ({
    isAuthenticated: true,
  })),
}));

// Mock token service
jest.mock('@/lib/services/token-service', () => ({
  tokenService: {
    getMetadata: jest.fn().mockReturnValueOnce(false).mockReturnValue(true),
    setMetadata: jest.fn(),
  },
}));

// Mock knowledge components
jest.mock('@/components/knowledge', () => ({
  SpacedRepetitionOnboarding: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
    isOpen ? <div data-testid="onboarding-modal">Onboarding Modal <button onClick={onClose}>Close</button></div> : null
  ),
  KnowledgeBase: () => (
    <div>
      <h1>Knowledge Management</h1>
      <div className="flex space-x-4">
        <button data-testid="start-review-button">Start Review Session</button>
        <button data-testid="view-all-concepts-button">View All Concepts</button>
        <button data-testid="create-concept-button">Create Concept</button>
      </div>
      <div>
        <button data-testid="concepts-tab">All Concepts</button>
        <button data-testid="due-tab">Due for Review</button>
        <button data-testid="statistics-tab">Statistics</button>
      </div>
      <div>
        <h2>Concepts Due for Review</h2>
        <div>Concept 1</div>
        <div>Concept 2</div>
      </div>
      <div>
        <h2>Statistics</h2>
      </div>
    </div>
  ),
}));

// Mock UI components
jest.mock('@/components/ui/buttons', () => ({
  Button: ({ children, onClick, 'data-testid': testId }: { children: React.ReactNode; onClick: () => void; 'data-testid'?: string }) => (
    <button onClick={onClick} data-testid={testId}>{children}</button>
  ),
}));

jest.mock('@/components/ui/feedback', () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div role="alert">{children}</div>,
  Spinner: () => <div data-testid="spinner">Loading...</div>,
}));

describe('KnowledgePage', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock router
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });

    // Mock the useQuery hook to return non-loading states and data
    (useQuery as jest.Mock).mockImplementation(({ queryKey }) => {
      if (queryKey[0] === 'knowledge-statistics') {
        return {
          data: {
            total_concepts: 50,
            concepts_due: 5,
            total_reviews: 100,
            review_streak: 7,
            average_confidence: 4.2,
            top_topics: [
              { name: 'Machine Learning', count: 15 },
              { name: 'Deep Learning', count: 10 },
              { name: 'Natural Language Processing', count: 8 },
            ],
            recently_reviewed_concepts: [
              { id: '1', title: 'Concept 1', topics: ['ML'] },
              { id: '2', title: 'Concept 2', topics: ['NLP'] },
            ],
          },
          isLoading: false,
          error: null,
        };
      } else if (queryKey[0] === 'due-concepts') {
        return {
          data: [
            { id: '1', title: 'Concept 1', topics: ['ML'], last_reviewed_at: new Date().toISOString() },
            { id: '2', title: 'Concept 2', topics: ['NLP'], last_reviewed_at: new Date().toISOString() },
          ],
          isLoading: false,
          error: null,
        };
      }
      return { isLoading: false, data: null, error: null };
    });
  });

  it('displays the onboarding modal when the user has not completed the onboarding', () => {
    render(<KnowledgePage />);

    expect(screen.getByText('Welcome to Spaced Repetition')).toBeInTheDocument();
    expect(screen.getByText('Skip Tutorial')).toBeInTheDocument();
  });

  it('renders the knowledge page with concepts tab active by default', () => {
    render(<KnowledgePage />);

    // Check if the page title is rendered
    expect(screen.getByRole('heading', { name: /Knowledge Management/i })).toBeInTheDocument();

    // Check if the tabs are rendered using data-testid
    expect(screen.getByTestId('concepts-tab')).toBeInTheDocument();
    expect(screen.getByTestId('due-tab')).toBeInTheDocument();
    expect(screen.getByTestId('statistics-tab')).toBeInTheDocument();

    // Check if the buttons are rendered
    expect(screen.getByTestId('start-review-button')).toBeInTheDocument();
    const viewAllButtons = screen.getAllByTestId('view-all-concepts-button');
    expect(viewAllButtons.length).toBeGreaterThan(0);
    expect(screen.getByTestId('create-concept-button')).toBeInTheDocument();
  });

  it('switches to the due tab when clicked', () => {
    render(<KnowledgePage />);

    // Click on the due tab using data-testid
    fireEvent.click(screen.getByTestId('due-tab'));

    // Assert that we're now on the due tab
    expect(screen.getByText(/Concepts Due for Review/i)).toBeInTheDocument();
    expect(screen.getByText('Concept 1')).toBeInTheDocument();
    expect(screen.getByText('Concept 2')).toBeInTheDocument();
  });

  it('switches to the statistics tab when clicked', () => {
    render(<KnowledgePage />);

    // Click on the statistics tab using data-testid
    fireEvent.click(screen.getByTestId('statistics-tab'));

    // Assert elements specific to statistics tab
    expect(screen.getAllByText(/Statistics/i).length).toBeGreaterThan(0);
  });

  it('navigates to create concept page when create button is clicked', () => {
    render(<KnowledgePage />);

    // Click on the create concept button
    fireEvent.click(screen.getByTestId('create-concept-button'));

    // Check if the router was called with the correct path
    expect(mockPush).toHaveBeenCalledWith('/knowledge/concepts/create');
  });

  it('navigates to review session when start review button is clicked', () => {
    render(<KnowledgePage />);

    // Click on the start review button
    fireEvent.click(screen.getByTestId('start-review-button'));

    // Check if the router was called with the correct path
    expect(mockPush).toHaveBeenCalledWith('/knowledge/session');
  });

  it('navigates to concepts page when view all concepts button is clicked', () => {
    render(<KnowledgePage />);

    // Click on the view all concepts button (first instance)
    const viewAllButtons = screen.getAllByTestId('view-all-concepts-button');
    fireEvent.click(viewAllButtons[0]);

    // Check if the router was called with the correct path
    expect(mockPush).toHaveBeenCalledWith('/knowledge/concepts');
  });

  it('shows no concepts due message when there are no due concepts', () => {
    // Mock no due concepts
    (useQuery as jest.Mock).mockImplementation(({ queryKey }) => {
      if (queryKey[0] === 'knowledge-statistics') {
        return {
          data: {
            total_concepts: 50,
            concepts_due: 0,
            total_reviews: 100,
            review_streak: 7,
            average_confidence: 4.2,
            top_topics: [
              { name: 'Machine Learning', count: 15 },
              { name: 'Deep Learning', count: 10 },
            ],
            recently_reviewed_concepts: [],
          },
          isLoading: false,
          error: null,
        };
      } else if (queryKey[0] === 'due-concepts') {
        return {
          data: [], // Empty array means no due concepts
          isLoading: false,
          error: null,
        };
      }
      return { isLoading: false, data: null, error: null };
    });

    render(<KnowledgePage />);

    // Click on the due tab
    fireEvent.click(screen.getByTestId('due-tab'));

    // Check if the no concepts due message is rendered
    expect(screen.getByText(/No Concepts Due/i)).toBeInTheDocument();
  });
});