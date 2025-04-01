import { AxiosError } from 'axios';
import apiClient from './client';
import { Note, NoteCreateInput, NoteUpdateInput, NotePagination } from '@/types/notes';
import { ApiErrorResponse } from '@/types/api';

const notesApi = {
  /**
   * Get all notes for the current user
   * @param tag Optional tag to filter notes by
   * @param skip Number of notes to skip for pagination
   * @param limit Maximum number of notes to return
   */
  getNotes: async (tag?: string, skip: number = 0, limit: number = 20): Promise<NotePagination> => {
    try {
      const params = new URLSearchParams();
      if (tag) params.append('tag', tag);
      params.append('skip', skip.toString());
      params.append('limit', limit.toString());

      const url = `/api/notes?${params.toString()}`;
      const response = await apiClient.get<NotePagination>(url);
      return response.data;
    } catch (error) {
      console.error('Get notes API error:', error);

      const axiosError = error as AxiosError<ApiErrorResponse>;

      if (axiosError.response?.data?.detail) {
        throw new Error(`Failed to get notes: ${axiosError.response.data.detail}`);
      } else if (axiosError.message) {
        throw new Error(`Failed to get notes: ${axiosError.message}`);
      }

      throw new Error('Failed to get notes. Please try again later.');
    }
  },

  /**
   * Get a specific note by ID
   * @param id Note ID
   */
  getNote: async (id: string): Promise<Note> => {
    try {
      const response = await apiClient.get<Note>(`/api/notes/${id}`);
      return response.data;
    } catch (error) {
      console.error('Get note API error:', error);

      const axiosError = error as AxiosError<ApiErrorResponse>;

      if (axiosError.response?.data?.detail) {
        throw new Error(`Failed to get note: ${axiosError.response.data.detail}`);
      } else if (axiosError.message) {
        throw new Error(`Failed to get note: ${axiosError.message}`);
      }

      throw new Error('Failed to get note. Please try again later.');
    }
  },

  /**
   * Create a new note
   * @param note Note data to create
   */
  createNote: async (note: NoteCreateInput): Promise<Note> => {
    try {
      const response = await apiClient.post<Note>('/api/notes', note);
      return response.data;
    } catch (error) {
      console.error('Create note API error:', error);
      const axiosError = error as AxiosError<ApiErrorResponse>;
      let message = 'Failed to create note. Please try again later.'; // Default message

      if (axiosError.response?.data?.detail) {
        message = `Failed to create note: ${axiosError.response.data.detail}`; // Use backend detail
      } else if (axiosError.response?.data?.error) {
        // Fallback if detail is missing but error field exists
        message = `Failed to create note: ${axiosError.response.data.error}`;
      } else if (axiosError.message) {
        message = `Failed to create note: ${axiosError.message}`; // Use Axios message
      }
      throw new Error(message); // Throw the refined error message
    }
  },

  /**
   * Update an existing note
   * @param id Note ID
   * @param note Note data to update
   */
  updateNote: async (id: string, note: NoteUpdateInput): Promise<Note> => {
    try {
      const response = await apiClient.put<Note>(`/api/notes/${id}`, note);
      return response.data;
    } catch (error) {
      console.error('Update note API error:', error);
      const axiosError = error as AxiosError<ApiErrorResponse>;
      let message = 'Failed to update note. Please try again later.';
      if (axiosError.response?.data?.detail) {
        message = `Failed to update note: ${axiosError.response.data.detail}`;
      } else if (axiosError.response?.data?.error) {
        message = `Failed to update note: ${axiosError.response.data.error}`;
      } else if (axiosError.message) {
        message = `Failed to update note: ${axiosError.message}`;
      }
      throw new Error(message);
    }
  },

  /**
   * Delete a note
   * @param id Note ID
   */
  deleteNote: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`/api/notes/${id}`);
    } catch (error) {
      console.error('Delete note API error:', error);
      const axiosError = error as AxiosError<ApiErrorResponse>;
      let message = 'Failed to delete note. Please try again later.';
      if (axiosError.response?.data?.detail) {
        message = `Failed to delete note: ${axiosError.response.data.detail}`;
      } else if (axiosError.response?.data?.error) {
        message = `Failed to delete note: ${axiosError.response.data.error}`;
      } else if (axiosError.message) {
        message = `Failed to delete note: ${axiosError.message}`;
      }
      throw new Error(message);
    }
  }
};

export default notesApi;