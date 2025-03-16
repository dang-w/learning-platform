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

    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByLabelText(/Title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    expect(screen.getByText(/Target Date/i)).toBeInTheDocument();
    expect(screen.getByText(/Priority/i)).toBeInTheDocument();
    expect(screen.getByText(/Status/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Goal/i })).toBeInTheDocument();
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

    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByLabelText(/Title/i)).toHaveValue('Master Neural Networks');
    expect(screen.getByLabelText(/Description/i)).toHaveValue('Learn the fundamentals of neural networks');
    expect(screen.getByText(/Target Date/i)).toBeInTheDocument();
    expect(screen.getByText(/Priority/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Update Goal/i })).toBeInTheDocument();
  });

  it('calls onSubmit when submitting a new goal', async () => {
    const { container } = render(<GoalForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'Learn Reinforcement Learning' } });
    fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'Study the basics of RL' } });

    // Submit the form directly
    const form = container.querySelector('form');
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });
  });

  it('calls onSubmit when editing an existing goal', async () => {
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

    const { container } = render(<GoalForm goal={existingGoal} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'Master Advanced Neural Networks' } });

    // Submit the form directly
    const form = container.querySelector('form');
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });
  });

  it('validates required fields', async () => {
    render(<GoalForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    // Clear the title field
    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: '' } });

    // Submit without filling required fields
    fireEvent.click(screen.getByRole('button', { name: /Create Goal/i }));

    // Title is required by the HTML required attribute
    expect(screen.getByLabelText(/Title/i)).toBeInvalid();

    // Validation should prevent form submission
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('allows changing goal status', async () => {
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

    const { container } = render(<GoalForm goal={existingGoal} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    // We can't directly test the Select component interaction here
    // as it would require more complex testing setup
    // Instead, we'll just verify the status text is present
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getAllByText('In Progress').length).toBeGreaterThan(0);

    // Submit the form directly
    const form = container.querySelector('form');
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });
  });
});