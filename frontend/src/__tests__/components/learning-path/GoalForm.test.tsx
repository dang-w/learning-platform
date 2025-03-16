import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GoalForm } from '@/components/learning-path/GoalForm';

// Mock the store
jest.mock('@/lib/store/goal-store', () => ({
  useGoalStore: jest.fn()
}));

// Import after mocking
import { useGoalStore } from '@/lib/store/goal-store';

// Add proper type for the mocked function
const mockedUseGoalStore = useGoalStore as jest.MockedFunction<typeof useGoalStore>;

describe('GoalForm Component', () => {
  const mockAddGoal = jest.fn();
  const mockUpdateGoal = jest.fn();
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockedUseGoalStore.mockReturnValue({
      addGoal: mockAddGoal,
      updateGoal: mockUpdateGoal,
    });
  });

  it('renders the form correctly for new goal', () => {
    render(<GoalForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    expect(screen.getByText('Add New Goal')).toBeInTheDocument();
    expect(screen.getByLabelText(/Title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Target Date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Priority/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Category/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save/i })).toBeInTheDocument();
  });

  it('renders the form correctly for editing goal', () => {
    const existingGoal = {
      id: '123',
      title: 'Master Neural Networks',
      description: 'Learn the fundamentals of neural networks',
      target_date: '2023-06-15',
      priority: 8,
      category: 'Deep Learning',
      completed: false,
      completion_date: null,
      notes: '',
      progress: 0,
      progress_history: [],
      status: 'in_progress'
    };

    render(<GoalForm goal={existingGoal} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    expect(screen.getByText('Edit Goal')).toBeInTheDocument();
    expect(screen.getByLabelText(/Title/i)).toHaveValue('Master Neural Networks');
    expect(screen.getByLabelText(/Description/i)).toHaveValue('Learn the fundamentals of neural networks');
    expect(screen.getByLabelText(/Target Date/i)).toHaveValue('2023-06-15');
    expect(screen.getByLabelText(/Priority/i)).toHaveValue('8');
    expect(screen.getByLabelText(/Category/i)).toHaveValue('Deep Learning');
  });

  it('calls addGoal when submitting a new goal', async () => {
    render(<GoalForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'Learn Reinforcement Learning' } });
    fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'Study the basics of RL' } });
    fireEvent.change(screen.getByLabelText(/Target Date/i), { target: { value: '2023-07-15' } });
    fireEvent.change(screen.getByLabelText(/Priority/i), { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: 'Machine Learning' } });

    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => {
      expect(mockAddGoal).toHaveBeenCalledWith({
        title: 'Learn Reinforcement Learning',
        description: 'Study the basics of RL',
        target_date: '2023-07-15',
        priority: 7,
        category: 'Machine Learning',
        completed: false,
        notes: ''
      });
    });
  });

  it('calls updateGoal when editing an existing goal', async () => {
    const existingGoal = {
      id: '123',
      title: 'Master Neural Networks',
      description: 'Learn the fundamentals of neural networks',
      target_date: '2023-06-15',
      priority: 8,
      category: 'Deep Learning',
      completed: false,
      completion_date: null,
      notes: '',
      progress: 0,
      progress_history: [],
      status: 'in_progress'
    };

    render(<GoalForm goal={existingGoal} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'Master Advanced Neural Networks' } });
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => {
      expect(mockUpdateGoal).toHaveBeenCalledWith('123', expect.objectContaining({
        title: 'Master Advanced Neural Networks',
      }));
    });
  });

  it('validates required fields', async () => {
    render(<GoalForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    // Submit without filling required fields
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => {
      expect(screen.getByText(/Title is required/i)).toBeInTheDocument();
    });

    // Validation should prevent form submission
    expect(mockAddGoal).not.toHaveBeenCalled();
  });

  it('allows marking a goal as completed', async () => {
    const existingGoal = {
      id: '123',
      title: 'Master Neural Networks',
      description: 'Learn the fundamentals of neural networks',
      target_date: '2023-06-15',
      priority: 8,
      category: 'Deep Learning',
      completed: false,
      completion_date: null,
      notes: '',
      progress: 0,
      progress_history: [],
      status: 'in_progress'
    };

    render(<GoalForm goal={existingGoal} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const completedCheckbox = screen.getByLabelText(/Completed/i);
    fireEvent.click(completedCheckbox);

    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => {
      expect(mockUpdateGoal).toHaveBeenCalledWith('123', expect.objectContaining({
        completed: true,
      }));
    });
  });
});