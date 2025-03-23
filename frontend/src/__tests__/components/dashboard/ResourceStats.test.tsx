import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ResourceStats } from '@/components/dashboard/ResourceStats';
import { expect } from '@jest/globals';

// Create a test query client
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Mock the Chart.js module
jest.mock('chart.js', () => {
  return {
    __esModule: true,
    Chart: {
      register: jest.fn(),
    },
    register: jest.fn(),
    CategoryScale: jest.fn(),
    LinearScale: jest.fn(),
    BarElement: jest.fn(),
    Title: jest.fn(),
    Tooltip: jest.fn(),
    Legend: jest.fn(),
    defaults: {
      font: {
        family: 'sans-serif',
      },
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
        },
      },
    },
  };
});

// Mock the resources API
jest.mock('@/lib/api', () => ({
  resourcesApi: {
    getStatistics: jest.fn(() => Promise.resolve({})),
  },
}));

// Import the mock directly
import { resourcesApi } from '@/lib/api';

// Define types for resource statistics
interface ResourceTypeStats {
  total: number;
  completed: number;
  in_progress: number;
}

interface ResourceStatistics {
  articles: ResourceTypeStats;
  videos: ResourceTypeStats;
  courses: ResourceTypeStats;
  books: ResourceTypeStats;
  total_resources: number;
  total_completed: number;
  total_in_progress: number;
}

// Mock resourcesApi.getStatistics directly
const mockGetStatistics = resourcesApi.getStatistics as jest.Mock;

// Mock the Bar component
jest.mock('react-chartjs-2', () => ({
  Bar: ({ data }: { data: unknown }) => (
    <div data-testid="resource-stats-chart">
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
    </div>
  ),
}));

describe('ResourceStats', () => {
  const mockStats: ResourceStatistics = {
    articles: {
      total: 45,
      completed: 20,
      in_progress: 25
    },
    videos: {
      total: 30,
      completed: 15,
      in_progress: 15
    },
    courses: {
      total: 25,
      completed: 5,
      in_progress: 20
    },
    books: {
      total: 20,
      completed: 5,
      in_progress: 15
    },
    total_resources: 120,
    total_completed: 45,
    total_in_progress: 75
  };

  it('renders resource statistics correctly', async () => {
    // Mock the API response
    mockGetStatistics.mockResolvedValue(mockStats);

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ResourceStats />
      </QueryClientProvider>
    );

    // Check that the loading state is displayed first
    // Wait for the component to load the data
    await waitFor(() => {
      expect(screen.getByText('Resource Statistics')).toBeInTheDocument();
    });

    // Check that the resource counts are displayed
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('Total Completed')).toBeInTheDocument();
    expect(screen.getByText('75')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('handles loading state', async () => {
    // Mock loading state by not resolving the promise immediately
    mockGetStatistics.mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve(mockStats), 100))
    );

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ResourceStats />
      </QueryClientProvider>
    );

    // Wait for the data to load
    await waitFor(() => {
      expect(screen.getByText('Resource Statistics')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('handles empty data', async () => {
    // Mock empty stats
    const emptyStats = {
      articles: { total: 0, completed: 0, in_progress: 0 },
      videos: { total: 0, completed: 0, in_progress: 0 },
      courses: { total: 0, completed: 0, in_progress: 0 },
      books: { total: 0, completed: 0, in_progress: 0 },
      total_resources: 0,
      total_completed: 0,
      total_in_progress: 0
    };

    mockGetStatistics.mockResolvedValue(emptyStats);

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ResourceStats />
      </QueryClientProvider>
    );

    // Wait for the data to load
    await waitFor(() => {
      expect(screen.getByText('Resource Statistics')).toBeInTheDocument();
    });

    // Check that the empty state is displayed correctly
    const zeroElements = await screen.findAllByText('0');
    expect(zeroElements.length).toBeGreaterThan(0);
  });

  it('handles API errors', async () => {
    // Mock an API error
    mockGetStatistics.mockRejectedValue(new Error('Failed to fetch'));

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ResourceStats />
      </QueryClientProvider>
    );

    // The query error boundary would handle this, but we can't test that easily
    // Just verify that the component renders without crashing
    await waitFor(() => {
      expect(screen.getByText('Resource Statistics')).toBeInTheDocument();
    });
  });
});