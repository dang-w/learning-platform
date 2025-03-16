import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StudyMetricsForm } from '@/components/progress';
import { StudyMetric } from '@/types/progress';
import { expect } from '@jest/globals';

describe('StudyMetricsForm Component', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  const mockMetric: StudyMetric = {
    id: '1',
    date: '2023-03-15',
    study_hours: 2.5,
    topics: ['React', 'TypeScript'],
    focus_score: 8,
    notes: 'Worked on component testing'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the form with correct title for new metric', () => {
    render(
      <StudyMetricsForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Record Study Session')).toBeInTheDocument();
  });

  it('renders the form with correct title for editing metric', () => {
    render(
      <StudyMetricsForm
        metric={mockMetric}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Edit Study Session')).toBeInTheDocument();
  });

  it('pre-fills form fields when editing a metric', () => {
    render(
      <StudyMetricsForm
        metric={mockMetric}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByLabelText('Date')).toHaveValue('2023-03-15');
    expect(screen.getByLabelText('Study Hours')).toHaveValue(2.5);
    expect(screen.getByLabelText('Topics')).toHaveValue('React, TypeScript');
    expect(screen.getByLabelText('Focus Score')).toHaveValue(8);
    expect(screen.getByLabelText('Notes')).toHaveValue('Worked on component testing');
  });

  it('submits the form with entered values', async () => {
    render(
      <StudyMetricsForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Fill out form
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2023-03-17' } });
    fireEvent.change(screen.getByLabelText('Study Hours'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Topics'), { target: { value: 'Jest, Testing' } });
    fireEvent.change(screen.getByLabelText('Focus Score'), { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'Worked on unit tests' } });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    // Should call onSubmit with form data
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        date: '2023-03-17',
        study_hours: 2,
        topics: ['Jest', 'Testing'],
        focus_score: 7,
        notes: 'Worked on unit tests'
      });
    });
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(
      <StudyMetricsForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('shows validation errors for required fields', async () => {
    render(
      <StudyMetricsForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Clear the focus_score field which is pre-filled with 5
    fireEvent.change(screen.getByLabelText('Focus Score'), { target: { value: '' } });

    // Submit without filling required fields
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText('Date is required')).toBeInTheDocument();
      expect(screen.getByText('Study hours are required')).toBeInTheDocument();
      expect(screen.getByText('At least one topic is required')).toBeInTheDocument();
      // Since focus_score is now empty, it should show the required error
      expect(screen.getByText('Focus score is required')).toBeInTheDocument();
    });

    // Should not call onSubmit
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('validates study hours to be positive', async () => {
    render(
      <StudyMetricsForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Fill out form with negative hours
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2023-03-17' } });
    fireEvent.change(screen.getByLabelText('Study Hours'), { target: { value: '-2' } });
    fireEvent.change(screen.getByLabelText('Topics'), { target: { value: 'Jest, Testing' } });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText('Study hours must be positive')).toBeInTheDocument();
    });

    // Should not call onSubmit
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('validates focus score to be between 1 and 10', async () => {
    render(
      <StudyMetricsForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Fill out form with invalid focus score
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2023-03-17' } });
    fireEvent.change(screen.getByLabelText('Study Hours'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Topics'), { target: { value: 'Jest, Testing' } });
    fireEvent.change(screen.getByLabelText('Focus Score'), { target: { value: '12' } });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText('Focus score must be between 1 and 10')).toBeInTheDocument();
    });

    // Should not call onSubmit
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });
});