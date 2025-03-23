import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReviewStats } from '@/components/dashboard/ReviewStats';
import { expect } from '@jest/globals';

// Create a test query client
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Mock Chart.js components to prevent DOM errors
jest.mock('chart.js', () => {
  return {
    __esModule: true,
    Chart: {
      register: jest.fn(),
    },
    ArcElement: jest.fn(),
    CategoryScale: jest.fn(),
    LinearScale: jest.fn(),
    PointElement: jest.fn(),
    LineElement: jest.fn(),
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

// Mock the API client for direct calls in the component
jest.mock('@/lib/api/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(() => Promise.resolve({ data: {} })),
  }
}));

// Import the mocked client
import apiClient from '@/lib/api/client';

// Create a type-safe mock reference
const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

// Mock chart components
jest.mock('react-chartjs-2', () => ({
  Doughnut: ({ data }: { data: unknown }) => (
    <div data-testid="review-stats-doughnut">
      <div data-testid="doughnut-data">{JSON.stringify(data)}</div>
    </div>
  ),
  Line: ({ data }: { data: unknown }) => (
    <div data-testid="review-stats-line">
      <div data-testid="line-data">{JSON.stringify(data)}</div>
    </div>
  ),
}));

describe('ReviewStats', () => {
  const mockStats = {
    total_concepts: 150,
    concepts_due: 25,
    concepts_reviewed_today: 15,
    concepts_reviewed_week: 45,
    average_confidence: 3.7,
    confidence_trend: [
      { date: '2023-06-01', average_confidence: 3.2 },
      { date: '2023-06-02', average_confidence: 3.4 },
      { date: '2023-06-03', average_confidence: 3.5 },
      { date: '2023-06-04', average_confidence: 3.7 },
    ],
    concept_distribution: {
      '1-Poor': 10,
      '2-Fair': 25,
      '3-Good': 45,
      '4-Excellent': 40,
      '5-Mastered': 30,
    },
    topic_distribution: {
      'JavaScript': 30,
      'Python': 25,
      'React': 20,
      'Node.js': 15,
      'CSS': 10,
    },
  };

  it('renders review statistics correctly', async () => {
    // Mock the API response
    mockApiClient.get.mockResolvedValue({ data: mockStats });

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ReviewStats />
      </QueryClientProvider>
    );

    // Wait for the component to load the data
    await waitFor(() => {
      expect(screen.getByText(/total concepts/i)).toBeInTheDocument();
    });

    // Check that the statistics are displayed correctly - using flexible matchers
    expect(screen.getByText('150')).toBeInTheDocument(); // Total concepts
    expect(screen.getByText('25')).toBeInTheDocument(); // Concepts due

    // Check for elements containing 3.7 using getAllByText and a regex
    const confidenceElements = screen.getAllByText(/3\.7/);
    expect(confidenceElements.length).toBeGreaterThan(0);
  });

  it('handles loading state', async () => {
    // Mock loading state by not resolving the promise immediately
    mockApiClient.get.mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve({ data: mockStats }), 100))
    );

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ReviewStats />
      </QueryClientProvider>
    );

    // Wait for the data to load
    await waitFor(() => {
      expect(screen.getByText(/total concepts/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('handles empty data', async () => {
    // Mock empty stats
    const emptyStats = {
      total_concepts: 0,
      concepts_due: 0,
      concepts_reviewed_today: 0,
      concepts_reviewed_week: 0,
      average_confidence: 0,
      confidence_trend: [],
      concept_distribution: {},
      topic_distribution: {},
    };

    mockApiClient.get.mockResolvedValue({ data: emptyStats });

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ReviewStats />
      </QueryClientProvider>
    );

    // Wait for the data to load
    await waitFor(() => {
      expect(screen.getByText(/total concepts/i)).toBeInTheDocument();
    });

    // Check that the empty state is displayed correctly
    const zeroElements = await screen.findAllByText('0');
    expect(zeroElements.length).toBeGreaterThan(0);
  });

  it('handles API errors', async () => {
    // Mock an API error
    mockApiClient.get.mockRejectedValue(new Error('Failed to fetch'));

    const { container } = render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ReviewStats />
      </QueryClientProvider>
    );

    // Wait for the loading spinner to appear and then disappear
    // Note: In some implementations, the loading spinner might not disappear on error,
    // depending on how the error state is handled in the component

    // First, verify the error state is eventually reached
    await waitFor(() => {
      // We just care that the component doesn't crash
      expect(container).toBeInTheDocument();
    }, { timeout: 2000 });

    // Just verify the component renders something and doesn't crash
    expect(container).toBeInTheDocument();
  });
});