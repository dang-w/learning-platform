import { create } from 'zustand';
import { Note, NoteCreateInput, NoteUpdateInput, NotesState } from '@/types/notes';
import notesApi from '@/lib/api/notes';

export const useNotesStore = create<NotesState & {
  // Actions
  fetchNotes: (tag?: string) => Promise<void>;
  fetchNote: (id: string) => Promise<Note>;
  createNote: (note: NoteCreateInput) => Promise<Note>;
  updateNote: (id: string, note: NoteUpdateInput) => Promise<Note>;
  deleteNote: (id: string) => Promise<void>;
  setSelectedNote: (note: Note | null) => void;
  setActiveTag: (tag: string | null) => void;
  setSearchTerm: (term: string) => void;
  filterNotes: () => void;
  clearErrors: () => void;
  resetState: () => void;
}>((set, get) => ({
  // Initial state
  notes: [],
  filteredNotes: [],
  selectedNote: null,
  isLoading: false,
  error: null,
  activeTag: null,
  searchTerm: '',

  // Actions
  fetchNotes: async (tag?: string) => {
    try {
      set({ isLoading: true, error: null });
      const notes = await notesApi.getNotes(tag);
      set({ notes, filteredNotes: notes, isLoading: false });
      get().filterNotes();
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch notes'
      });
      throw error;
    }
  },

  fetchNote: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      const note = await notesApi.getNote(id);
      set({ selectedNote: note, isLoading: false });
      return note;
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch note'
      });
      throw error;
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
      return newNote;
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to create note'
      });
      throw error;
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
      return updatedNote;
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to update note'
      });
      throw error;
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
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to delete note'
      });
      throw error;
    }
  },

  setSelectedNote: (note: Note | null) => {
    set({ selectedNote: note });
  },

  setActiveTag: (tag: string | null) => {
    set({ activeTag: tag });
    get().filterNotes();
  },

  setSearchTerm: (term: string) => {
    set({ searchTerm: term });
    get().filterNotes();
  },

  filterNotes: () => {
    const { notes, activeTag, searchTerm } = get();

    let filtered = [...notes];

    // Filter by tag if active
    if (activeTag) {
      filtered = filtered.filter(note => note.tags.includes(activeTag));
    }

    // Filter by search term if present
    if (searchTerm) {
      const lowercaseTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(note =>
        note.title.toLowerCase().includes(lowercaseTerm) ||
        note.content.toLowerCase().includes(lowercaseTerm) ||
        note.tags.some(tag => tag.toLowerCase().includes(lowercaseTerm))
      );
    }

    set({ filteredNotes: filtered });
  },

  clearErrors: () => {
    set({ error: null });
  },

  resetState: () => {
    set({
      notes: [],
      filteredNotes: [],
      selectedNote: null,
      isLoading: false,
      error: null,
      activeTag: null,
      searchTerm: ''
    });
  }
}));