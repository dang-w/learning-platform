import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ResourceStats } from '@/components/dashboard/ResourceStats';
import * as resourcesApi from '@/lib/api/resources';
import { expect } from '@jest/globals';

// Mock the resources API
jest.mock('@/lib/api/resources', () => ({
  fetchResourceStats: jest.fn(),
}));

// Mock react-chartjs-2
jest.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="mock-bar-chart" />,
}));

describe('ResourceStats', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const mockResourceStats = {
    articles: {
      completed: 5,
      in_progress: 3,
      total: 8,
    },
    videos: {
      completed: 7,
      in_progress: 2,
      total: 9,
    },
    courses: {
      completed: 2,
      in_progress: 4,
      total: 6,
    },
    books: {
      completed: 1,
      in_progress: 2,
      total: 3,
    },
    total_completed: 15,
    total_in_progress: 11,
    total_resources: 26,
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
    (resourcesApi.fetchResourceStats as jest.Mock).mockResolvedValue({});

    renderWithQueryClient(<ResourceStats />);

    expect(screen.getByText('Resource Statistics')).toBeInTheDocument();
  });

  it('displays zeros when no data is available', () => {
    (resourcesApi.fetchResourceStats as jest.Mock).mockResolvedValue({});

    renderWithQueryClient(<ResourceStats />);

    expect(screen.getByText('Resource Statistics')).toBeInTheDocument();
    expect(screen.getByText('Total Completed')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();

    // Use getAllByText for elements that appear multiple times
    const zeroValues = screen.getAllByText('0');
    expect(zeroValues.length).toBe(2); // One for Total Completed and one for In Progress
  });

  it('renders resource stats data correctly when available', async () => {
    (resourcesApi.fetchResourceStats as jest.Mock).mockResolvedValue(mockResourceStats);

    renderWithQueryClient(<ResourceStats />);

    // Wait for the data to be loaded and rendered
    expect(await screen.findByText('15')).toBeInTheDocument(); // Total completed
    expect(screen.getByText('11')).toBeInTheDocument(); // Total in progress

    // Check that the labels are displayed
    expect(screen.getByText('Total Completed')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('renders the bar chart', () => {
    (resourcesApi.fetchResourceStats as jest.Mock).mockResolvedValue(mockResourceStats);

    renderWithQueryClient(<ResourceStats />);

    expect(screen.getByTestId('mock-bar-chart')).toBeInTheDocument();
  });
});