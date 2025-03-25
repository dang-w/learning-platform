import { expect, jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useNotesStore } from '@/lib/store/notes-store';
import { Note, NotePagination } from '@/types/notes';

// Mock the notes API
jest.mock('@/lib/api/notes', () => ({
  default: {
    getNotes: jest.fn(),
    getNote: jest.fn(),
    createNote: jest.fn(),
    updateNote: jest.fn(),
    deleteNote: jest.fn(),
  }
}));

// Import the mocked modules
import notesApi from '@/lib/api/notes';

// Create spies for the API functions
const mockGetNotes = jest.spyOn(notesApi, 'getNotes');
const mockCreateNote = jest.spyOn(notesApi, 'createNote');
const mockUpdateNote = jest.spyOn(notesApi, 'updateNote');
const mockDeleteNote = jest.spyOn(notesApi, 'deleteNote');

// Mock notes data
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
  {
    id: '3',
    title: 'Another Test Note',
    content: 'This is another test note with different content',
    tags: ['react', 'nextjs'],
    created_at: '2023-01-03T00:00:00Z',
    updated_at: '2023-01-03T00:00:00Z',
  },
];

// Mock paginated response
const createMockPaginatedResponse = (notes: Note[], skip = 0, limit = 20): NotePagination => ({
  items: notes,
  total: notes.length,
  skip,
  limit,
});

