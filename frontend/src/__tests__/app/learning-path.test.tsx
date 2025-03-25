import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LearningPathPage from '@/app/learning-path/page';
import { learningPathApi } from '@/lib/api';
import { expect } from '@jest/globals';

// Mock the API
jest.mock('@/lib/api', () => ({
  learningPathApi: {
    getLearningPath: jest.fn(),
  },
}));

// Mock the components
jest.mock('@/components/learning-path', () => ({
  GoalsList: ({ goals }: { goals: { id: number; title: string }[] }) => (
    <div data-testid="goals-list">Goals: {goals.length}</div>
  ),
  Roadmap: ({ milestones, goals }: { milestones: { id: number; title: string }[]; goals: { id: number; title: string }[] }) => (
    <div data-testid="roadmap">
      Roadmap: {milestones.length} milestones, {goals.length} goals
    </div>
  ),
  MilestonesList: ({ milestones }: { milestones: { id: number; title: string }[] }) => (
    <div data-testid="milestones-list">Milestones: {milestones.length}</div>
  ),
  ProgressTracker: ({ goals, milestones }: { goals: { id: number; title: string }[]; milestones: { id: number; title: string }[] }) => (
    <div data-testid="progress-tracker">
      Progress: {goals.length} goals, {milestones.length} milestones
    </div>
  ),
}));

// Mock the UI components
jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  TabsList: ({ children }: { children: React.ReactNode }) => (
    <div role="tablist">{children}</div>
  ),
  TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <button role="tab" data-value={value} aria-controls={`${value}-panel`}>{children}</button>
  ),
  TabsContent: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div role="tabpanel" id={`${value}-panel`} aria-label={value} data-value={value}>{children}</div>
  ),
}));

jest.mock('@/components/ui/feedback', () => ({
  Spinner: () => <div data-testid="spinner">Loading...</div>,
}));

describe('LearningPathPage', () => {
  const mockLearningPath = {
    goals: [
      { id: 1, title: 'Goal 1' },
      { id: 2, title: 'Goal 2' },
    ],
    milestones: [
      { id: 1, title: 'Milestone 1' },
      { id: 2, title: 'Milestone 2' },
      { id: 3, title: 'Milestone 3' },
    ],
  };

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const renderWithQueryClient = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it('shows loading spinner when data is being fetched', async () => {
    (learningPathApi.getLearningPath as jest.Mock).mockReturnValue(
      new Promise(() => {}) // Never resolving promise to keep loading state
    );

    renderWithQueryClient(<LearningPathPage />);

    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('renders the learning path page with correct title and description', async () => {
    (learningPathApi.getLearningPath as jest.Mock).mockResolvedValue(mockLearningPath);

    renderWithQueryClient(<LearningPathPage />);

    await waitFor(() => {
      expect(screen.getByText('Learning Path')).toBeInTheDocument();
      expect(
        screen.getByText('Track your learning journey, set goals, and monitor your progress')
      ).toBeInTheDocument();
    });
  });

  it('renders the tabs with correct content', async () => {
    (learningPathApi.getLearningPath as jest.Mock).mockResolvedValue(mockLearningPath);

    renderWithQueryClient(<LearningPathPage />);

    await waitFor(() => {
      expect(screen.getByText('Goals')).toBeInTheDocument();
      expect(screen.getByText('Roadmap')).toBeInTheDocument();
      expect(screen.getByText('Milestones')).toBeInTheDocument();
    });

    // Check that all tab panels are rendered with correct content
    const goalsPanel = screen.getByRole('tabpanel', { name: /goals/i });
    const roadmapPanel = screen.getByRole('tabpanel', { name: /roadmap/i });
    const milestonesPanel = screen.getByRole('tabpanel', { name: /milestones/i });

    expect(goalsPanel).toHaveTextContent('Goals: 2');
    expect(roadmapPanel).toHaveTextContent('Roadmap: 3 milestones, 2 goals');
    expect(milestonesPanel).toHaveTextContent('Milestones: 3');
  });

  it('renders the progress tracker', async () => {
    (learningPathApi.getLearningPath as jest.Mock).mockResolvedValue(mockLearningPath);

    renderWithQueryClient(<LearningPathPage />);

    await waitFor(() => {
      expect(screen.getByTestId('progress-tracker')).toBeInTheDocument();
      expect(screen.getByTestId('progress-tracker')).toHaveTextContent('Progress: 2 goals, 3 milestones');
    });
  });
});