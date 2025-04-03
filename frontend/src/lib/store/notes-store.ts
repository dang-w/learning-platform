import { create } from 'zustand';
import { Note, NoteCreateInput, NoteUpdateInput, NotesState } from '@/types/notes';
import notesApi from '@/lib/api/notes';

// Define interface for actions to avoid repetition
interface NotesActions {
  fetchNotes: () => Promise<void>;
  fetchNote: (id: string) => Promise<Note | undefined>; // Return Note | undefined
  createNote: (note: NoteCreateInput) => Promise<Note | undefined>; // Return Note | undefined
  updateNote: (id: string, note: NoteUpdateInput) => Promise<Note | undefined>; // Return Note | undefined
  deleteNote: (id: string) => Promise<boolean>; // Return boolean success
  setSelectedNote: (note: Note | null) => void;
  setActiveTag: (tag: string | null) => void;
  setSearchTerm: (term: string) => void;
  filterNotes: () => void;
  clearMessages: () => void; // Renamed from clearErrors
  resetState: () => void;
  // Internal helper for setting messages
  _setMessages: (success?: string | null, error?: string | null) => void;
}

// Extend NotesState to include messages
interface NotesStateWithMessages extends NotesState {
  successMessage: string | null;
  errorMessage: string | null;
}

export const useNotesStore = create<NotesStateWithMessages & NotesActions>((set, get) => ({
  // Initial state
  notes: [],
  filteredNotes: [],
  selectedNote: null,
  isLoading: false,
  error: null, // Keep original error for potential specific handling
  activeTag: null,
  searchTerm: '',
  successMessage: null,
  errorMessage: null,

  // Internal helper to set messages and optionally clear after timeout
  _setMessages: (success: string | null = null, error: string | null = null) => {
    set({ successMessage: success, errorMessage: error, error: error }); // Keep error field for compatibility
    // Auto-clear messages after a delay
    setTimeout(() => {
      set(state => {
        // Only clear if the message hasn't changed since the timeout was set
        if (state.successMessage === success && state.errorMessage === error) {
          return { successMessage: null, errorMessage: null };
        }
        return {};
      });
    }, 10000); // Increased delay to 10 seconds
  },

  // Actions
  fetchNotes: async () => {
    try {
      set({ isLoading: true, error: null });
      // Fetch ALL notes initially, filtering will be applied separately
      const response = await notesApi.getNotes(); // Removed activeTag parameter here
      // Update notes state and call filterNotes immediately
      set(state => {
        state.notes = response.items;
        state.isLoading = false;

        // Perform filtering immediately after updating notes
        let filtered = [...state.notes]; // Start with all notes
        // Apply activeTag filter if set
        if (state.activeTag) {
          filtered = filtered.filter(note => note.tags.includes(state.activeTag!));
        }
        // Apply searchTerm filter
        if (state.searchTerm) {
          const lowercaseTerm = state.searchTerm.toLowerCase();
          filtered = filtered.filter(note =>
            note.title.toLowerCase().includes(lowercaseTerm) ||
            note.content.toLowerCase().includes(lowercaseTerm) ||
            note.tags.some(tag => tag.toLowerCase().includes(lowercaseTerm))
          );
        }
        state.filteredNotes = filtered;
        return state;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch notes';
      set({ isLoading: false, error: message }); // Keep original error field
      get()._setMessages(null, message); // Use helper to set error message
      // No need to throw error here, state reflects the failure
    }
  },

  fetchNote: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      const note = await notesApi.getNote(id);
      set({ selectedNote: note, isLoading: false });
      return note;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch note';
      set({ isLoading: false, error: message });
      get()._setMessages(null, message);
      return undefined; // Return undefined on failure
    }
  },

  createNote: async (noteData: NoteCreateInput) => {
    try {
      set({ isLoading: true, error: null });
      const newNote = await notesApi.createNote(noteData);
      set(state => ({
        notes: [...state.notes, newNote],
        isLoading: false,
        selectedNote: newNote
      }));
      get().filterNotes();
      get()._setMessages('Note created successfully'); // Use helper
      return newNote;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create note';
      set({ isLoading: false, error: message });
      get()._setMessages(null, message);
      return undefined; // Return undefined on failure
    }
  },

  updateNote: async (id: string, noteData: NoteUpdateInput) => {
    try {
      set({ isLoading: true, error: null });
      const updatedNote = await notesApi.updateNote(id, noteData);
      set(state => ({
        notes: state.notes.map(note => note.id === id ? updatedNote : note),
        isLoading: false,
        selectedNote: updatedNote
      }));
      get().filterNotes();
      get()._setMessages('Note updated successfully'); // Use helper
      return updatedNote;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update note';
      set({ isLoading: false, error: message });
      get()._setMessages(null, message);
      return undefined; // Return undefined on failure
    }
  },

  deleteNote: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      await notesApi.deleteNote(id);
      set(state => {
        const isSelectedNoteDeleted = state.selectedNote?.id === id;
        return {
          notes: state.notes.filter(note => note.id !== id),
          selectedNote: isSelectedNoteDeleted ? null : state.selectedNote,
          isLoading: false
        };
      });
      get().filterNotes();
      get()._setMessages('Note deleted successfully'); // Use helper
      return true; // Return true on success
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete note';
      set({ isLoading: false, error: message });
      get()._setMessages(null, message);
      return false; // Return false on failure
    }
  },

  setSelectedNote: (note: Note | null) => {
    set({ selectedNote: note });
  },

  setActiveTag: (tag: string | null) => {
    set({ activeTag: tag });
    // Don't fetch here, just filter the existing notes
    get().filterNotes();
    // get().fetchNotes(); // Remove fetch call
  },

  setSearchTerm: (term: string) => {
    set({ searchTerm: term });
    // Filter immediately based on the new search term and current notes/activeTag
    get().filterNotes(); // Use the separate filterNotes function
    /* // Remove embedded filter logic
    set(state => {
      let filtered = [...state.notes];
      // Apply activeTag filter first
      if (state.activeTag) {
         filtered = filtered.filter(note => note.tags.includes(state.activeTag!));
      }
      // Then apply search term
      const lowercaseTerm = term.toLowerCase();
      filtered = filtered.filter(note =>
        note.title.toLowerCase().includes(lowercaseTerm) ||
        note.content.toLowerCase().includes(lowercaseTerm) ||
        note.tags.some(tag => tag.toLowerCase().includes(lowercaseTerm))
      );
      state.filteredNotes = filtered;
      return state;
    });
    */
  },

  filterNotes: () => {
    // Centralized filtering logic
    const { notes, activeTag, searchTerm } = get();

    let filtered = [...notes]; // Start with all notes

    // Apply activeTag filter (Case-insensitive)
    if (activeTag) {
      const lowerCaseActiveTag = activeTag.toLowerCase();
      filtered = filtered.filter((note: Note) =>
        Array.isArray(note.tags) && note.tags.some(tag => tag.toLowerCase() === lowerCaseActiveTag)
      );
    }

    // Apply searchTerm filter
    if (searchTerm) {
      const lowercaseTerm = searchTerm.toLowerCase();
      filtered = filtered.filter((note: Note) =>
        note.title.toLowerCase().includes(lowercaseTerm) ||
        note.content.toLowerCase().includes(lowercaseTerm) ||
        (Array.isArray(note.tags) && note.tags.some((tag: string) => tag.toLowerCase().includes(lowercaseTerm)))
      );
    }
    set({ filteredNotes: filtered });
  },

  // Renamed from clearErrors
  clearMessages: () => {
    set({ successMessage: null, errorMessage: null, error: null });
  },

  resetState: () => {
    set({
      notes: [],
      filteredNotes: [],
      selectedNote: null,
      isLoading: false,
      error: null,
      activeTag: null,
      searchTerm: '',
      successMessage: null, // Reset messages
      errorMessage: null
    });
  }
}));

// Extend Window interface for Cypress testing
declare global {
  interface Window {
    __NOTES_STORE__?: typeof useNotesStore;
  }
}

// Expose store for Cypress testing if in development/test environment
if (typeof window !== 'undefined' && (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test')) {
  window.__NOTES_STORE__ = useNotesStore;
}