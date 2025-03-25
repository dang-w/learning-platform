import React, { useEffect, useState } from 'react';
import { useNotesStore } from '@/lib/store/notes-store';
import NotesList from './NotesList';
import NoteEditor from './NoteEditor';
import { Note, NoteCreateInput, NoteUpdateInput } from '@/types/notes';
import { BsSearch, BsPlus, BsX, BsTag } from 'react-icons/bs';

const NotesPage: React.FC = () => {
  const {
    notes,
    filteredNotes,
    selectedNote,
    isLoading,
    error,
    activeTag,
    fetchNotes,
    setSelectedNote,
    createNote,
    updateNote,
    deleteNote,
    setSearchTerm,
    setActiveTag
  } = useNotesStore();

  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [localSearchTerm, setLocalSearchTerm] = useState('');

  // Load notes on component mount
  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Extract all unique tags from notes
  useEffect(() => {
    if (notes.length > 0) {
      const tagsSet = new Set<string>();
      notes.forEach(note => {
        note.tags.forEach(tag => tagsSet.add(tag));
      });
      setAllTags(Array.from(tagsSet).sort());
    } else {
      setAllTags([]);
    }
  }, [notes]);

  // Debounce search term updates
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(localSearchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearchTerm, setSearchTerm]);

  // Handle note selection
  const handleSelectNote = (note: Note) => {
    setSelectedNote(note);
    setIsCreatingNew(false);
  };

  // Handle edit note
  const handleEditNote = (noteId: string) => {
    const noteToEdit = notes.find(note => note.id === noteId);
    if (noteToEdit) {
      setSelectedNote(noteToEdit);
      setIsCreatingNew(false);
    }
  };

  // Handle new note creation
  const handleNewNote = () => {
    setSelectedNote(null);
    setIsCreatingNew(true);
  };

  // Handle save (both for new notes and updates)
  const handleSaveNote = async (formData: NoteCreateInput | NoteUpdateInput) => {
    try {
      if (isCreatingNew) {
        await createNote(formData as NoteCreateInput);
        setIsCreatingNew(false);
      } else if (selectedNote) {
        await updateNote(selectedNote.id, formData as NoteUpdateInput);
      }
    } catch (err) {
      console.error('Error saving note:', err);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setIsCreatingNew(false);
    setSelectedNote(null);
  };

  // Handle tag selection
  const handleTagSelect = (tag: string) => {
    setActiveTag(activeTag === tag ? null : tag);
  };

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearchTerm(e.target.value);
  };

  // Clear search
  const handleClearSearch = () => {
    setLocalSearchTerm('');
    setSearchTerm('');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Notes</h1>
          <button
            onClick={handleNewNote}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            <BsPlus size={20} className="mr-1" />
            New Note
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left sidebar with search and list */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow p-4">
            {/* Search bar */}
            <div className="relative mb-4">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <BsSearch className="text-gray-400" />
              </div>
              <input
                type="text"
                value={localSearchTerm}
                onChange={handleSearchChange}
                placeholder="Search notes..."
                className="pl-10 pr-10 py-2 w-full border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
              {localSearchTerm && (
                <button
                  onClick={handleClearSearch}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  aria-label="Clear search"
                >
                  <BsX size={20} />
                </button>
              )}
            </div>

            {/* Tags filter */}
            {allTags.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center">
                  <BsTag className="mr-1" />
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {allTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => handleTagSelect(tag)}
                      className={`px-3 py-1 text-sm rounded-full transition-colors ${
                        activeTag === tag
                          ? 'bg-indigo-600 text-white'
                          : 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Notes list */}
            <NotesList
              notes={filteredNotes}
              onSelectNote={handleSelectNote}
              selectedNoteId={selectedNote?.id}
              onDeleteNote={deleteNote}
              onEditNote={handleEditNote}
              isLoading={isLoading}
              error={error}
            />
          </div>

          {/* Right side with editor */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
            {isCreatingNew ? (
              <>
                <h2 className="text-xl font-semibold mb-4">Create New Note</h2>
                <NoteEditor
                  note={null}
                  onSave={handleSaveNote}
                  onCancel={handleCancel}
                  isNew={true}
                />
              </>
            ) : selectedNote ? (
              <>
                <h2 className="text-xl font-semibold mb-4">Edit Note</h2>
                <NoteEditor
                  note={selectedNote}
                  onSave={handleSaveNote}
                  onCancel={handleCancel}
                />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-80 text-gray-500">
                <p className="text-lg font-medium mb-2">No note selected</p>
                <p className="text-sm mb-4">Select a note from the list or create a new one</p>
                <button
                  onClick={handleNewNote}
                  className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  <BsPlus size={20} className="mr-1" />
                  Create New Note
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700">Error: {error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotesPage;