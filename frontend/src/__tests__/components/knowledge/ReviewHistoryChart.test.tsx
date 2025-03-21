import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReviewHistoryChart } from '@/components/knowledge/ReviewHistoryChart';

// Mock the recharts components since they use canvas/svg
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
    BarChart: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="bar-chart">{children}</div>
    ),
    PieChart: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="pie-chart">{children}</div>
    ),
    Pie: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="pie">{children}</div>
    ),
    Cell: () => <div data-testid="cell" />,
    CartesianGrid: () => <div data-testid="cartesian-grid" />,
    XAxis: () => <div data-testid="x-axis" />,
    YAxis: () => <div data-testid="y-axis" />,
    Tooltip: () => <div data-testid="tooltip" />,
    Legend: () => <div data-testid="legend" />,
    Bar: () => <div data-testid="bar" />,
  };
});

// Mock date-fns to use a consistent date in tests
jest.mock('date-fns', () => {
  const actual = jest.requireActual('date-fns');
  return {
    ...actual,
    format: jest.fn().mockReturnValue('Jan 01'),
    subDays: jest.fn().mockImplementation((date, days) => {
      const result = new Date(date);
      result.setDate(result.getDate() - days);
      return result;
    }),
    parseISO: jest.fn().mockImplementation((dateString) => new Date(dateString)),
  };
});

describe('ReviewHistoryChart', () => {
  const defaultProps = {
    userId: 'user123',
    timeRange: 'week' as const,
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders a loading spinner initially', () => {
    render(<ReviewHistoryChart {...defaultProps} />);

    expect(screen.getByTestId('review-history-chart')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /review history/i })).toBeInTheDocument();

    // Should show loading spinner
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
  });

  it('renders the activity chart after loading', async () => {
    render(<ReviewHistoryChart {...defaultProps} />);

    // Fast-forward past the loading state
    jest.advanceTimersByTime(600);

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    // Should show bar chart by default (activity view)
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.queryByTestId('pie-chart')).not.toBeInTheDocument();

    // Check for activity tab being selected
    const activityButton = screen.getByRole('button', { name: /activity/i });
    expect(activityButton).toHaveClass('bg-blue-600');
  });

  it('switches between activity and accuracy views', async () => {
    render(<ReviewHistoryChart {...defaultProps} />);

    // Fast-forward past the loading state
    jest.advanceTimersByTime(600);

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    // Click on accuracy button
    const accuracyButton = screen.getByRole('button', { name: /accuracy/i });
    fireEvent.click(accuracyButton);

    // Should show pie chart
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();

    // Click back to activity view
    const activityButton = screen.getByRole('button', { name: /activity/i });
    fireEvent.click(activityButton);

    // Should show bar chart again
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.queryByTestId('pie-chart')).not.toBeInTheDocument();
  });

  it('updates chart when timeRange prop changes', async () => {
    const { rerender } = render(<ReviewHistoryChart {...defaultProps} />);

    // Fast-forward past the loading state
    jest.advanceTimersByTime(600);

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    // Should be in week mode by default
    expect(screen.getByText(/this chart shows your spaced repetition review history/i)).toBeInTheDocument();

    // Re-render with month timeRange
    rerender(<ReviewHistoryChart {...defaultProps} timeRange="month" />);

    // Should show loading again briefly
    expect(screen.getByRole('status')).toBeInTheDocument();

    // Fast-forward again
    jest.advanceTimersByTime(600);

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    // Should have loaded with new timeRange
    expect(screen.getByText(/this chart shows your spaced repetition review history/i)).toBeInTheDocument();
  });
});