import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LearningProgress } from '@/components/dashboard/LearningProgress';
import progressApi from '@/lib/api/progress';
import { expect } from '@jest/globals';

// Mock the progress API
jest.mock('@/lib/api/progress', () => ({
  __esModule: true,
  default: {
    fetchLearningProgress: jest.fn(),
  },
}));

// Mock react-chartjs-2
jest.mock('react-chartjs-2', () => ({
  Doughnut: () => <div data-testid="mock-doughnut-chart" />,
}));

describe('LearningProgress', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const mockProgressData = {
    completed: 5,
    in_progress: 3,
    not_started: 2,
    total_resources: 10,
    completion_percentage: 50,
    recent_completions: [],
    recent_activity: [],
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

    renderWithQueryClient(<LearningProgress />);

    expect(screen.getByText('Learning Progress')).toBeInTheDocument();
  });

  it('displays 0% completion when no data is available', () => {
    (progressApi.fetchLearningProgress as jest.Mock).mockResolvedValue({});

    renderWithQueryClient(<LearningProgress />);

    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('Complete')).toBeInTheDocument();
  });

  it('renders progress data correctly when available', async () => {
    (progressApi.fetchLearningProgress as jest.Mock).mockResolvedValue(mockProgressData);

    renderWithQueryClient(<LearningProgress />);

    // Wait for the data to be loaded and rendered
    expect(await screen.findByText('50%')).toBeInTheDocument();

    // Check that the counts are displayed correctly
    expect(screen.getByText('5')).toBeInTheDocument(); // Completed
    expect(screen.getByText('3')).toBeInTheDocument(); // In Progress
    expect(screen.getByText('2')).toBeInTheDocument(); // Not Started

    // Check that the labels are displayed
    expect(screen.getAllByText('Completed')[0]).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Not Started')).toBeInTheDocument();
  });

  it('renders the doughnut chart', () => {
    (progressApi.fetchLearningProgress as jest.Mock).mockResolvedValue(mockProgressData);

    renderWithQueryClient(<LearningProgress />);

    expect(screen.getByTestId('mock-doughnut-chart')).toBeInTheDocument();
  });
});