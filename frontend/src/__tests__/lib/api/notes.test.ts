import notesApi from '@/lib/api/notes';
import apiClient from '@/lib/api/client';
import { Note, NoteCreateInput, NoteUpdateInput } from '@/types/notes';
import { expect } from '@jest/globals';

// Mock the apiClient
jest.mock('@/lib/api/client', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

describe('Notes API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockNote: Note = {
    id: '123',
    title: 'Test Note',
    content: 'Test content',
    tags: ['test', 'jest'],
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z'
  };

  const mockNoteInput: NoteCreateInput = {
    title: 'Test Note',
    content: 'Test content',
    tags: ['test', 'jest']
  };

  describe('getNotes', () => {
    it('should fetch notes successfully', async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: [mockNote] });

      const result = await notesApi.getNotes();

      expect(apiClient.get).toHaveBeenCalledWith('/api/users/notes');
      expect(result).toEqual([mockNote]);
    });

    it('should fetch notes with tag filter successfully', async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: [mockNote] });

      const result = await notesApi.getNotes('test');

      expect(apiClient.get).toHaveBeenCalledWith('/api/users/notes?tag=test');
      expect(result).toEqual([mockNote]);
    });

    it('should handle errors when fetching notes', async () => {
      (apiClient.get as jest.Mock).mockRejectedValueOnce({
        response: { data: { detail: 'Failed to fetch notes' } }
      });

      await expect(notesApi.getNotes()).rejects.toThrow('Failed to get notes: Failed to fetch notes');
    });
  });

  describe('getNote', () => {
    it('should fetch a note by ID successfully', async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockNote });

      const result = await notesApi.getNote('123');

      expect(apiClient.get).toHaveBeenCalledWith('/api/users/notes/123');
      expect(result).toEqual(mockNote);
    });

    it('should handle errors when fetching a note', async () => {
      (apiClient.get as jest.Mock).mockRejectedValueOnce({
        response: { data: { detail: 'Note not found' } }
      });

      await expect(notesApi.getNote('invalid-id')).rejects.toThrow('Failed to get note: Note not found');
    });
  });

  describe('createNote', () => {
    it('should create a note successfully', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: mockNote });

      const result = await notesApi.createNote(mockNoteInput);

      expect(apiClient.post).toHaveBeenCalledWith('/api/users/notes', mockNoteInput);
      expect(result).toEqual(mockNote);
    });

    it('should handle errors when creating a note', async () => {
      (apiClient.post as jest.Mock).mockRejectedValueOnce({
        response: { status: 400, data: { detail: 'Invalid note data' } }
      });

      await expect(notesApi.createNote(mockNoteInput)).rejects.toThrow('Invalid note data: Invalid note data');
    });
  });

  describe('updateNote', () => {
    it('should update a note successfully', async () => {
      const updateData: NoteUpdateInput = {
        title: 'Updated Title'
      };

      const updatedNote = { ...mockNote, title: 'Updated Title' };

      (apiClient.put as jest.Mock).mockResolvedValueOnce({ data: updatedNote });

      const result = await notesApi.updateNote('123', updateData);

      expect(apiClient.put).toHaveBeenCalledWith('/api/users/notes/123', updateData);
      expect(result).toEqual(updatedNote);
    });

    it('should handle errors when updating a note', async () => {
      (apiClient.put as jest.Mock).mockRejectedValueOnce({
        response: { status: 404, data: { detail: 'Note not found' } }
      });

      await expect(notesApi.updateNote('invalid-id', { title: 'Updated' }))
        .rejects.toThrow('Note not found: Note not found');
    });
  });

  describe('deleteNote', () => {
    it('should delete a note successfully', async () => {
      (apiClient.delete as jest.Mock).mockResolvedValueOnce({ data: {} });

      await notesApi.deleteNote('123');

      expect(apiClient.delete).toHaveBeenCalledWith('/api/users/notes/123');
    });

    it('should handle errors when deleting a note', async () => {
      (apiClient.delete as jest.Mock).mockRejectedValueOnce({
        response: { status: 404, data: { detail: 'Note not found' } }
      });

      await expect(notesApi.deleteNote('invalid-id'))
        .rejects.toThrow('Note not found: Note not found');
    });
  });
});