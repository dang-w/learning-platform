import { expect, jest } from '@jest/globals';
import { AxiosError, AxiosResponse } from 'axios';
import notesApi from '@/lib/api/notes';
import { ApiErrorResponse } from '@/types/api';
import apiClient from '@/lib/api/client';

jest.mock('@/lib/api/client', () => ({
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  }
}));

const mockGet = jest.spyOn(apiClient, 'get');
const mockPost = jest.spyOn(apiClient, 'post');
const mockPut = jest.spyOn(apiClient, 'put');
const mockDelete = jest.spyOn(apiClient, 'delete');

describe('Notes API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createErrorResponse = (detail: string, status = 400): AxiosError<ApiErrorResponse> => {
    const error = new Error() as AxiosError<ApiErrorResponse>;
    error.response = {
      data: { detail },
      status,
      statusText: 'Error',
      headers: {},
      config: {} as AxiosResponse['config']
    } as AxiosResponse<ApiErrorResponse>;
    return error;
  };

  describe('getNotes', () => {
    it('should fetch all notes with pagination', async () => {
      const mockResponse = {
        data: {
          notes: [{ id: '1', title: 'Test Note', content: 'Test Content', tags: ['test'] }],
          total: 1
        }
      };
      mockGet.mockResolvedValueOnce(mockResponse);

      const result = await notesApi.getNotes();
      expect(result).toEqual(mockResponse.data);
      expect(mockGet).toHaveBeenCalledWith('/api/notes?skip=0&limit=20');
    });

    it('should fetch notes with custom pagination', async () => {
      const mockResponse = {
        data: {
          notes: [{ id: '1', title: 'Test Note', content: 'Test Content', tags: ['test'] }],
          total: 1
        }
      };
      mockGet.mockResolvedValueOnce(mockResponse);

      const result = await notesApi.getNotes(undefined, 10, 5);
      expect(result).toEqual(mockResponse.data);
      expect(mockGet).toHaveBeenCalledWith('/api/notes?skip=10&limit=5');
    });

    it('should fetch notes with tag filter and pagination', async () => {
      const mockResponse = {
        data: {
          notes: [{ id: '1', title: 'Test Note', content: 'Test Content', tags: ['test'] }],
          total: 1
        }
      };
      mockGet.mockResolvedValueOnce(mockResponse);

      const result = await notesApi.getNotes('test', 0, 20);
      expect(result).toEqual(mockResponse.data);
      expect(mockGet).toHaveBeenCalledWith('/api/notes?tag=test&skip=0&limit=20');
    });

    it('should handle error when fetching notes', async () => {
      const errorDetail = 'Database error';
      const error = createErrorResponse(errorDetail);
      mockGet.mockRejectedValueOnce(error);

      await expect(notesApi.getNotes()).rejects.toThrow(`Failed to get notes: ${errorDetail}`);
      expect(mockGet).toHaveBeenCalledWith('/api/notes?skip=0&limit=20');
    });
  });

  describe('getNote', () => {
    it('should fetch a specific note by id', async () => {
      const mockResponse = {
        data: { id: '1', title: 'Test Note', content: 'Test Content', tags: ['test'] }
      };
      mockGet.mockResolvedValueOnce(mockResponse);

      const result = await notesApi.getNote('1');
      expect(result).toEqual(mockResponse.data);
      expect(mockGet).toHaveBeenCalledWith('/api/notes/1');
    });

    it('should handle invalid note ID format', async () => {
      const noteId = 'invalid-id';
      const errorDetail = 'Invalid note ID format';
      const error = createErrorResponse(errorDetail);
      mockGet.mockRejectedValueOnce(error);

      await expect(notesApi.getNote(noteId)).rejects.toThrow(`Failed to get note: ${errorDetail}`);
      expect(mockGet).toHaveBeenCalledWith(`/api/notes/${noteId}`);
    });

    it('should handle error when note is not found', async () => {
      const noteId = '999';
      const errorDetail = 'Note not found';
      const error = createErrorResponse(errorDetail, 404);
      mockGet.mockRejectedValueOnce(error);

      await expect(notesApi.getNote(noteId)).rejects.toThrow(`Failed to get note: ${errorDetail}`);
      expect(mockGet).toHaveBeenCalledWith(`/api/notes/${noteId}`);
    });
  });

  describe('createNote', () => {
    it('should create a new note', async () => {
      const noteInput = { title: 'New Note', content: 'Test Content', tags: ['test'] };
      const mockResponse = {
        data: { id: '1', ...noteInput }
      };
      mockPost.mockResolvedValueOnce(mockResponse);

      const result = await notesApi.createNote(noteInput);
      expect(result).toEqual(mockResponse.data);
      expect(mockPost).toHaveBeenCalledWith('/api/notes', noteInput);
    });

    it('should handle validation error when creating a note', async () => {
      const noteInput = { title: 'New Note with invalid characters @@@@', content: 'This is a new note', tags: ['invalid tag!'] };
      const errorDetail = 'Title can only contain alphanumeric characters and basic punctuation';
      const error = createErrorResponse(errorDetail);
      mockPost.mockRejectedValueOnce(error);

      await expect(notesApi.createNote(noteInput)).rejects.toThrow(`Failed to create note: ${errorDetail}`);
      expect(mockPost).toHaveBeenCalledWith('/api/notes', noteInput);
    });
  });

  describe('updateNote', () => {
    it('should update an existing note', async () => {
      const noteId = '1';
      const updateInput = { title: 'Updated Note', content: 'This note has been updated', tags: ['updated', 'test'] };
      const mockResponse = {
        data: { id: noteId, ...updateInput }
      };
      mockPut.mockResolvedValueOnce(mockResponse);

      const result = await notesApi.updateNote(noteId, updateInput);
      expect(result).toEqual(mockResponse.data);
      expect(mockPut).toHaveBeenCalledWith(`/api/notes/${noteId}`, updateInput);
    });

    it('should handle invalid note ID format when updating', async () => {
      const noteId = 'invalid-id';
      const updateInput = { title: 'Updated Note' };
      const errorDetail = 'Invalid note ID format';
      const error = createErrorResponse(errorDetail);
      mockPut.mockRejectedValueOnce(error);

      await expect(notesApi.updateNote(noteId, updateInput)).rejects.toThrow(`Failed to update note: ${errorDetail}`);
      expect(mockPut).toHaveBeenCalledWith(`/api/notes/${noteId}`, updateInput);
    });

    it('should handle error when note is not found for update', async () => {
      const noteId = '999';
      const updateInput = { title: 'Updated Note' };
      const errorDetail = 'Note not found';
      const error = createErrorResponse(errorDetail, 404);
      mockPut.mockRejectedValueOnce(error);

      await expect(notesApi.updateNote(noteId, updateInput)).rejects.toThrow(`Failed to update note: ${errorDetail}`);
      expect(mockPut).toHaveBeenCalledWith(`/api/notes/${noteId}`, updateInput);
    });
  });

  describe('deleteNote', () => {
    it('should delete a note', async () => {
      const noteId = '1';
      const mockResponse = { data: {} };
      mockDelete.mockResolvedValueOnce(mockResponse);

      await notesApi.deleteNote(noteId);
      expect(mockDelete).toHaveBeenCalledWith(`/api/notes/${noteId}`);
    });

    it('should handle invalid note ID format when deleting', async () => {
      const noteId = 'invalid-id';
      const errorDetail = 'Invalid note ID format';
      const error = createErrorResponse(errorDetail);
      mockDelete.mockRejectedValueOnce(error);

      await expect(notesApi.deleteNote(noteId)).rejects.toThrow(`Failed to delete note: ${errorDetail}`);
      expect(mockDelete).toHaveBeenCalledWith(`/api/notes/${noteId}`);
    });

    it('should handle error when note is not found for deletion', async () => {
      const noteId = '999';
      const errorDetail = 'Note not found';
      const error = createErrorResponse(errorDetail, 404);
      mockDelete.mockRejectedValueOnce(error);

      await expect(notesApi.deleteNote(noteId)).rejects.toThrow(`Failed to delete note: ${errorDetail}`);
      expect(mockDelete).toHaveBeenCalledWith(`/api/notes/${noteId}`);
    });
  });
});