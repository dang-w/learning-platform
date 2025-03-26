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

// Mock LoadingScreen component
jest.mock('@/components/ui/feedback/loading-screen', () => ({
  LoadingScreen: ({ message, submessage }: { message?: string; submessage?: string }) => (
    <div data-testid="loading-screen">
      {message && <h2>{message}</h2>}
      {submessage && <p>{submessage}</p>}
    </div>
  ),
}));

describe('DashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock auth store with a user
    ((useAuthStore as unknown) as jest.Mock).mockReturnValue({
      user: { id: '1', username: 'Test User' },
      isAuthenticated: true,
    });

    // Default to loading state for all queries
    (useQuery as jest.Mock).mockImplementation(() => ({
      isSuccess: false,
      isLoading: true,
      data: null,
    }));
  });

  it('shows loading screen initially', () => {
    render(<DashboardPage />);

    // Check if loading screen is shown with correct message
    const loadingScreen = screen.getByTestId('loading-screen');
    expect(loadingScreen).toBeInTheDocument();
    expect(screen.getByText('Loading your dashboard...')).toBeInTheDocument();
    expect(screen.getByText('Preparing your personalized learning experience')).toBeInTheDocument();
  });

  it('renders dashboard components when data is loaded', async () => {
    // Mock successful responses for all queries
    (useQuery as jest.Mock).mockImplementation(() => ({
      isSuccess: true,
      isLoading: false,
      data: {},
    }));

    render(<DashboardPage />);

    // Wait for loading screen to disappear
    await waitFor(() => {
      expect(screen.queryByTestId('loading-screen')).not.toBeInTheDocument();
    });

    // Check if user greeting is rendered
    expect(screen.getByTestId('user-greeting')).toBeInTheDocument();
    expect(screen.getByText('Welcome, Test User!')).toBeInTheDocument();

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

  it('transitions from loading to loaded state', async () => {
    // Start with loading state
    (useQuery as jest.Mock).mockImplementation(() => ({
      isSuccess: false,
      isLoading: true,
      data: null,
    }));

    const { rerender } = render(<DashboardPage />);

    // Verify loading state
    expect(screen.getByTestId('loading-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('user-greeting')).not.toBeInTheDocument();

    // Update to loaded state
    (useQuery as jest.Mock).mockImplementation(() => ({
      isSuccess: true,
      isLoading: false,
      data: {},
    }));

    rerender(<DashboardPage />);

    // Wait for loading screen to disappear
    await waitFor(() => {
      expect(screen.queryByTestId('loading-screen')).not.toBeInTheDocument();
    });

    // Verify loaded state
    expect(screen.getByTestId('user-greeting')).toBeInTheDocument();
    expect(screen.getByTestId('resource-stats')).toBeInTheDocument();
    expect(screen.getByTestId('study-metrics')).toBeInTheDocument();
    expect(screen.getByTestId('review-stats')).toBeInTheDocument();
  });
});