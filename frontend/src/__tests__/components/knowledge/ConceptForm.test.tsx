import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ConceptForm } from '@/components/knowledge/ConceptForm';
import { useConceptStore } from '@/lib/store/conceptStore';

// Mock the store
jest.mock('@/lib/store/conceptStore');

describe('ConceptForm Component', () => {
  const mockAddConcept = jest.fn();
  const mockUpdateConcept = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useConceptStore as jest.Mock).mockReturnValue({
      addConcept: mockAddConcept,
      updateConcept: mockUpdateConcept,
    });
  });

  it('renders the form correctly for new concept', () => {
    render(<ConceptForm />);

    expect(screen.getByText('Add New Concept')).toBeInTheDocument();
    expect(screen.getByLabelText(/Title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Content/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Topics/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save/i })).toBeInTheDocument();
  });

  it('renders the form correctly for editing concept', () => {
    const existingConcept = {
      id: '123',
      title: 'Neural Networks',
      content: 'Neural networks are a set of algorithms...',
      topics: ['Deep Learning', 'AI'],
      reviews: [],
      next_review: null,
      created_at: '2023-03-15T10:30:00',
      updated_at: '2023-03-15T10:30:00'
    };

    render(<ConceptForm concept={existingConcept} />);

    expect(screen.getByText('Edit Concept')).toBeInTheDocument();
    expect(screen.getByLabelText(/Title/i)).toHaveValue('Neural Networks');
    expect(screen.getByLabelText(/Content/i)).toHaveValue('Neural networks are a set of algorithms...');
  });

  it('calls addConcept when submitting a new concept', async () => {
    render(<ConceptForm />);

    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'Reinforcement Learning' } });
    fireEvent.change(screen.getByLabelText(/Content/i), { target: { value: 'Reinforcement learning is...' } });
    fireEvent.change(screen.getByLabelText(/Topics/i), { target: { value: 'AI, Machine Learning' } });

    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => {
      expect(mockAddConcept).toHaveBeenCalledWith({
        title: 'Reinforcement Learning',
        content: 'Reinforcement learning is...',
        topics: ['AI', 'Machine Learning'],
      });
    });
  });

  it('calls updateConcept when editing an existing concept', async () => {
    const existingConcept = {
      id: '123',
      title: 'Neural Networks',
      content: 'Neural networks are a set of algorithms...',
      topics: ['Deep Learning', 'AI'],
      reviews: [],
      next_review: null,
      created_at: '2023-03-15T10:30:00',
      updated_at: '2023-03-15T10:30:00'
    };

    render(<ConceptForm concept={existingConcept} />);

    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'Updated Neural Networks' } });
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => {
      expect(mockUpdateConcept).toHaveBeenCalledWith('123', expect.objectContaining({
        title: 'Updated Neural Networks',
      }));
    });
  });

  it('validates required fields', async () => {
    render(<ConceptForm />);

    // Submit without filling required fields
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => {
      expect(screen.getByText(/Title is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Content is required/i)).toBeInTheDocument();
    });

    // Validation should prevent form submission
    expect(mockAddConcept).not.toHaveBeenCalled();
  });

  it('shows markdown preview when preview button is clicked', () => {
    render(<ConceptForm />);

    fireEvent.change(screen.getByLabelText(/Content/i), { target: { value: '# Heading\n\nThis is **bold** text.' } });

    const previewButton = screen.getByRole('button', { name: /Preview/i });
    fireEvent.click(previewButton);

    expect(screen.getByRole('heading', { name: 'Heading' })).toBeInTheDocument();
    expect(screen.getByText(/This is/i)).toBeInTheDocument();
    expect(screen.getByText(/bold/i)).toHaveStyle('font-weight: bold');
  });
});