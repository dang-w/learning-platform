import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NotesList } from '@/components/notes';
import { Note } from '@/types/notes';
import { expect } from '@jest/globals';

// Mock react-icons
jest.mock('react-icons/bs', () => ({
  BsTrash: () => <div data-testid="trash-icon" />,
  BsPencilSquare: () => <div data-testid="edit-icon" />,
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn(() => '2 days ago'),
}));

describe('NotesList Component', () => {
  const mockNotes: Note[] = [
    {
      id: '1',
      title: 'Test Note 1',
      content: 'This is the content of test note 1',
      tags: ['test', 'react'],
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    },
    {
      id: '2',
      title: 'Test Note 2',
      content: 'This is the content of test note 2',
      tags: ['test', 'typescript'],
      created_at: '2023-01-02T00:00:00Z',
      updated_at: '2023-01-02T00:00:00Z',
    },
  ];

  const mockHandlers = {
    onSelectNote: jest.fn(),
    onEditNote: jest.fn(),
    onDeleteNote: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render a loading spinner when isLoading is true', () => {
    render(
      <NotesList
        notes={[]}
        onSelectNote={mockHandlers.onSelectNote}
        onEditNote={mockHandlers.onEditNote}
        onDeleteNote={mockHandlers.onDeleteNote}
        isLoading={true}
      />
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should display a message when no notes are found', () => {
    render(
      <NotesList
        notes={[]}
        onSelectNote={mockHandlers.onSelectNote}
        onEditNote={mockHandlers.onEditNote}
        onDeleteNote={mockHandlers.onDeleteNote}
        isLoading={false}
      />
    );

    expect(screen.getByText('No notes found')).toBeInTheDocument();
    expect(screen.getByText('Create a new note to get started')).toBeInTheDocument();
  });

  it('should render a list of notes', () => {
    render(
      <NotesList
        notes={mockNotes}
        onSelectNote={mockHandlers.onSelectNote}
        onEditNote={mockHandlers.onEditNote}
        onDeleteNote={mockHandlers.onDeleteNote}
        isLoading={false}
      />
    );

    expect(screen.getByText('Test Note 1')).toBeInTheDocument();
    expect(screen.getByText('Test Note 2')).toBeInTheDocument();
    expect(screen.getAllByText('2 days ago')).toHaveLength(2);
  });

  it('should highlight the selected note', () => {
    render(
      <NotesList
        notes={mockNotes}
        onSelectNote={mockHandlers.onSelectNote}
        onEditNote={mockHandlers.onEditNote}
        onDeleteNote={mockHandlers.onDeleteNote}
        selectedNoteId="1"
        isLoading={false}
      />
    );

    const selectedNote = screen.getByText('Test Note 1').closest('div[class*="p-4"]');
    expect(selectedNote?.className).toContain('bg-indigo-50');
  });

  it('should call onSelectNote when a note is clicked', () => {
    render(
      <NotesList
        notes={mockNotes}
        onSelectNote={mockHandlers.onSelectNote}
        onEditNote={mockHandlers.onEditNote}
        onDeleteNote={mockHandlers.onDeleteNote}
        isLoading={false}
      />
    );

    fireEvent.click(screen.getByText('Test Note 1'));
    expect(mockHandlers.onSelectNote).toHaveBeenCalledWith(mockNotes[0]);
  });

  it('should call onEditNote when the edit button is clicked', () => {
    render(
      <NotesList
        notes={mockNotes}
        onSelectNote={mockHandlers.onSelectNote}
        onEditNote={mockHandlers.onEditNote}
        onDeleteNote={mockHandlers.onDeleteNote}
        isLoading={false}
      />
    );

    // Find and click the first edit button
    const editButtons = screen.getAllByRole('button', { name: 'Edit note' });
    fireEvent.click(editButtons[0]);

    // Check that onEditNote was called with the correct note ID
    expect(mockHandlers.onEditNote).toHaveBeenCalledWith(mockNotes[0].id);
    // Check that event propagation was stopped (onSelectNote should not be called)
    expect(mockHandlers.onSelectNote).not.toHaveBeenCalled();
  });

  it('should show delete confirmation when delete is clicked', () => {
    render(
      <NotesList
        notes={mockNotes}
        onSelectNote={mockHandlers.onSelectNote}
        onEditNote={mockHandlers.onEditNote}
        onDeleteNote={mockHandlers.onDeleteNote}
        isLoading={false}
      />
    );

    // Find and click the first delete button
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete note' });
    fireEvent.click(deleteButtons[0]);

    // Confirmation should now be visible
    expect(screen.getByText('Are you sure you want to delete this note?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('should call onDeleteNote when delete is confirmed', () => {
    render(
      <NotesList
        notes={mockNotes}
        onSelectNote={mockHandlers.onSelectNote}
        onEditNote={mockHandlers.onEditNote}
        onDeleteNote={mockHandlers.onDeleteNote}
        isLoading={false}
      />
    );

    // Find and click the first delete button
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete note' });
    fireEvent.click(deleteButtons[0]);

    // Click the confirm delete button
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(mockHandlers.onDeleteNote).toHaveBeenCalledWith(mockNotes[0].id);
  });

  it('should hide delete confirmation when cancel is clicked', () => {
    render(
      <NotesList
        notes={mockNotes}
        onSelectNote={mockHandlers.onSelectNote}
        onEditNote={mockHandlers.onEditNote}
        onDeleteNote={mockHandlers.onDeleteNote}
        isLoading={false}
      />
    );

    // Find and click the first delete button
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete note' });
    fireEvent.click(deleteButtons[0]);

    // Click the cancel button
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    // Confirmation should now be hidden
    expect(screen.queryByText('Are you sure you want to delete this note?')).not.toBeInTheDocument();
    expect(mockHandlers.onDeleteNote).not.toHaveBeenCalled();
  });

  it('should display tags when note has tags', () => {
    render(
      <NotesList
        notes={mockNotes}
        onSelectNote={mockHandlers.onSelectNote}
        onEditNote={mockHandlers.onEditNote}
        onDeleteNote={mockHandlers.onDeleteNote}
        isLoading={false}
      />
    );

    expect(screen.getAllByText('test')).toHaveLength(2);
    expect(screen.getByText('react')).toBeInTheDocument();
    expect(screen.getByText('typescript')).toBeInTheDocument();
  });

  it('should truncate long content in the preview', () => {
    const longContentNote: Note = {
      id: '3',
      title: 'Long Content Note',
      content: 'A'.repeat(200),
      tags: [],
      created_at: '2023-01-03T00:00:00Z',
      updated_at: '2023-01-03T00:00:00Z',
    };

    render(
      <NotesList
        notes={[longContentNote]}
        onSelectNote={mockHandlers.onSelectNote}
        onEditNote={mockHandlers.onEditNote}
        onDeleteNote={mockHandlers.onDeleteNote}
        isLoading={false}
      />
    );

    const displayedContent = screen.getByText(/A+\.\.\./);
    expect(displayedContent).toBeInTheDocument();
    expect(displayedContent.textContent?.length).toBeLessThan(longContentNote.content.length);
  });
});