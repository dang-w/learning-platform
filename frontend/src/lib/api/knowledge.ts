import apiClient from './client';
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

const knowledgeApi = {
  // Concepts
  getConcepts: async (params?: { topic?: string; difficulty?: string }): Promise<Concept[]> => {
    const response = await apiClient.get<Concept[]>('/api/reviews/concepts', { params });
    return response.data;
  },

  getConcept: async (id: string): Promise<Concept> => {
    const response = await apiClient.get<Concept>(`/api/reviews/concepts/${id}`);
    return response.data;
  },

  createConcept: async (concept: ConceptCreateInput): Promise<Concept> => {
    const response = await apiClient.post<Concept>('/api/reviews/concepts', concept);
    return response.data;
  },

  updateConcept: async (concept: ConceptUpdateInput): Promise<Concept> => {
    const response = await apiClient.put<Concept>(`/api/reviews/concepts/${concept.id}`, concept);
    return response.data;
  },

  deleteConcept: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/reviews/concepts/${id}`);
  },

  // Reviews
  reviewConcept: async (review: ReviewCreateInput): Promise<Review> => {
    const response = await apiClient.post<Review>(`/api/reviews/concepts/${review.concept_id}/review`, review);
    return response.data;
  },

  getDueConcepts: async (): Promise<Concept[]> => {
    const response = await apiClient.get<Concept[]>('/api/reviews/due');
    return response.data;
  },

  getNewConcepts: async (limit?: number): Promise<Concept[]> => {
    const response = await apiClient.get<Concept[]>('/api/reviews/new', { params: { limit } });
    return response.data;
  },

  // Review Sessions
  createReviewSession: async (): Promise<ReviewSession> => {
    const response = await apiClient.get<ReviewSession>('/api/reviews/session');
    return response.data;
  },

  completeReviewSession: async (sessionId: string): Promise<void> => {
    await apiClient.post(`/api/reviews/session/${sessionId}/complete`);
  },

  // Statistics
  getReviewStatistics: async (): Promise<ReviewStatistics> => {
    const response = await apiClient.get<ReviewStatistics>('/api/reviews/statistics');
    return response.data;
  },

  // Settings
  getSpacedRepetitionSettings: async (): Promise<SpacedRepetitionSettings> => {
    const response = await apiClient.get<SpacedRepetitionSettings>('/api/reviews/settings');
    return response.data;
  },

  updateSpacedRepetitionSettings: async (settings: Partial<SpacedRepetitionSettings>): Promise<SpacedRepetitionSettings> => {
    const response = await apiClient.put<SpacedRepetitionSettings>('/api/reviews/settings', settings);
    return response.data;
  },
};

export default knowledgeApi;