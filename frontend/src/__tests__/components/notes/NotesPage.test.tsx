import React from 'react';
import { expect } from '@jest/globals';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotesPage from '@/components/notes/NotesPage';
import { useNotesStore } from '@/lib/store/notes-store';

// Mock the notes store
jest.mock('@/lib/store/notes-store');

// Mock data
const mockNotes = [
  {
    id: '1',
    title: 'Test Note 1',
    content: 'Test content 1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    tags: ['test', 'mock'],
  },
  {
    id: '2',
    title: 'Test Note 2',
    content: 'Test content 2',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    tags: ['test'],
  },
];

// Create mock store
const mockNotesStore = {
  notes: mockNotes,
  filteredNotes: mockNotes,
  selectedNote: null,
  isLoading: false,
  error: null,
  activeTag: null,
  fetchNotes: jest.fn(),
  createNote: jest.fn(),
  updateNote: jest.fn(),
  deleteNote: jest.fn(),
  setSelectedNote: jest.fn(),
  setSearchTerm: jest.fn(),
  setActiveTag: jest.fn(),
};

// Mock implementation
((useNotesStore as unknown) as jest.Mock).mockReturnValue(mockNotesStore);

describe('NotesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the notes list', async () => {
    render(<NotesPage />);

    // Check if notes are rendered
    await waitFor(() => {
      expect(screen.getByText('Test Note 1')).toBeInTheDocument();
      expect(screen.getByText('Test Note 2')).toBeInTheDocument();
    });
  });

  it('creates a new note', async () => {
    render(<NotesPage />);
    const user = userEvent.setup();

    // Click new note button
    const newNoteButton = screen.getByText('New Note');
    await user.click(newNoteButton);

    // Fill in note details
    const titleInput = screen.getByPlaceholderText('Note title');
    const contentInput = screen.getByPlaceholderText('Add your note content here...');
    await user.type(titleInput, 'New Test Note');
    await user.type(contentInput, 'New test content');

    // Save note
    const saveButton = screen.getByText('Create Note');
    await user.click(saveButton);

    // Verify createNote was called
    expect(mockNotesStore.createNote).toHaveBeenCalledWith({
      title: 'New Test Note',
      content: 'New test content',
      tags: [],
    });
  });

  it('updates an existing note', async () => {
    // Set up the selected note in the store
    const selectedNote = mockNotes[0];
    ((useNotesStore as unknown) as jest.Mock).mockReturnValue({
      ...mockNotesStore,
      selectedNote,
    });

    render(<NotesPage />);
    const user = userEvent.setup();

    // Find the edit button for the first note
    const editButtons = screen.getAllByLabelText('Edit note');
    await user.click(editButtons[0]);

    // Update note content
    const contentInput = screen.getByPlaceholderText('Add your note content here...');
    await user.clear(contentInput);
    await user.type(contentInput, 'Updated content');

    // Save changes
    const saveButton = screen.getByText('Save Changes');
    await user.click(saveButton);

    // Verify updateNote was called
    expect(mockNotesStore.updateNote).toHaveBeenCalledWith('1', {
      title: 'Test Note 1',
      content: 'Updated content',
      tags: ['test', 'mock'],
    });
  });

  it('deletes a note', async () => {
    render(<NotesPage />);
    const user = userEvent.setup();

    // Find the delete button for the first note
    const deleteButton = screen.getAllByLabelText('Delete note')[0];
    await user.click(deleteButton);

    // Confirm deletion
    const confirmButton = screen.getByText('Delete');
    await user.click(confirmButton);

    // Verify deleteNote was called
    expect(mockNotesStore.deleteNote).toHaveBeenCalledWith('1');
  });

  it('filters notes based on search', async () => {
    render(<NotesPage />);
    const user = userEvent.setup();

    // Type in search box
    const searchInput = screen.getByPlaceholderText('Search notes...');
    await user.type(searchInput, 'Test Note 1');

    // Wait for debounce
    await waitFor(() => {
      expect(mockNotesStore.setSearchTerm).toHaveBeenCalledWith('Test Note 1');
    });
  });
});