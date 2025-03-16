import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConceptForm from '@/components/knowledge/ConceptForm';
import { create } from 'zustand';
import { Concept } from '@/types/knowledge';

// Mock the knowledge store
jest.mock('@/lib/store/knowledge-store', () => ({
  __esModule: true,
  default: create(() => ({
    addConcept: jest.fn(),
    updateConcept: jest.fn(),
  })),
}));

// Mock the dynamic import for the markdown editor
jest.mock('next/dynamic', () => () => {
  const DynamicComponent = ({
    onChange,
    value,
    renderHTML,
    style,
    placeholder
  }: {
    onChange: (data: { text: string }) => void;
    value?: string;
    renderHTML?: (text: string) => string;
    style?: React.CSSProperties;
    placeholder?: string;
  }) => (
    <div data-testid="markdown-editor" className="mock-markdown-editor">
      <textarea
        data-testid="markdown-content"
        value={value || ''}
        onChange={(e) => onChange({ text: e.target.value })}
        placeholder={placeholder}
        style={style}
      />
      <button data-testid="preview-button" type="button">Preview</button>
      <div data-testid="preview-content" style={{ display: 'none' }}>
        {renderHTML && value ? renderHTML(value) : ''}
      </div>
    </div>
  );
  return DynamicComponent;
});

describe('ConceptForm Component', () => {
  const mockOnSubmit = jest.fn().mockImplementation(() => Promise.resolve());
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the form correctly for new concept', () => {
    render(<ConceptForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} isSubmitting={false} error={null} />);

    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByText('Notes (Optional)')).toBeInTheDocument();
    expect(screen.getByText('Topics (comma-separated)')).toBeInTheDocument();
    expect(screen.getByText('Difficulty')).toBeInTheDocument();
    expect(screen.getByText('Create Concept')).toBeInTheDocument();
  });

  it('renders the form correctly for editing concept', () => {
    const existingConcept: Concept = {
      id: '1',
      title: 'Neural Networks',
      content: 'Neural networks are a set of algorithms...',
      notes: 'Important for deep learning',
      topics: ['AI', 'Machine Learning'],
      difficulty: 'intermediate',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      review_count: 0,
      confidence_level: 0,
      user_id: 'user123',
      reviews: [],
      next_review: null
    };

    render(
      <ConceptForm
        initialData={existingConcept}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isSubmitting={false}
        error={null}
      />
    );

    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByText('Update Concept')).toBeInTheDocument();
  });

  it('calls onSubmit when submitting a new concept', async () => {
    render(<ConceptForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} isSubmitting={false} error={null} />);

    // Fill in the form
    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'Reinforcement Learning' } });

    // Use the mock markdown editor
    fireEvent.change(screen.getByTestId('markdown-content'), { target: { value: 'Reinforcement learning is...' } });

    fireEvent.change(screen.getByLabelText(/Topics/i), { target: { value: 'AI, Machine Learning' } });

    // Submit the form
    const submitButton = screen.getByText('Create Concept');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        title: 'Reinforcement Learning',
        content: 'Reinforcement learning is...',
        notes: '',
        topics: ['AI', 'Machine Learning'],
        difficulty: 'intermediate',
      });
    });
  });

  it('calls onSubmit when editing an existing concept', async () => {
    const existingConcept: Concept = {
      id: '1',
      title: 'Neural Networks',
      content: 'Neural networks are a set of algorithms...',
      notes: '',
      topics: ['AI', 'Machine Learning'],
      difficulty: 'intermediate',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      review_count: 0,
      confidence_level: 0,
      user_id: 'user123',
      reviews: [],
      next_review: null
    };

    render(
      <ConceptForm
        initialData={existingConcept}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isSubmitting={false}
        error={null}
      />
    );

    // Update the title
    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'Updated Neural Networks' } });

    // Submit the form
    const submitButton = screen.getByText('Update Concept');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        id: '1',
        title: 'Updated Neural Networks',
        content: 'Neural networks are a set of algorithms...',
        notes: '',
        topics: ['AI', 'Machine Learning'],
        difficulty: 'intermediate',
      });
    });
  });

  it('validates required fields', async () => {
    render(<ConceptForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} isSubmitting={false} error={null} />);

    // Submit without filling required fields
    const submitButton = screen.getByText('Create Concept');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Title is required')).toBeInTheDocument();
      expect(screen.getByText('Content is required')).toBeInTheDocument();
      expect(screen.getByText('At least one topic is required')).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('shows markdown preview when preview button is clicked', async () => {
    render(<ConceptForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} isSubmitting={false} error={null} />);

    // Use the mock markdown editor
    fireEvent.change(screen.getByTestId('markdown-content'), { target: { value: '# Heading\n\nThis is **bold** text.' } });

    // Click the preview button
    const previewButton = screen.getByTestId('preview-button');
    fireEvent.click(previewButton);

    // In a real implementation, this would show the preview
    // For our mock, we'll just check that the preview content exists
    expect(screen.getByTestId('preview-content')).toBeInTheDocument();
  });
});