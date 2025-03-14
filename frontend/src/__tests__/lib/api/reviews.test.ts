import reviewsApi, {
  Concept,
  ConceptCreate,
  ConceptUpdate,
  ReviewCreate,
  ReviewSession,
  ReviewStatistics,
} from '@/lib/api/reviews';
import apiClient from '@/lib/api/client';

// Mock the apiClient
jest.mock('@/lib/api/client', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

describe('Reviews API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createConcept', () => {
    it('should call the createConcept endpoint', async () => {
      // Mock response
      const mockConcept: Concept = {
        id: '1',
        title: 'React Hooks',
        content: 'Hooks are functions that let you "hook into" React state and lifecycle features from function components.',
        topics: ['react', 'hooks'],
        reviews: [],
        next_review: null,
      };
      (apiClient.post as jest.Mock).mockResolvedValue({ data: mockConcept });

      // Test data
      const conceptData: ConceptCreate = {
        title: 'React Hooks',
        content: 'Hooks are functions that let you "hook into" React state and lifecycle features from function components.',
        topics: ['react', 'hooks'],
      };

      // Call the function
      const result = await reviewsApi.createConcept(conceptData);

      // Assertions
      expect(apiClient.post).toHaveBeenCalledWith('/api/reviews/concepts', conceptData);
      expect(result).toEqual(mockConcept);
    });
  });

  describe('getConcepts', () => {
    it('should call the getConcepts endpoint without topic', async () => {
      // Mock response
      const mockConcepts: Concept[] = [
        {
          id: '1',
          title: 'React Hooks',
          content: 'Hooks are functions that let you "hook into" React state and lifecycle features from function components.',
          topics: ['react', 'hooks'],
          reviews: [],
          next_review: null,
        },
      ];
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockConcepts });

      // Call the function
      const result = await reviewsApi.getConcepts();

      // Assertions
      expect(apiClient.get).toHaveBeenCalledWith('/api/reviews/concepts');
      expect(result).toEqual(mockConcepts);
    });

    it('should call the getConcepts endpoint with topic', async () => {
      // Mock response
      const mockConcepts: Concept[] = [
        {
          id: '1',
          title: 'React Hooks',
          content: 'Hooks are functions that let you "hook into" React state and lifecycle features from function components.',
          topics: ['react', 'hooks'],
          reviews: [],
          next_review: null,
        },
      ];
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockConcepts });

      // Call the function with topic
      const topic = 'react';
      const result = await reviewsApi.getConcepts(topic);

      // Assertions
      expect(apiClient.get).toHaveBeenCalledWith('/api/reviews/concepts?topic=react');
      expect(result).toEqual(mockConcepts);
    });
  });

  describe('getConcept', () => {
    it('should call the getConcept endpoint', async () => {
      // Mock response
      const mockConcept: Concept = {
        id: '1',
        title: 'React Hooks',
        content: 'Hooks are functions that let you "hook into" React state and lifecycle features from function components.',
        topics: ['react', 'hooks'],
        reviews: [],
        next_review: null,
      };
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockConcept });

      // Call the function
      const result = await reviewsApi.getConcept('1');

      // Assertions
      expect(apiClient.get).toHaveBeenCalledWith('/api/reviews/concepts/1');
      expect(result).toEqual(mockConcept);
    });
  });

  describe('updateConcept', () => {
    it('should call the updateConcept endpoint', async () => {
      // Mock response
      const mockConcept: Concept = {
        id: '1',
        title: 'Updated React Hooks',
        content: 'Updated content about React Hooks.',
        topics: ['react', 'hooks', 'state-management'],
        reviews: [],
        next_review: null,
      };
      (apiClient.put as jest.Mock).mockResolvedValue({ data: mockConcept });

      // Test data
      const conceptId = '1';
      const conceptData: ConceptUpdate = {
        title: 'Updated React Hooks',
        content: 'Updated content about React Hooks.',
        topics: ['react', 'hooks', 'state-management'],
      };

      // Call the function
      const result = await reviewsApi.updateConcept(conceptId, conceptData);

      // Assertions
      expect(apiClient.put).toHaveBeenCalledWith('/api/reviews/concepts/1', conceptData);
      expect(result).toEqual(mockConcept);
    });
  });

  describe('deleteConcept', () => {
    it('should call the deleteConcept endpoint', async () => {
      // Mock response
      (apiClient.delete as jest.Mock).mockResolvedValue({});

      // Call the function
      await reviewsApi.deleteConcept('1');

      // Assertions
      expect(apiClient.delete).toHaveBeenCalledWith('/api/reviews/concepts/1');
    });
  });

  describe('markConceptReviewed', () => {
    it('should call the markConceptReviewed endpoint', async () => {
      // Mock response
      const mockConcept: Concept = {
        id: '1',
        title: 'React Hooks',
        content: 'Hooks are functions that let you "hook into" React state and lifecycle features from function components.',
        topics: ['react', 'hooks'],
        reviews: [
          {
            date: '2023-01-01',
            confidence: 4,
          },
        ],
        next_review: '2023-01-08',
      };
      (apiClient.post as jest.Mock).mockResolvedValue({ data: mockConcept });

      // Test data
      const conceptId = '1';
      const reviewData: ReviewCreate = {
        confidence: 4,
      };

      // Call the function
      const result = await reviewsApi.markConceptReviewed(conceptId, reviewData);

      // Assertions
      expect(apiClient.post).toHaveBeenCalledWith('/api/reviews/concepts/1/review', reviewData);
      expect(result).toEqual(mockConcept);
    });
  });

  describe('getDueConcepts', () => {
    it('should call the getDueConcepts endpoint', async () => {
      // Mock response
      const mockConcepts: Concept[] = [
        {
          id: '1',
          title: 'React Hooks',
          content: 'Hooks are functions that let you "hook into" React state and lifecycle features from function components.',
          topics: ['react', 'hooks'],
          reviews: [
            {
              date: '2023-01-01',
              confidence: 3,
            },
          ],
          next_review: '2023-01-08',
        },
      ];
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockConcepts });

      // Call the function
      const result = await reviewsApi.getDueConcepts();

      // Assertions
      expect(apiClient.get).toHaveBeenCalledWith('/api/reviews/due');
      expect(result).toEqual(mockConcepts);
    });
  });

  describe('getNewConcepts', () => {
    it('should call the getNewConcepts endpoint with default count', async () => {
      // Mock response
      const mockConcepts: Concept[] = [
        {
          id: '1',
          title: 'React Hooks',
          content: 'Hooks are functions that let you "hook into" React state and lifecycle features from function components.',
          topics: ['react', 'hooks'],
          reviews: [],
          next_review: null,
        },
        {
          id: '2',
          title: 'React Context',
          content: 'Context provides a way to pass data through the component tree without having to pass props down manually at every level.',
          topics: ['react', 'context'],
          reviews: [],
          next_review: null,
        },
        {
          id: '3',
          title: 'React Suspense',
          content: 'Suspense lets your components "wait" for something before they can render.',
          topics: ['react', 'suspense'],
          reviews: [],
          next_review: null,
        },
      ];
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockConcepts });

      // Call the function
      const result = await reviewsApi.getNewConcepts();

      // Assertions
      expect(apiClient.get).toHaveBeenCalledWith('/api/reviews/new?count=3');
      expect(result).toEqual(mockConcepts);
    });

    it('should call the getNewConcepts endpoint with custom count', async () => {
      // Mock response
      const mockConcepts: Concept[] = [
        {
          id: '1',
          title: 'React Hooks',
          content: 'Hooks are functions that let you "hook into" React state and lifecycle features from function components.',
          topics: ['react', 'hooks'],
          reviews: [],
          next_review: null,
        },
        {
          id: '2',
          title: 'React Context',
          content: 'Context provides a way to pass data through the component tree without having to pass props down manually at every level.',
          topics: ['react', 'context'],
          reviews: [],
          next_review: null,
        },
      ];
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockConcepts });

      // Call the function with custom count
      const count = 2;
      const result = await reviewsApi.getNewConcepts(count);

      // Assertions
      expect(apiClient.get).toHaveBeenCalledWith('/api/reviews/new?count=2');
      expect(result).toEqual(mockConcepts);
    });
  });

  describe('generateReviewSession', () => {
    it('should call the generateReviewSession endpoint with default maxReviews', async () => {
      // Mock response
      const mockSession: ReviewSession = {
        date: '2023-01-01',
        concepts: [
          {
            id: '1',
            title: 'React Hooks',
            content: 'Hooks are functions that let you "hook into" React state and lifecycle features from function components.',
            topics: ['react', 'hooks'],
            reviews: [
              {
                date: '2022-12-25',
                confidence: 3,
              },
            ],
            next_review: '2023-01-01',
          },
        ],
        new_concepts: [
          {
            id: '2',
            title: 'React Context',
            content: 'Context provides a way to pass data through the component tree without having to pass props down manually at every level.',
            topics: ['react', 'context'],
            reviews: [],
            next_review: null,
          },
        ],
      };
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockSession });

      // Call the function
      const result = await reviewsApi.generateReviewSession();

      // Assertions
      expect(apiClient.get).toHaveBeenCalledWith('/api/reviews/session?max_reviews=5');
      expect(result).toEqual(mockSession);
    });

    it('should call the generateReviewSession endpoint with custom maxReviews', async () => {
      // Mock response
      const mockSession: ReviewSession = {
        date: '2023-01-01',
        concepts: [
          {
            id: '1',
            title: 'React Hooks',
            content: 'Hooks are functions that let you "hook into" React state and lifecycle features from function components.',
            topics: ['react', 'hooks'],
            reviews: [
              {
                date: '2022-12-25',
                confidence: 3,
              },
            ],
            next_review: '2023-01-01',
          },
        ],
        new_concepts: [
          {
            id: '2',
            title: 'React Context',
            content: 'Context provides a way to pass data through the component tree without having to pass props down manually at every level.',
            topics: ['react', 'context'],
            reviews: [],
            next_review: null,
          },
        ],
      };
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockSession });

      // Call the function with custom maxReviews
      const maxReviews = 3;
      const result = await reviewsApi.generateReviewSession(maxReviews);

      // Assertions
      expect(apiClient.get).toHaveBeenCalledWith('/api/reviews/session?max_reviews=3');
      expect(result).toEqual(mockSession);
    });
  });

  describe('getReviewStatistics', () => {
    it('should call the getReviewStatistics endpoint', async () => {
      // Mock response
      const mockStats: ReviewStatistics = {
        total_concepts: 10,
        reviewed_concepts: 5,
        due_reviews: 2,
        new_concepts: 5,
        review_counts: {
          1: 2,
          2: 1,
          3: 1,
          4: 1,
        },
        average_confidence: 3.2,
        review_history: {
          last_7_days: 5,
          last_30_days: 15,
          all_time: 25,
        },
        confidence_distribution: {
          1: 2,
          2: 3,
          3: 10,
          4: 10,
        },
      };
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockStats });

      // Call the function
      const result = await reviewsApi.getReviewStatistics();

      // Assertions
      expect(apiClient.get).toHaveBeenCalledWith('/api/reviews/statistics');
      expect(result).toEqual(mockStats);
    });
  });
});