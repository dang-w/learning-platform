import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NoteEditor } from '@/components/notes';
import { Note } from '@/types/notes';
import { expect } from '@jest/globals';

describe('NoteEditor Component', () => {
  const mockNote: Note = {
    id: '1',
    title: 'Test Note',
    content: 'This is the content of the test note',
    tags: ['test', 'react'],
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  };

  const mockHandlers = {
    onSave: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render an empty form when creating a new note', () => {
    render(
      <NoteEditor
        note={null}
        onSave={mockHandlers.onSave}
        onCancel={mockHandlers.onCancel}
        isNew={true}
      />
    );

    expect(screen.getByLabelText('Title')).toHaveValue('');
    expect(screen.getByLabelText('Content')).toHaveValue('');
    expect(screen.getByText('Create Note')).toBeInTheDocument();
  });

  it('should render a form with note data when editing an existing note', () => {
    render(
      <NoteEditor
        note={mockNote}
        onSave={mockHandlers.onSave}
        onCancel={mockHandlers.onCancel}
      />
    );

    expect(screen.getByLabelText('Title')).toHaveValue('Test Note');
    expect(screen.getByLabelText('Content')).toHaveValue('This is the content of the test note');
    expect(screen.getByText('test')).toBeInTheDocument();
    expect(screen.getByText('react')).toBeInTheDocument();
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
  });

  it('should add a tag when clicking the Add button', () => {
    render(
      <NoteEditor
        note={null}
        onSave={mockHandlers.onSave}
        onCancel={mockHandlers.onCancel}
      />
    );

    const tagInput = screen.getByLabelText('Tags');
    fireEvent.change(tagInput, { target: { value: 'new-tag' } });
    fireEvent.click(screen.getByText('Add'));

    expect(screen.getByText('new-tag')).toBeInTheDocument();
  });

  it('should add a tag when pressing Enter in the tag input', () => {
    render(
      <NoteEditor
        note={null}
        onSave={mockHandlers.onSave}
        onCancel={mockHandlers.onCancel}
      />
    );

    const tagInput = screen.getByLabelText('Tags');
    fireEvent.change(tagInput, { target: { value: 'enter-tag' } });
    fireEvent.keyDown(tagInput, { key: 'Enter' });

    expect(screen.getByText('enter-tag')).toBeInTheDocument();
  });

  it('should remove a tag when clicking the × button', () => {
    render(
      <NoteEditor
        note={mockNote}
        onSave={mockHandlers.onSave}
        onCancel={mockHandlers.onCancel}
      />
    );

    // There should be two tags initially
    expect(screen.getByText('test')).toBeInTheDocument();
    expect(screen.getByText('react')).toBeInTheDocument();

    // Find and click the first tag's remove button (×)
    const removeButtons = screen.getAllByText('×');
    fireEvent.click(removeButtons[0]);

    // Now there should be only one tag
    expect(screen.queryByText('test')).not.toBeInTheDocument();
    expect(screen.getByText('react')).toBeInTheDocument();
  });

  it('should validate form and show errors when submitting empty fields', async () => {
    render(
      <NoteEditor
        note={null}
        onSave={mockHandlers.onSave}
        onCancel={mockHandlers.onCancel}
      />
    );

    // Submit the form with empty fields
    fireEvent.click(screen.getByText('Save Changes'));

    // Validation errors should appear
    await waitFor(() => {
      expect(screen.getByText('Title is required')).toBeInTheDocument();
      expect(screen.getByText('Content is required')).toBeInTheDocument();
    });

    // onSave should not be called
    expect(mockHandlers.onSave).not.toHaveBeenCalled();
  });

  it('should call onSave with form data when submitting valid form', async () => {
    render(
      <NoteEditor
        note={null}
        onSave={mockHandlers.onSave}
        onCancel={mockHandlers.onCancel}
      />
    );

    // Fill in the form
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'New Note Title' } });
    fireEvent.change(screen.getByLabelText('Content'), { target: { value: 'New note content' } });

    // Add a tag
    const tagInput = screen.getByLabelText('Tags');
    fireEvent.change(tagInput, { target: { value: 'new-tag' } });
    fireEvent.click(screen.getByText('Add'));

    // Submit the form
    fireEvent.click(screen.getByText('Save Changes'));

    // onSave should be called with the form data
    await waitFor(() => {
      expect(mockHandlers.onSave).toHaveBeenCalledWith({
        title: 'New Note Title',
        content: 'New note content',
        tags: ['new-tag']
      });
    });
  });

  it('should handle adding duplicate tags', () => {
    render(
      <NoteEditor
        note={null}
        onSave={mockHandlers.onSave}
        onCancel={mockHandlers.onCancel}
      />
    );

    // Add a tag
    const tagInput = screen.getByLabelText('Tags');
    fireEvent.change(tagInput, { target: { value: 'duplicate-tag' } });
    fireEvent.click(screen.getByText('Add'));

    // Try to add the same tag again
    fireEvent.change(tagInput, { target: { value: 'duplicate-tag' } });
    fireEvent.click(screen.getByText('Add'));

    // There should be only one instance of the tag
    const tagElements = screen.getAllByText('duplicate-tag');
    expect(tagElements).toHaveLength(1);
  });

  it('should call onCancel when clicking Cancel button', () => {
    render(
      <NoteEditor
        note={null}
        onSave={mockHandlers.onSave}
        onCancel={mockHandlers.onCancel}
      />
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(mockHandlers.onCancel).toHaveBeenCalled();
  });
});