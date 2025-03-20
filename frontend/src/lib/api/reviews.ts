import apiClient from './client';

export interface Review {
  date: string;
  confidence: number;
}

export interface Concept {
  id: string;
  title: string;
  content: string;
  topics: string[];
  reviews: Review[];
  next_review: string | null;
}

export interface ConceptCreate {
  title: string;
  content: string;
  topics: string[];
}

export interface ConceptUpdate {
  title?: string;
  content?: string;
  topics?: string[];
}

export interface ReviewCreate {
  confidence: number;
}

export interface ReviewSession {
  date: string;
  concepts: Concept[];
  new_concepts: Concept[];
}

export interface ReviewStatistics {
  total_concepts: number;
  reviewed_concepts: number;
  due_reviews: number;
  new_concepts: number;
  review_counts: Record<number, number>;
  average_confidence: number;
  review_history: {
    last_7_days: number;
    last_30_days: number;
    all_time: number;
  };
  confidence_distribution: Record<number, number>;
}

const reviewsApi = {
  createConcept: async (data: ConceptCreate): Promise<Concept> => {
    const response = await apiClient.post<Concept>('/reviews/concepts', data);
    return response.data;
  },

  getConcepts: async (topic?: string): Promise<Concept[]> => {
    let url = '/reviews/concepts';
    if (topic) {
      url += `?topic=${encodeURIComponent(topic)}`;
    }

    const response = await apiClient.get<Concept[]>(url);
    return response.data;
  },

  getConcept: async (conceptId: string): Promise<Concept> => {
    const response = await apiClient.get<Concept>(`/reviews/concepts/${conceptId}`);
    return response.data;
  },

  updateConcept: async (conceptId: string, data: ConceptUpdate): Promise<Concept> => {
    const response = await apiClient.put<Concept>(`/reviews/concepts/${conceptId}`, data);
    return response.data;
  },

  deleteConcept: async (conceptId: string): Promise<void> => {
    await apiClient.delete(`/reviews/concepts/${conceptId}`);
  },

  markConceptReviewed: async (conceptId: string, data: ReviewCreate): Promise<Concept> => {
    const response = await apiClient.post<Concept>(`/reviews/concepts/${conceptId}/review`, data);
    return response.data;
  },

  getDueConcepts: async (): Promise<Concept[]> => {
    const response = await apiClient.get<Concept[]>('/reviews/due');
    return response.data;
  },

  getNewConcepts: async (count: number = 3): Promise<Concept[]> => {
    const response = await apiClient.get<Concept[]>(`/reviews/new?count=${count}`);
    return response.data;
  },

  generateReviewSession: async (maxReviews: number = 5): Promise<ReviewSession> => {
    const response = await apiClient.get<ReviewSession>(`/reviews/session?max_reviews=${maxReviews}`);
    return response.data;
  },

  getReviewStatistics: async (): Promise<ReviewStatistics> => {
    try {
      console.log('Fetching review statistics...');
      const response = await apiClient.get('/reviews/statistics');
      console.log('Review statistics response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching review statistics:', error);
      throw error;
    }
  },
};

export default reviewsApi;