import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import progressApi from '@/lib/api/progress';
import { expect } from '@jest/globals';

// Mock the date-fns library
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn(() => '2 days ago'),
}));

// Mock the progress API
jest.mock('@/lib/api/progress', () => ({
  __esModule: true,
  default: {
    fetchLearningProgress: jest.fn(),
  },
}));

describe('ActivityFeed', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const mockActivities = {
    recent_activity: [
      {
        id: '1',
        type: 'completion',
        resource_id: 'res1',
        resource_title: 'Introduction to React',
        timestamp: '2023-03-10T12:00:00Z',
      },
      {
        id: '2',
        type: 'start',
        resource_id: 'res2',
        resource_title: 'Advanced TypeScript',
        timestamp: '2023-03-09T10:00:00Z',
      },
      {
        id: '3',
        type: 'review',
        resource_id: 'res3',
        resource_title: 'CSS Grid Layout',
        timestamp: '2023-03-08T15:00:00Z',
      },
    ],
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

  it('renders the component with correct title', () => {
    (progressApi.fetchLearningProgress as jest.Mock).mockResolvedValue({});

    renderWithQueryClient(<ActivityFeed />);

    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
  });

  it('displays "No recent activity" when there is no activity data', () => {
    (progressApi.fetchLearningProgress as jest.Mock).mockResolvedValue({});

    renderWithQueryClient(<ActivityFeed />);

    expect(screen.getByText('No recent activity')).toBeInTheDocument();
  });

  it('renders activity items when data is available', async () => {
    (progressApi.fetchLearningProgress as jest.Mock).mockResolvedValue(mockActivities);

    renderWithQueryClient(<ActivityFeed />);

    // Wait for the data to be loaded and rendered
    expect(await screen.findByText('Completed')).toBeInTheDocument();
    expect(await screen.findByText('Started')).toBeInTheDocument();
    expect(await screen.findByText('Reviewed')).toBeInTheDocument();

    expect(screen.getByText('Introduction to React')).toBeInTheDocument();
    expect(screen.getByText('Advanced TypeScript')).toBeInTheDocument();
    expect(screen.getByText('CSS Grid Layout')).toBeInTheDocument();

    // Check that the timestamps are formatted
    const timestamps = screen.getAllByText('2 days ago');
    expect(timestamps.length).toBe(3);
  });
});