describe('Notes Store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the store state
    useNotesStore.getState().resetState();
  });

  describe('fetchNotes', () => {
    it('should fetch notes and update state', async () => {
      // Setup
      const paginatedResponse = createMockPaginatedResponse(mockNotes);
      mockGetNotes.mockResolvedValueOnce(paginatedResponse);

      const { result } = renderHook(() => useNotesStore());

      // Act
      await act(async () => {
        await result.current.fetchNotes();
      });

      // Assert
      expect(mockGetNotes).toHaveBeenCalled();
      expect(result.current.notes).toEqual(mockNotes);
      expect(result.current.filteredNotes).toEqual(mockNotes);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle fetch errors', async () => {
      // Setup
      const errorMessage = 'Failed to fetch notes';
      mockGetNotes.mockRejectedValueOnce(new Error(errorMessage));

      const { result } = renderHook(() => useNotesStore());

      // Act
      await act(async () => {
        try {
          await result.current.fetchNotes();
        } catch {
          // Expected to throw - we're catching to continue the test
        }
      });

      // Assert
      expect(mockGetNotes).toHaveBeenCalled();
      expect(result.current.notes).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(errorMessage);
    });

    it('should fetch notes with tag filter', async () => {
      // Setup
      const tag = 'react';
      const filteredNotes = [mockNotes[0], mockNotes[2]];
      const paginatedResponse = createMockPaginatedResponse(filteredNotes);
      mockGetNotes.mockResolvedValueOnce(paginatedResponse);

      const { result } = renderHook(() => useNotesStore());

      // Act
      await act(async () => {
        await result.current.fetchNotes(tag);
      });

      // Assert
      expect(mockGetNotes).toHaveBeenCalledWith(tag);
      expect(result.current.notes).toEqual(filteredNotes);
    });
  });

  describe('createNote', () => {
    it('should create a note and update state', async () => {
      // Setup
      const newNote: Note = {
        id: '4',
        title: 'New Note',
        content: 'New note content',
        tags: ['new'],
        created_at: '2023-01-04T00:00:00Z',
        updated_at: '2023-01-04T00:00:00Z',
      };

      const createInput = {
        title: 'New Note',
        content: 'New note content',
        tags: ['new'],
      };

      mockCreateNote.mockResolvedValueOnce(newNote);

      const { result } = renderHook(() => useNotesStore());

      // Initialize with some notes
      act(() => {
        useNotesStore.setState({ notes: [...mockNotes], filteredNotes: [...mockNotes] });
      });

      // Act
      await act(async () => {
        const created = await result.current.createNote(createInput);
        expect(created).toEqual(newNote);
      });

      // Assert
      expect(mockCreateNote).toHaveBeenCalledWith(createInput);
      expect(result.current.notes).toEqual([...mockNotes, newNote]);
      expect(result.current.selectedNote).toEqual(newNote);
    });

    it('should handle create errors', async () => {
      // Setup
      const errorMessage = 'Failed to create note';
      const createInput = {
        title: 'New Note',
        content: 'New note content',
        tags: ['new'],
      };

      mockCreateNote.mockRejectedValueOnce(new Error(errorMessage));

      const { result } = renderHook(() => useNotesStore());

      // Act
      await act(async () => {
        try {
          await result.current.createNote(createInput);
        } catch {
          // Expected to throw - we're catching to continue the test
        }
      });

      // Assert
      expect(mockCreateNote).toHaveBeenCalledWith(createInput);
      expect(result.current.error).toBe(errorMessage);
    });
  });

  describe('updateNote', () => {
    it('should update a note and update state', async () => {
      // Setup
      const updatedNote: Note = {
        ...mockNotes[0],
        title: 'Updated Title',
        content: 'Updated content',
      };

      const updateInput = {
        title: 'Updated Title',
        content: 'Updated content',
      };

      mockUpdateNote.mockResolvedValueOnce(updatedNote);

      const { result } = renderHook(() => useNotesStore());

      // Initialize with some notes
      act(() => {
        useNotesStore.setState({ notes: [...mockNotes], filteredNotes: [...mockNotes] });
      });

      // Act
      await act(async () => {
        const updated = await result.current.updateNote(mockNotes[0].id, updateInput);
        expect(updated).toEqual(updatedNote);
      });

      // Assert
      expect(mockUpdateNote).toHaveBeenCalledWith(mockNotes[0].id, updateInput);
      expect(result.current.notes[0]).toEqual(updatedNote);
      expect(result.current.selectedNote).toEqual(updatedNote);
    });
  });

  describe('deleteNote', () => {
    it('should delete a note and update state', async () => {
      // Setup
      mockDeleteNote.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useNotesStore());

      // Initialize with some notes
      act(() => {
        useNotesStore.setState({ notes: [...mockNotes], filteredNotes: [...mockNotes] });
      });

      // Act
      await act(async () => {
        await result.current.deleteNote(mockNotes[0].id);
      });

      // Assert
      expect(mockDeleteNote).toHaveBeenCalledWith(mockNotes[0].id);
      expect(result.current.notes).toEqual([mockNotes[1], mockNotes[2]]);
      expect(result.current.notes.length).toBe(2);
    });

    it('should handle delete errors', async () => {
      // Setup
      const errorMessage = 'Failed to delete note';
      mockDeleteNote.mockRejectedValueOnce(new Error(errorMessage));

      const { result } = renderHook(() => useNotesStore());

      // Initialize with some notes
      act(() => {
        useNotesStore.setState({ notes: [...mockNotes], filteredNotes: [...mockNotes] });
      });

      // Act
      await act(async () => {
        try {
          await result.current.deleteNote(mockNotes[0].id);
        } catch {
          // Expected to throw - we're catching to continue the test
        }
      });

      // Assert
      expect(mockDeleteNote).toHaveBeenCalledWith(mockNotes[0].id);
      expect(result.current.error).toBe(errorMessage);
      expect(result.current.notes.length).toBe(3); // Notes array remains unchanged
    });
  });

  describe('filtering notes', () => {
    beforeEach(() => {
      act(() => {
        useNotesStore.setState({ notes: [...mockNotes], filteredNotes: [...mockNotes] });
      });
    });

    it('should filter notes by tag', () => {
      const { result } = renderHook(() => useNotesStore());

      // Act
      act(() => {
        result.current.setActiveTag('react');
      });

      // Assert
      expect(result.current.activeTag).toBe('react');
      expect(result.current.filteredNotes).toEqual([mockNotes[0], mockNotes[2]]);
    });

    it('should filter notes by search term', () => {
      const { result } = renderHook(() => useNotesStore());

      // Act
      act(() => {
        result.current.setSearchTerm('another');
      });

      // Assert
      expect(result.current.searchTerm).toBe('another');
      expect(result.current.filteredNotes).toEqual([mockNotes[2]]);
    });

    it('should combine tag and search filters', () => {
      const { result } = renderHook(() => useNotesStore());

      // Act
      act(() => {
        result.current.setActiveTag('react');
        result.current.setSearchTerm('another');
      });

      // Assert
      expect(result.current.activeTag).toBe('react');
      expect(result.current.searchTerm).toBe('another');
      expect(result.current.filteredNotes).toEqual([mockNotes[2]]);
    });

    it('should reset filters when clearing tags and search', () => {
      const { result } = renderHook(() => useNotesStore());

      // Setup with filters
      act(() => {
        result.current.setActiveTag('react');
        result.current.setSearchTerm('test');
      });

      // Act - clear filters
      act(() => {
        result.current.setActiveTag(null);
        result.current.setSearchTerm('');
      });

      // Assert
      expect(result.current.activeTag).toBeNull();
      expect(result.current.searchTerm).toBe('');
      expect(result.current.filteredNotes).toEqual(mockNotes);
    });
  });
});