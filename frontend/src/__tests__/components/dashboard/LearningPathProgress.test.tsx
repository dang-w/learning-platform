import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LearningPathProgress } from '@/components/dashboard/LearningPathProgress';
import { expect } from '@jest/globals';

// Create a test query client
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Setup mock data that matches the PathProgress interface
interface PathProgress {
  id: string;
  title: string;
  progress_percentage: number;
  completed_resources: number;
  total_resources: number;
  estimated_completion_date: string;
  next_resource: {
    id: string;
    title: string;
    type: string;
  } | null;
}

// Mock Chart.js BEFORE importing the component
jest.mock('chart.js', () => ({
  Chart: {
    register: jest.fn(),
  },
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
}));

// Mock the actual API implementation
jest.mock('@/lib/api/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockImplementation((url) => {
      if (url === '/api/learning-path/progress') {
        return Promise.resolve({
          data: [
            {
              id: '1',
              title: 'JavaScript Fundamentals',
              progress_percentage: 75,
              completed_resources: 15,
              total_resources: 20,
              estimated_completion_date: '2023-08-15',
              next_resource: {
                id: 'resource-1',
                title: 'Advanced JavaScript Concepts',
                type: 'Article'
              }
            }
          ]
        });
      }
      return Promise.resolve({ data: [] });
    }),
  }
}));

// Mock Next.js Link component
jest.mock('next/link', () => ({
  __esModule: true,
  default: (props: { href: string; children: React.ReactNode }) => <a href={props.href}>{props.children}</a>,
}));

// Mock the Bar component
jest.mock('react-chartjs-2', () => ({
  Bar: ({ data }: { data: unknown }) => (
    <div data-testid="learning-path-chart">
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
    </div>
  ),
}));

// Mock the store functions that fetchLearningPathProgress uses
jest.mock('@/lib/utils/api', () => ({
  getToken: jest.fn().mockReturnValue('mock-token'),
}));

jest.mock('@/lib/store/auth-store', () => ({
  useAuthStore: {
    getState: jest.fn().mockReturnValue({
      refreshAuthToken: jest.fn().mockResolvedValue(true),
    }),
  },
}));

// Get a reference to the mocked client
import apiClient from '@/lib/api/client';

describe('LearningPathProgress', () => {
  const mockLearningPaths: PathProgress[] = [
    {
      id: '1',
      title: 'JavaScript Fundamentals',
      progress_percentage: 75,
      completed_resources: 15,
      total_resources: 20,
      estimated_completion_date: '2023-08-15',
      next_resource: {
        id: 'resource-1',
        title: 'Advanced JavaScript Concepts',
        type: 'Article'
      }
    },
    {
      id: '2',
      title: 'React Mastery',
      progress_percentage: 40,
      completed_resources: 8,
      total_resources: 20,
      estimated_completion_date: '2023-09-20',
      next_resource: {
        id: 'resource-2',
        title: 'Component Lifecycle',
        type: 'Video'
      }
    }
  ];

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('renders learning path progress correctly', async () => {
    // Set up the mock for this specific test
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockLearningPaths });

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <LearningPathProgress />
      </QueryClientProvider>
    );

    // Check that the loading state is displayed first
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();

    // Wait for the data to load
    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
    });

    // Check that the paths are displayed (using findByText with a longer timeout)
    const jsElements = await screen.findAllByText(/javascript fundamentals/i, {}, { timeout: 3000 });
    expect(jsElements.length).toBeGreaterThan(0);

    const reactElements = await screen.findAllByText(/react mastery/i, {}, { timeout: 3000 });
    expect(reactElements.length).toBeGreaterThan(0);

    // Check the progress percentages - using regex to find numbers within text
    const seventyFiveElements = screen.getAllByText(/75/);
    expect(seventyFiveElements.length).toBeGreaterThan(0);

    const fortyElements = screen.getAllByText(/40/);
    expect(fortyElements.length).toBeGreaterThan(0);
  });

  it('handles empty data', async () => {
    // Return empty array for this test
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: [] });

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <LearningPathProgress />
      </QueryClientProvider>
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
    });

    // Check for empty state message
    expect(screen.getByText(/no learning paths found/i)).toBeInTheDocument();
    expect(screen.getByText(/create a learning path/i)).toBeInTheDocument();
  });

  it('handles API error', async () => {
    // Mock API error for this test
    (apiClient.get as jest.Mock).mockRejectedValueOnce(new Error('Failed to fetch'));

    // Mock console.error to prevent error output in tests
    const originalConsoleError = console.error;
    console.error = jest.fn();

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <LearningPathProgress />
      </QueryClientProvider>
    );

    // Wait for the loading state to end
    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
    });

    // For an error, the component should either show an error message or fall back to showing "No learning paths found"
    // Check for either of these options
    const errorElement = screen.queryByText(/error/i) || screen.queryByText(/no learning paths found/i);
    expect(errorElement).toBeInTheDocument();

    // Restore console.error
    console.error = originalConsoleError;
  });
});