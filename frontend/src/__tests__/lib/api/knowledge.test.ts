import knowledgeApi from '@/lib/api/knowledge';
import apiClient from '@/lib/api/client';
import {
  Concept,
  ConceptCreateInput,
  ConceptUpdateInput,
  Review,
  ReviewCreateInput,
  ReviewSession,
  ReviewStatistics,
  SpacedRepetitionSettings,
  SpacedRepetitionAlgorithm,
} from '@/types/knowledge';
import { expect } from '@jest/globals';

// Mock the apiClient
jest.mock('@/lib/api/client', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

describe('Knowledge API', () => {
  // Use type-safe mocking approach
  const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getConcepts', () => {
    it('should call the getConcepts endpoint', async () => {
      // Mock response
      const mockConcepts: Concept[] = [
        {
          id: '1',
          title: 'Test Concept',
          content: 'Test Content',
          topics: ['javascript'],
          difficulty: 'beginner',
          created_at: '2023-01-01T00:00:00Z',
          review_count: 0,
          confidence_level: 0,
          user_id: '1',
          reviews: [],
          next_review: null,
          updated_at: '2023-01-01T00:00:00Z',
        },
      ];
      mockedApiClient.get.mockResolvedValue({ data: mockConcepts });

      // Call the function
      const result = await knowledgeApi.getConcepts();

      // Assertions
      expect(mockedApiClient.get).toHaveBeenCalledWith('/api/reviews/concepts', { params: undefined });
      expect(result).toEqual(mockConcepts);
    });

    it('should call the getConcepts endpoint with params', async () => {
      // Mock response
      const mockConcepts: Concept[] = [
        {
          id: '1',
          title: 'Test Concept',
          content: 'Test Content',
          topics: ['javascript'],
          difficulty: 'beginner',
          created_at: '2023-01-01T00:00:00Z',
          review_count: 0,
          confidence_level: 0,
          user_id: '1',
          reviews: [],
          next_review: null,
          updated_at: '2023-01-01T00:00:00Z',
        },
      ];
      mockedApiClient.get.mockResolvedValue({ data: mockConcepts });

      // Call the function with params
      const params = { topic: 'javascript', difficulty: 'beginner' };
      const result = await knowledgeApi.getConcepts(params);

      // Assertions
      expect(mockedApiClient.get).toHaveBeenCalledWith('/api/reviews/concepts', { params });
      expect(result).toEqual(mockConcepts);
    });
  });

  describe('getConcept', () => {
    it('should call the getConcept endpoint', async () => {
      // Mock response
      const mockConcept: Concept = {
        id: '1',
        title: 'Test Concept',
        content: 'Test Content',
        topics: ['javascript'],
        difficulty: 'beginner',
        created_at: '2023-01-01T00:00:00Z',
        review_count: 0,
        confidence_level: 0,
        user_id: '1',
        reviews: [],
        next_review: null,
        updated_at: '2023-01-01T00:00:00Z',
      };
      mockedApiClient.get.mockResolvedValue({ data: mockConcept });

      // Call the function
      const result = await knowledgeApi.getConcept('1');

      // Assertions
      expect(mockedApiClient.get).toHaveBeenCalledWith('/api/reviews/concepts/1');
      expect(result).toEqual(mockConcept);
    });
  });

  describe('createConcept', () => {
    it('should call the createConcept endpoint', async () => {
      // Mock response
      const mockConcept: Concept = {
        id: '1',
        title: 'Test Concept',
        content: 'Test Content',
        topics: ['javascript'],
        difficulty: 'beginner',
        created_at: '2023-01-01T00:00:00Z',
        review_count: 0,
        confidence_level: 0,
        user_id: '1',
        reviews: [],
        next_review: null,
        updated_at: '2023-01-01T00:00:00Z',
      };
      mockedApiClient.post.mockResolvedValue({ data: mockConcept });

      // Test data
      const conceptData: ConceptCreateInput = {
        title: 'Test Concept',
        content: 'Test Content',
        topics: ['javascript'],
        difficulty: 'beginner',
      };

      // Call the function
      const result = await knowledgeApi.createConcept(conceptData);

      // Assertions
      expect(mockedApiClient.post).toHaveBeenCalledWith('/api/reviews/concepts', conceptData);
      expect(result).toEqual(mockConcept);
    });
  });

  describe('updateConcept', () => {
    it('should call the updateConcept endpoint', async () => {
      // Mock response
      const mockConcept: Concept = {
        id: '1',
        title: 'Updated Concept',
        content: 'Updated Content',
        topics: ['javascript', 'typescript'],
        difficulty: 'beginner',
        created_at: '2023-01-01T00:00:00Z',
        review_count: 0,
        confidence_level: 0,
        user_id: '1',
        reviews: [],
        next_review: null,
        updated_at: '2023-01-01T00:00:00Z',
      };
      mockedApiClient.put.mockResolvedValue({ data: mockConcept });

      // Test data
      const conceptData: ConceptUpdateInput = {
        id: '1',
        title: 'Updated Concept',
        content: 'Updated Content',
        topics: ['javascript', 'typescript'],
        difficulty: 'beginner',
      };

      // Call the function
      const result = await knowledgeApi.updateConcept(conceptData);

      // Assertions
      expect(mockedApiClient.put).toHaveBeenCalledWith('/api/reviews/concepts/1', conceptData);
      expect(result).toEqual(mockConcept);
    });
  });

  describe('deleteConcept', () => {
    it('should call the deleteConcept endpoint', async () => {
      // Mock response
      (apiClient.delete as jest.Mock).mockResolvedValue({});

      // Call the function
      await knowledgeApi.deleteConcept('1');

      // Assertions
      expect(apiClient.delete).toHaveBeenCalledWith('/api/reviews/concepts/1');
    });
  });

  describe('reviewConcept', () => {
    it('should call the reviewConcept endpoint', async () => {
      // Mock response
      const mockReview: Review = {
        id: '1',
        concept_id: '1',
        confidence_level: 4,
        notes: '',
        user_id: '1',
        created_at: '2023-01-01T00:00:00Z',
      };
      (apiClient.post as jest.Mock).mockResolvedValue({ data: mockReview });

      // Test data
      const reviewData: ReviewCreateInput = {
        concept_id: '1',
        confidence_level: 4,
        notes: '',
      };

      // Call the function
      const result = await knowledgeApi.reviewConcept(reviewData);

      // Assertions
      expect(apiClient.post).toHaveBeenCalledWith('/api/reviews/concepts/1/review', reviewData);
      expect(result).toEqual(mockReview);
    });
  });

  describe('getDueConcepts', () => {
    it('should call the getDueConcepts endpoint', async () => {
      // Mock response
      const mockConcepts: Concept[] = [
        {
          id: '1',
          title: 'Test Concept',
          content: 'Test Content',
          topics: ['javascript'],
          difficulty: 'beginner',
          created_at: '2023-01-01T00:00:00Z',
          review_count: 0,
          confidence_level: 0,
          user_id: '1',
          reviews: [],
          next_review: null,
          updated_at: '2023-01-01T00:00:00Z',
        },
      ];
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockConcepts });

      // Call the function
      const result = await knowledgeApi.getDueConcepts();

      // Assertions
      expect(apiClient.get).toHaveBeenCalledWith('/api/reviews/due');
      expect(result).toEqual(mockConcepts);
    });
  });

  describe('getNewConcepts', () => {
    it('should call the getNewConcepts endpoint', async () => {
      // Mock response
      const mockConcepts: Concept[] = [
        {
          id: '1',
          title: 'Test Concept',
          content: 'Test Content',
          topics: ['javascript'],
          difficulty: 'beginner',
          created_at: '2023-01-01T00:00:00Z',
          review_count: 0,
          confidence_level: 0,
          user_id: '1',
          reviews: [],
          next_review: null,
          updated_at: '2023-01-01T00:00:00Z',
        },
      ];
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockConcepts });

      // Call the function
      const result = await knowledgeApi.getNewConcepts(5);

      // Assertions
      expect(apiClient.get).toHaveBeenCalledWith('/api/reviews/new', { params: { limit: 5 } });
      expect(result).toEqual(mockConcepts);
    });
  });

  describe('createReviewSession', () => {
    it('should call the createReviewSession endpoint', async () => {
      // Mock response
      const mockSession: ReviewSession = {
        id: '1',
        date: '2023-01-01T00:00:00Z',
        completed: false,
        concepts: [
          {
            id: '1',
            title: 'Test Concept',
            content: 'Test Content',
            topics: ['javascript'],
            difficulty: 'beginner',
            created_at: '2023-01-01T00:00:00Z',
            review_count: 0,
            confidence_level: 0,
            user_id: '1',
            reviews: [],
            next_review: null,
            updated_at: '2023-01-01T00:00:00Z',
          },
        ],
      };
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockSession });

      // Call the function
      const result = await knowledgeApi.createReviewSession();

      // Assertions
      expect(apiClient.get).toHaveBeenCalledWith('/api/reviews/session');
      expect(result).toEqual(mockSession);
    });
  });

  describe('completeReviewSession', () => {
    it('should call the completeReviewSession endpoint', async () => {
      // Mock response
      (apiClient.post as jest.Mock).mockResolvedValue({});

      // Call the function
      await knowledgeApi.completeReviewSession('1');

      // Assertions
      expect(apiClient.post).toHaveBeenCalledWith('/api/reviews/session/1/complete');
    });
  });

  describe('getReviewStatistics', () => {
    it('should call the getReviewStatistics endpoint', async () => {
      // Mock response
      const mockStats: ReviewStatistics = {
        total_concepts: 10,
        concepts_due: 3,
        average_confidence: 4.2,
        concepts_by_confidence: {
          1: 1,
          2: 2,
          3: 3,
          4: 4,
          5: 5,
        },
        concepts_by_topic: {
          'javascript': 3,
          'typescript': 2,
        },
        review_streak: 3,
        total_reviews: 10,
        concepts_with_reviews: 7,
        concepts_without_reviews: 3,
        topics: ['javascript', 'typescript'],
        review_history: [],
        top_topics: [{ name: 'javascript', count: 3 }, { name: 'typescript', count: 2 }],
        recently_reviewed_concepts: [],
        due_concepts: 3,
        streak_days: 3,
      };
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockStats });

      // Call the function
      const result = await knowledgeApi.getReviewStatistics();

      // Assertions
      expect(apiClient.get).toHaveBeenCalledWith('/api/reviews/statistics');
      expect(result).toEqual(mockStats);
    });
  });

  describe('getSpacedRepetitionSettings', () => {
    it('should call the getSpacedRepetitionSettings endpoint', async () => {
      // Mock response
      const mockSettings: SpacedRepetitionSettings = {
        algorithm: SpacedRepetitionAlgorithm.SM2,
        daily_review_limit: 20,
        include_new_concepts: true,
        new_concepts_per_day: 5,
      };
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockSettings });

      // Call the function
      const result = await knowledgeApi.getSpacedRepetitionSettings();

      // Assertions
      expect(apiClient.get).toHaveBeenCalledWith('/api/reviews/settings');
      expect(result).toEqual(mockSettings);
    });
  });

  describe('updateSpacedRepetitionSettings', () => {
    it('should call the updateSpacedRepetitionSettings endpoint', async () => {
      // Mock response
      const mockSettings: SpacedRepetitionSettings = {
        algorithm: SpacedRepetitionAlgorithm.SM2,
        daily_review_limit: 25,
        include_new_concepts: true,
        new_concepts_per_day: 5,
      };
      (apiClient.put as jest.Mock).mockResolvedValue({ data: mockSettings });

      // Test data
      const settingsData: Partial<SpacedRepetitionSettings> = {
        algorithm: SpacedRepetitionAlgorithm.SM2,
        daily_review_limit: 25,
        include_new_concepts: true,
        new_concepts_per_day: 5,
      };

      // Call the function
      const result = await knowledgeApi.updateSpacedRepetitionSettings(settingsData);

      // Assertions
      expect(apiClient.put).toHaveBeenCalledWith('/api/reviews/settings', settingsData);
      expect(result).toEqual(mockSettings);
    });
  });
});