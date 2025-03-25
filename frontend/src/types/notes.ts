// Note types for user notes functionality

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface NotePagination {
  items: Note[];
  total: number;
  skip: number;
  limit: number;
}

export interface NoteCreateInput {
  title: string;
  content: string;
  tags: string[];
}

export interface NoteUpdateInput {
  title?: string;
  content?: string;
  tags?: string[];
}

export interface NotesState {
  notes: Note[];
  filteredNotes: Note[];
  selectedNote: Note | null;
  isLoading: boolean;
  error: string | null;
  activeTag: string | null;
  searchTerm: string;
}

export interface NotesFilters {
  tag?: string | null;
  searchTerm?: string;
}

export interface NotesListProps {
  notes: Note[];
  onSelectNote: (note: Note) => void;
  selectedNoteId?: string;
  onDeleteNote: (id: string) => void;
  onEditNote: (id: string) => void;
  isLoading: boolean;
  error: string | null;
}

export interface NoteEditorProps {
  note: Note | null;
  onSave: (note: NoteCreateInput | NoteUpdateInput) => void;
  onCancel: () => void;
  isNew?: boolean;
}

export interface TagListProps {
  tags: string[];
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
}

export interface NoteSearchProps {
  searchTerm: string;
  onSearch: (term: string) => void;
}