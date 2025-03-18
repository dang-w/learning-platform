import apiClient from './client';
import { AxiosError } from 'axios';
import {
  Concept,
  ConceptCreateInput,
  ConceptUpdateInput,
  Review,
  ReviewCreateInput,
  ReviewSession,
  ReviewStatistics,
  SpacedRepetitionSettings,
} from '@/types/knowledge';

interface ApiErrorResponse {
  detail?: string;
  message?: string;
}

const knowledgeApi = {
  // Concepts
  getConcepts: async (params?: { topic?: string; difficulty?: string }): Promise<Concept[]> => {
    try {
      const response = await apiClient.get<Concept[]>('/api/reviews/concepts', { params });
      return response.data;
    } catch (error) {
      console.error('Get concepts API error:', error);

      const axiosError = error as AxiosError<ApiErrorResponse>;

      if (axiosError.response?.data?.detail) {
        throw new Error(`Failed to get concepts: ${axiosError.response.data.detail}`);
      } else if (axiosError.response?.data?.message) {
        throw new Error(`Failed to get concepts: ${axiosError.response.data.message}`);
      } else if (axiosError.message) {
        throw new Error(`Failed to get concepts: ${axiosError.message}`);
      }

      throw new Error('Failed to get concepts. Please try again later.');
    }
  },

  getConcept: async (id: string): Promise<Concept> => {
    try {
      const response = await apiClient.get<Concept>(`/api/reviews/concepts/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Get concept ${id} API error:`, error);

      const axiosError = error as AxiosError<ApiErrorResponse>;

      if (axiosError.response?.status === 404) {
        throw new Error(`Concept not found: ${id}`);
      } else if (axiosError.response?.data?.detail) {
        throw new Error(`Failed to get concept: ${axiosError.response.data.detail}`);
      } else if (axiosError.message) {
        throw new Error(`Failed to get concept: ${axiosError.message}`);
      }

      throw new Error('Failed to get concept. Please try again later.');
    }
  },

  createConcept: async (concept: ConceptCreateInput): Promise<Concept> => {
    try {
      const response = await apiClient.post<Concept>('/api/reviews/concepts', concept);
      return response.data;
    } catch (error) {
      console.error('Create concept API error:', error);

      const axiosError = error as AxiosError<ApiErrorResponse>;

      if (axiosError.response?.status === 400) {
        throw new Error(`Invalid concept data: ${axiosError.response.data?.detail || 'Please check your input'}`);
      } else if (axiosError.response?.data?.detail) {
        throw new Error(`Failed to create concept: ${axiosError.response.data.detail}`);
      } else if (axiosError.message) {
        throw new Error(`Failed to create concept: ${axiosError.message}`);
      }

      throw new Error('Failed to create concept. Please try again later.');
    }
  },

  updateConcept: async (concept: ConceptUpdateInput): Promise<Concept> => {
    try {
      const response = await apiClient.put<Concept>(`/api/reviews/concepts/${concept.id}`, concept);
      return response.data;
    } catch (error) {
      console.error(`Update concept ${concept.id} API error:`, error);

      const axiosError = error as AxiosError<ApiErrorResponse>;

      if (axiosError.response?.status === 404) {
        throw new Error(`Concept not found: ${concept.id}`);
      } else if (axiosError.response?.status === 400) {
        throw new Error(`Invalid concept data: ${axiosError.response.data?.detail || 'Please check your input'}`);
      } else if (axiosError.response?.data?.detail) {
        throw new Error(`Failed to update concept: ${axiosError.response.data.detail}`);
      } else if (axiosError.message) {
        throw new Error(`Failed to update concept: ${axiosError.message}`);
      }

      throw new Error('Failed to update concept. Please try again later.');
    }
  },

  deleteConcept: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`/api/reviews/concepts/${id}`);
    } catch (error) {
      console.error(`Delete concept ${id} API error:`, error);

      const axiosError = error as AxiosError<ApiErrorResponse>;

      if (axiosError.response?.status === 404) {
        throw new Error(`Concept not found: ${id}`);
      } else if (axiosError.response?.data?.detail) {
        throw new Error(`Failed to delete concept: ${axiosError.response.data.detail}`);
      } else if (axiosError.message) {
        throw new Error(`Failed to delete concept: ${axiosError.message}`);
      }

      throw new Error('Failed to delete concept. Please try again later.');
    }
  },

  // Reviews
  reviewConcept: async (review: ReviewCreateInput): Promise<Review> => {
    try {
      const response = await apiClient.post<Review>(`/api/reviews/concepts/${review.concept_id}/review`, review);
      return response.data;
    } catch (error) {
      console.error(`Review concept ${review.concept_id} API error:`, error);

      const axiosError = error as AxiosError<ApiErrorResponse>;

      if (axiosError.response?.status === 404) {
        throw new Error(`Concept not found: ${review.concept_id}`);
      } else if (axiosError.response?.data?.detail) {
        throw new Error(`Failed to review concept: ${axiosError.response.data.detail}`);
      } else if (axiosError.message) {
        throw new Error(`Failed to review concept: ${axiosError.message}`);
      }

      throw new Error('Failed to review concept. Please try again later.');
    }
  },

  getDueConcepts: async (): Promise<Concept[]> => {
    try {
      const response = await apiClient.get<Concept[]>('/api/reviews/due');
      return response.data;
    } catch (error) {
      console.error('Get due concepts API error:', error);

      const axiosError = error as AxiosError<ApiErrorResponse>;

      if (axiosError.response?.data?.detail) {
        throw new Error(`Failed to get due concepts: ${axiosError.response.data.detail}`);
      } else if (axiosError.message) {
        throw new Error(`Failed to get due concepts: ${axiosError.message}`);
      }

      throw new Error('Failed to get due concepts. Please try again later.');
    }
  },

  getNewConcepts: async (limit?: number): Promise<Concept[]> => {
    try {
      const response = await apiClient.get<Concept[]>('/api/reviews/new', { params: { limit } });
      return response.data;
    } catch (error) {
      console.error('Get new concepts API error:', error);

      const axiosError = error as AxiosError<ApiErrorResponse>;

      if (axiosError.response?.data?.detail) {
        throw new Error(`Failed to get new concepts: ${axiosError.response.data.detail}`);
      } else if (axiosError.message) {
        throw new Error(`Failed to get new concepts: ${axiosError.message}`);
      }

      throw new Error('Failed to get new concepts. Please try again later.');
    }
  },

  // Review Sessions
  createReviewSession: async (): Promise<ReviewSession> => {
    try {
      const response = await apiClient.get<ReviewSession>('/api/reviews/session');
      return response.data;
    } catch (error) {
      console.error('Create review session API error:', error);

      const axiosError = error as AxiosError<ApiErrorResponse>;

      if (axiosError.response?.data?.detail) {
        throw new Error(`Failed to create review session: ${axiosError.response.data.detail}`);
      } else if (axiosError.message) {
        throw new Error(`Failed to create review session: ${axiosError.message}`);
      }

      throw new Error('Failed to create review session. Please try again later.');
    }
  },

  completeReviewSession: async (sessionId: string): Promise<void> => {
    try {
      await apiClient.post(`/api/reviews/session/${sessionId}/complete`);
    } catch (error) {
      console.error(`Complete review session ${sessionId} API error:`, error);

      const axiosError = error as AxiosError<ApiErrorResponse>;

      if (axiosError.response?.status === 404) {
        throw new Error(`Review session not found: ${sessionId}`);
      } else if (axiosError.response?.data?.detail) {
        throw new Error(`Failed to complete review session: ${axiosError.response.data.detail}`);
      } else if (axiosError.message) {
        throw new Error(`Failed to complete review session: ${axiosError.message}`);
      }

      throw new Error('Failed to complete review session. Please try again later.');
    }
  },

  // Statistics
  getReviewStatistics: async (): Promise<ReviewStatistics> => {
    try {
      const response = await apiClient.get<ReviewStatistics>('/api/reviews/statistics');
      return response.data;
    } catch (error) {
      console.error('Get review statistics API error:', error);

      const axiosError = error as AxiosError<ApiErrorResponse>;

      if (axiosError.response?.data?.detail) {
        throw new Error(`Failed to get review statistics: ${axiosError.response.data.detail}`);
      } else if (axiosError.message) {
        throw new Error(`Failed to get review statistics: ${axiosError.message}`);
      }

      throw new Error('Failed to get review statistics. Please try again later.');
    }
  },

  // Settings
  getSpacedRepetitionSettings: async (): Promise<SpacedRepetitionSettings> => {
    try {
      const response = await apiClient.get<SpacedRepetitionSettings>('/api/reviews/settings');
      return response.data;
    } catch (error) {
      console.error('Get spaced repetition settings API error:', error);

      const axiosError = error as AxiosError<ApiErrorResponse>;

      if (axiosError.response?.data?.detail) {
        throw new Error(`Failed to get spaced repetition settings: ${axiosError.response.data.detail}`);
      } else if (axiosError.message) {
        throw new Error(`Failed to get spaced repetition settings: ${axiosError.message}`);
      }

      throw new Error('Failed to get spaced repetition settings. Please try again later.');
    }
  },

  updateSpacedRepetitionSettings: async (settings: Partial<SpacedRepetitionSettings>): Promise<SpacedRepetitionSettings> => {
    try {
      const response = await apiClient.put<SpacedRepetitionSettings>('/api/reviews/settings', settings);
      return response.data;
    } catch (error) {
      console.error('Update spaced repetition settings API error:', error);

      const axiosError = error as AxiosError<ApiErrorResponse>;

      if (axiosError.response?.status === 400) {
        throw new Error(`Invalid settings data: ${axiosError.response.data?.detail || 'Please check your input'}`);
      } else if (axiosError.response?.data?.detail) {
        throw new Error(`Failed to update spaced repetition settings: ${axiosError.response.data.detail}`);
      } else if (axiosError.message) {
        throw new Error(`Failed to update spaced repetition settings: ${axiosError.message}`);
      }

      throw new Error('Failed to update spaced repetition settings. Please try again later.');
    }
  },
};

export default knowledgeApi;