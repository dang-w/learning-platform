import React, { useState } from 'react';
import { NotesListProps } from '@/types/notes';
import { BsPencilSquare, BsTrash } from 'react-icons/bs';
import { formatDistanceToNow } from 'date-fns';

const NotesList: React.FC<NotesListProps> = ({
  notes,
  onSelectNote,
  selectedNoteId,
  onDeleteNote,
  onEditNote,
  isLoading,
  error,
}) => {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Function to generate a preview of the content
  const getContentPreview = (content: string, maxLength = 120) => {
    if (content.length <= maxLength) return content;
    return `${content.substring(0, maxLength)}...`;
  };

  // Format date to "X time ago" format
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return 'Unknown date';
    }
  };

  // Handle edit click
  const handleEditClick = (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    onEditNote(noteId);
  };

  // Handle delete click
  const handleDeleteClick = (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    setConfirmDelete(noteId);
  };

  // Handle confirm delete
  const handleConfirmDelete = (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    onDeleteNote(noteId);
    setConfirmDelete(null);
  };

  // Handle cancel delete
  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDelete(null);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-500">
        <p className="text-lg font-medium">{error}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" role="status">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <p className="text-lg font-medium">No notes found</p>
        <p className="text-sm">Create a new note to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 overflow-auto pr-2 max-h-[calc(100vh-250px)]">
      {notes.map((note) => (
        <div
          key={note.id}
          className={`
            p-4 rounded-lg cursor-pointer transition-all border
            ${
              selectedNoteId === note.id
                ? 'bg-indigo-50 border-indigo-200'
                : 'bg-white border-gray-200 hover:border-indigo-200'
            }
          `}
          onClick={() => onSelectNote(note)}
        >
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-medium text-lg text-gray-900 flex-grow truncate">
              {note.title}
            </h3>
            <div className="flex space-x-2 ml-2">
            <button
                onClick={(e) => handleEditClick(e, note.id)}
                className="text-gray-500 hover:text-indigo-500 p-1 rounded-full hover:bg-indigo-50"
                aria-label="Edit note"
              >
                <BsPencilSquare size={16} />
              </button>
              <button
                onClick={(e) => handleDeleteClick(e, note.id)}
                className="text-gray-500 hover:text-red-500 p-1 rounded-full hover:bg-red-50"
                aria-label="Delete note"
              >
                <BsTrash size={16} />
              </button>
            </div>
          </div>

          {/* Content preview */}
          <p className="text-gray-600 text-sm mb-2 line-clamp-2">
            {getContentPreview(note.content)}
          </p>

          {/* Tags */}
          {note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {note.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-800"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Date */}
          <div className="text-xs text-gray-500">{formatDate(note.updated_at)}</div>

          {/* Delete confirmation */}
          {confirmDelete === note.id && (
            <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
              <p className="text-sm text-red-700 font-medium mb-2">
                Are you sure you want to delete this note?
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={(e) => handleConfirmDelete(e, note.id)}
                  className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                >
                  Delete
                </button>
                <button
                  onClick={handleCancelDelete}
                  className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default NotesList;