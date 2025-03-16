import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DashboardPage from '@/app/dashboard/page';
import { useAuthStore } from '@/lib/store/auth-store';
import { useQuery } from '@tanstack/react-query';
import { expect } from '@jest/globals';

// Mock the auth store
jest.mock('@/lib/store/auth-store', () => ({
  useAuthStore: jest.fn(),
}));

// Mock React Query
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

// Mock API modules
jest.mock('@/lib/api', () => ({
  resourcesApi: {
    getResourceStatistics: jest.fn(),
  },
  progressApi: {
    getRecentMetricsSummary: jest.fn(),
  },
  reviewsApi: {
    getReviewStatistics: jest.fn(),
  },
  learningPathApi: {
    getLearningPathProgress: jest.fn(),
  },
}));

// Mock dashboard components
jest.mock('@/components/dashboard', () => ({
  LearningProgress: () => <div data-testid="learning-progress">Learning Progress</div>,
  ActivityFeed: () => <div data-testid="activity-feed">Activity Feed</div>,
  QuickActions: () => <div data-testid="quick-actions">Quick Actions</div>,
  ResourceStats: () => <div data-testid="resource-stats">Resource Stats</div>,
  StudyMetrics: () => <div data-testid="study-metrics">Study Metrics</div>,
  ReviewStats: () => <div data-testid="review-stats">Review Stats</div>,
  LearningPathProgress: () => <div data-testid="learning-path-progress">Learning Path Progress</div>,
}));

// Mock Suspense and Spinner
jest.mock('react', () => {
  const originalReact = jest.requireActual('react');
  return {
    ...originalReact,
    Suspense: ({ children }: { children: React.ReactNode }) => children,
  };
});

jest.mock('@/components/ui/feedback', () => ({
  Spinner: () => <div data-testid="spinner">Loading...</div>,
}));

describe('DashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock auth store with a user
    ((useAuthStore as unknown) as jest.Mock).mockReturnValue({
      user: { id: '1', name: 'Test User' },
    });

    // Mock successful query responses
    (useQuery as jest.Mock).mockImplementation(({ queryKey }) => {
      if (queryKey[0] === 'resources') {
        return { isSuccess: true, data: {} };
      } else if (queryKey[0] === 'metrics') {
        return { isSuccess: true, data: {} };
      } else if (queryKey[0] === 'reviews') {
        return { isSuccess: true, data: {} };
      } else if (queryKey[0] === 'learning-path') {
        return { isSuccess: true, data: {} };
      }
      return { isSuccess: false };
    });
  });

  it('shows loading state initially', () => {
    // Override one query to be loading
    (useQuery as jest.Mock).mockImplementationOnce(({ queryKey }) => {
      if (queryKey[0] === 'resources') {
        return { isSuccess: false, isLoading: true };
      }
      return { isSuccess: true, data: {} };
    });

    render(<DashboardPage />);

    // Check if loading state is shown
    expect(screen.getByText(/Loading dashboard/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Loading dashboard/i })).toBeInTheDocument();
  });

  it('renders dashboard components when data is loaded', async () => {
    render(<DashboardPage />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Loading dashboard/i)).not.toBeInTheDocument();
    });

    // Check if dashboard title is rendered
    expect(screen.getByRole('heading', { name: /Dashboard/i })).toBeInTheDocument();

    // Check if all dashboard components are rendered
    expect(screen.getByTestId('learning-progress')).toBeInTheDocument();
    expect(screen.getByTestId('quick-actions')).toBeInTheDocument();
    expect(screen.getByTestId('resource-stats')).toBeInTheDocument();
    expect(screen.getByTestId('study-metrics')).toBeInTheDocument();
    expect(screen.getByTestId('review-stats')).toBeInTheDocument();
    expect(screen.getByTestId('learning-path-progress')).toBeInTheDocument();
    expect(screen.getByTestId('activity-feed')).toBeInTheDocument();
  });

  it('makes API calls with correct parameters', () => {
    render(<DashboardPage />);

    // Check if queries are called with correct parameters
    expect(useQuery).toHaveBeenCalledWith({
      queryKey: ['resources', 'statistics'],
      queryFn: expect.any(Function),
      enabled: true,
    });

    expect(useQuery).toHaveBeenCalledWith({
      queryKey: ['metrics', 'recent'],
      queryFn: expect.any(Function),
      enabled: true,
    });

    expect(useQuery).toHaveBeenCalledWith({
      queryKey: ['reviews', 'statistics'],
      queryFn: expect.any(Function),
      enabled: true,
    });

    expect(useQuery).toHaveBeenCalledWith({
      queryKey: ['learning-path', 'progress'],
      queryFn: expect.any(Function),
      enabled: true,
    });
  });
});