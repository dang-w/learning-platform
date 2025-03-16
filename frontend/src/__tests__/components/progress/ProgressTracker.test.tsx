import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProgressTracker } from '@/components/learning-path/ProgressTracker';
import { Goal, Milestone } from '@/types/learning-path';
import { expect } from '@jest/globals';
import { QueryClient } from '@tanstack/react-query';

// Define extended types with status property
type GoalWithStatus = Goal & { status: 'completed' | 'in_progress' | 'not_started' };
type MilestoneWithStatus = Milestone & {
  status: 'completed' | 'in_progress' | 'not_started';
  goal_id: string;
};

describe('ProgressTracker Component', () => {
  // Mock data
  const mockGoals: Goal[] = [
    {
      id: '1',
      title: 'Learn React',
      description: 'Master React fundamentals',
      priority: 2,
      category: 'Frontend',
      completed: true,
      completion_date: '2023-06-15',
      notes: '',
      progress: 100,
      progress_history: []
    },
    {
      id: '2',
      title: 'Learn TypeScript',
      description: 'Master TypeScript fundamentals',
      priority: 2,
      category: 'Frontend',
      completed: false,
      completion_date: null,
      notes: '',
      progress: 50,
      progress_history: []
    },
    {
      id: '3',
      title: 'Learn Next.js',
      description: 'Master Next.js fundamentals',
      priority: 2,
      category: 'Frontend',
      completed: false,
      completion_date: null,
      notes: '',
      progress: 0,
      progress_history: []
    }
  ];

  const mockMilestones: Milestone[] = [
    {
      id: '1',
      title: 'Complete React tutorial',
      description: 'Finish the official React tutorial',
      target_date: '2023-05-15',
      verification_method: 'Project completion',
      resources: [],
      completed: true,
      completion_date: '2023-05-10',
      notes: '',
      progress: 100
    },
    {
      id: '2',
      title: 'Build a React app',
      description: 'Create a simple React application',
      target_date: '2023-06-15',
      verification_method: 'Project completion',
      resources: [],
      completed: true,
      completion_date: '2023-06-10',
      notes: '',
      progress: 100
    },
    {
      id: '3',
      title: 'Complete TypeScript tutorial',
      description: 'Finish the official TypeScript tutorial',
      target_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
      verification_method: 'Project completion',
      resources: [],
      completed: false,
      completion_date: null,
      notes: '',
      progress: 50
    },
    {
      id: '4',
      title: 'Set up Next.js project',
      description: 'Initialize a Next.js project',
      target_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      verification_method: 'Project completion',
      resources: [],
      completed: false,
      completion_date: null,
      notes: '',
      progress: 0
    }
  ];

  // For the ProgressTracker component, we need to add a status property to match the component's expectations
  const goalsWithStatus = mockGoals.map(goal => ({
    ...goal,
    status: goal.completed ? 'completed' : goal.progress > 0 ? 'in_progress' : 'not_started'
  })) as GoalWithStatus[];

  const milestonesWithStatus = mockMilestones.map(milestone => ({
    ...milestone,
    status: milestone.completed ? 'completed' : milestone.progress > 0 ? 'in_progress' : 'not_started',
    goal_id: parseInt(milestone.id) <= 2 ? '1' : parseInt(milestone.id) === 3 ? '2' : '3' // Map milestones to goals
  })) as MilestoneWithStatus[];

  // Setup QueryClient for tests that need it
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  // Mock the API
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it('renders the component with correct title', () => {
    render(<ProgressTracker goals={goalsWithStatus} milestones={milestonesWithStatus} />);
    expect(screen.getByText('Overall Progress')).toBeInTheDocument();
  });

  it('calculates and displays correct completion percentages', () => {
    render(<ProgressTracker goals={goalsWithStatus} milestones={milestonesWithStatus} />);

    // Overall completion should be the average of goals and milestones completion
    // Goals: 1/3 = 33%, Milestones: 2/4 = 50%, Average = 42%
    expect(screen.getByText('42%')).toBeInTheDocument();

    // Goals completion
    expect(screen.getByText('1 of 3 (33%)')).toBeInTheDocument();

    // Milestones completion
    expect(screen.getByText('2 of 4 (50%)')).toBeInTheDocument();
  });

  it('displays the "Up Next" section with upcoming milestones', () => {
    render(<ProgressTracker goals={goalsWithStatus} milestones={milestonesWithStatus} />);

    expect(screen.getByText('Up Next')).toBeInTheDocument();
    expect(screen.getByText('Complete TypeScript tutorial')).toBeInTheDocument();
    expect(screen.getByText('Part of: Learn TypeScript')).toBeInTheDocument();
    expect(screen.getByText('Set up Next.js project')).toBeInTheDocument();
    expect(screen.getByText('Part of: Learn Next.js')).toBeInTheDocument();
  });

  it('shows correct time remaining for milestones', () => {
    render(<ProgressTracker goals={goalsWithStatus} milestones={milestonesWithStatus} />);

    // The milestone is set to 7 days from now
    expect(screen.getByText('7 days left')).toBeInTheDocument();

    // The milestone is set to 30 days from now
    expect(screen.getByText('30 days left')).toBeInTheDocument();
  });

  it('handles empty goals and milestones arrays', () => {
    render(<ProgressTracker goals={[]} milestones={[]} />);

    expect(screen.getByText('Overall Progress')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();

    // Use getAllByText for elements that appear multiple times
    const progressTexts = screen.getAllByText('0 of 0 (0%)');
    expect(progressTexts.length).toBeGreaterThan(0);

    // Up Next section should not be rendered
    expect(screen.queryByText('Up Next')).not.toBeInTheDocument();
  });
});