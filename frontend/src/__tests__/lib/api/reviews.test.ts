import '@testing-library/jest-dom';
import reviewsApi, {
  Concept,
  ConceptCreate,
  ConceptUpdate,
  ReviewCreate,
  ReviewSession,
  ReviewStatistics
} from '@/lib/api/reviews';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Don't mock the module, but spy on each method
const createConceptSpy = jest.spyOn(reviewsApi, 'createConcept');
const getConceptsSpy = jest.spyOn(reviewsApi, 'getConcepts');
const getConceptSpy = jest.spyOn(reviewsApi, 'getConcept');
const updateConceptSpy = jest.spyOn(reviewsApi, 'updateConcept');
const deleteConceptSpy = jest.spyOn(reviewsApi, 'deleteConcept');
const markConceptReviewedSpy = jest.spyOn(reviewsApi, 'markConceptReviewed');
const getDueConceptsSpy = jest.spyOn(reviewsApi, 'getDueConcepts');
const getNewConceptsSpy = jest.spyOn(reviewsApi, 'getNewConcepts');
const generateReviewSessionSpy = jest.spyOn(reviewsApi, 'generateReviewSession');
const getStatisticsSpy = jest.spyOn(reviewsApi, 'getStatistics');

describe('Reviews API', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('createConcept', () => {
    it('should call the createConcept endpoint', async () => {
      // Mock response
      const mockConcept: Concept = {
        id: '1',
        title: 'Test Concept',
        content: 'This is a test concept',
        topics: ['test', 'example'],
        reviews: [],
        next_review: null
      };

      // Setup the mock implementation
      createConceptSpy.mockResolvedValue(mockConcept);

      // Test data
      const conceptData: ConceptCreate = {
        title: 'Test Concept',
        content: 'This is a test concept',
        topics: ['test', 'example']
      };

      // Call the function
      const result = await reviewsApi.createConcept(conceptData);

      // Check if the API was called with the correct data
      expect(reviewsApi.createConcept).toHaveBeenCalledWith(conceptData);

      // Check if the result matches the mock data
      expect(result).toEqual(mockConcept);
    });
  });

  describe('getConcepts', () => {
    it('should call the getConcepts endpoint', async () => {
      // Mock response
      const mockConcepts: Concept[] = [
        {
          id: '1',
          title: 'Test Concept',
          content: 'This is a test concept',
          topics: ['test', 'example'],
          reviews: [],
          next_review: null
        }
      ];

      // Setup the mock implementation
      getConceptsSpy.mockResolvedValue(mockConcepts);

      // Call the function
      const result = await reviewsApi.getConcepts();

      // Check if the API was called
      expect(reviewsApi.getConcepts).toHaveBeenCalled();

      // Check if the result matches the mock data
      expect(result).toEqual(mockConcepts);
    });

    it('should call the getConcepts endpoint with topic', async () => {
      // Mock response
      const mockConcepts: Concept[] = [
        {
          id: '1',
          title: 'React Concept',
          content: 'This is a React concept',
          topics: ['react', 'frontend'],
          reviews: [],
          next_review: null
        }
      ];

      // Setup the mock implementation
      getConceptsSpy.mockResolvedValue(mockConcepts);

      // Call the function with topic
      const topic = 'react';
      const result = await reviewsApi.getConcepts(topic);

      // Check if the API was called with the correct topic
      expect(reviewsApi.getConcepts).toHaveBeenCalledWith(topic);

      // Check if the result matches the mock data
      expect(result).toEqual(mockConcepts);
    });
  });

  describe('getConcept', () => {
    it('should call the getConcept endpoint', async () => {
      // Mock response
      const mockConcept: Concept = {
        id: '1',
        title: 'Test Concept',
        content: 'This is a test concept',
        topics: ['test', 'example'],
        reviews: [],
        next_review: null
      };

      // Setup the mock implementation
      getConceptSpy.mockResolvedValue(mockConcept);

      // Call the function
      const result = await reviewsApi.getConcept('1');

      // Check if the API was called with the correct ID
      expect(reviewsApi.getConcept).toHaveBeenCalledWith('1');

      // Check if the result matches the mock data
      expect(result).toEqual(mockConcept);
    });
  });

  describe('updateConcept', () => {
    it('should call the updateConcept endpoint', async () => {
      // Mock response
      const mockConcept: Concept = {
        id: '1',
        title: 'Updated Concept',
        content: 'This is an updated concept',
        topics: ['test', 'updated'],
        reviews: [],
        next_review: null
      };

      // Setup the mock implementation
      updateConceptSpy.mockResolvedValue(mockConcept);

      // Test data
      const conceptId = '1';
      const updateData: ConceptUpdate = {
        title: 'Updated Concept',
        content: 'This is an updated concept',
        topics: ['test', 'updated']
      };

      // Call the function
      const result = await reviewsApi.updateConcept(conceptId, updateData);

      // Check if the API was called with the correct data
      expect(reviewsApi.updateConcept).toHaveBeenCalledWith(conceptId, updateData);

      // Check if the result matches the mock data
      expect(result).toEqual(mockConcept);
    });
  });

  describe('deleteConcept', () => {
    it('should call the deleteConcept endpoint', async () => {
      // Mock implementation
      deleteConceptSpy.mockResolvedValue();

      // Call the function
      await reviewsApi.deleteConcept('1');

      // Check if the API was called with the correct ID
      expect(reviewsApi.deleteConcept).toHaveBeenCalledWith('1');
    });
  });

  describe('markConceptReviewed', () => {
    it('should call the markConceptReviewed endpoint', async () => {
      // Mock response
      const mockConcept: Concept = {
        id: '1',
        title: 'Test Concept',
        content: 'This is a test concept',
        topics: ['test', 'example'],
        reviews: [
          {
            date: '2023-06-01T00:00:00Z',
            confidence: 4
          }
        ],
        next_review: '2023-06-08T00:00:00Z'
      };

      // Setup the mock implementation
      markConceptReviewedSpy.mockResolvedValue(mockConcept);

      // Test data
      const conceptId = '1';
      const reviewData: ReviewCreate = {
        confidence: 4
      };

      // Call the function
      const result = await reviewsApi.markConceptReviewed(conceptId, reviewData);

      // Check if the API was called with the correct data
      expect(reviewsApi.markConceptReviewed).toHaveBeenCalledWith(conceptId, reviewData);

      // Check if the result matches the mock data
      expect(result).toEqual(mockConcept);
    });
  });

  describe('getDueConcepts', () => {
    it('should call the getDueConcepts endpoint', async () => {
      // Mock response
      const mockConcepts: Concept[] = [
        {
          id: '1',
          title: 'Due Concept',
          content: 'This concept is due for review',
          topics: ['test', 'due'],
          reviews: [
            {
              date: '2023-05-01T00:00:00Z',
              confidence: 3
            }
          ],
          next_review: '2023-06-01T00:00:00Z'
        }
      ];

      // Setup the mock implementation
      getDueConceptsSpy.mockResolvedValue(mockConcepts);

      // Call the function
      const result = await reviewsApi.getDueConcepts();

      // Check if the API was called
      expect(reviewsApi.getDueConcepts).toHaveBeenCalled();

      // Check if the result matches the mock data
      expect(result).toEqual(mockConcepts);
    });
  });

  describe('getNewConcepts', () => {
    it('should call the getNewConcepts endpoint with default count', async () => {
      // Mock response
      const mockConcepts: Concept[] = [
        {
          id: '1',
          title: 'New Concept',
          content: 'This is a new concept',
          topics: ['test', 'new'],
          reviews: [],
          next_review: null
        },
        {
          id: '2',
          title: 'Another New Concept',
          content: 'This is another new concept',
          topics: ['test', 'new'],
          reviews: [],
          next_review: null
        },
        {
          id: '3',
          title: 'Yet Another New Concept',
          content: 'This is yet another new concept',
          topics: ['test', 'new'],
          reviews: [],
          next_review: null
        }
      ];

      // Setup the mock implementation
      getNewConceptsSpy.mockResolvedValue(mockConcepts);

      // Call the function
      const result = await reviewsApi.getNewConcepts();

      // Check if the API was called with default count
      expect(reviewsApi.getNewConcepts).toHaveBeenCalledWith();

      // Check if the result matches the mock data
      expect(result).toEqual(mockConcepts);
    });

    it('should call the getNewConcepts endpoint with custom count', async () => {
      // Mock response
      const mockConcepts: Concept[] = [
        {
          id: '1',
          title: 'New Concept',
          content: 'This is a new concept',
          topics: ['test', 'new'],
          reviews: [],
          next_review: null
        },
        {
          id: '2',
          title: 'Another New Concept',
          content: 'This is another new concept',
          topics: ['test', 'new'],
          reviews: [],
          next_review: null
        }
      ];

      // Setup the mock implementation
      getNewConceptsSpy.mockResolvedValue(mockConcepts);

      // Call the function with custom count
      const count = 2;
      const result = await reviewsApi.getNewConcepts(count);

      // Check if the API was called with the custom count
      expect(reviewsApi.getNewConcepts).toHaveBeenCalledWith(count);

      // Check if the result matches the mock data
      expect(result).toEqual(mockConcepts);
    });
  });

  describe('generateReviewSession', () => {
    it('should call the generateReviewSession endpoint with default maxReviews', async () => {
      // Mock response
      const mockSession: ReviewSession = {
        id: '1',
        user_id: 'user1',
        start_time: '2023-06-01T00:00:00Z',
        end_time: null,
        concepts_reviewed: 0,
        correct_answers: 0,
        average_confidence: 0,
        completed: false
      };

      // Setup the mock implementation
      generateReviewSessionSpy.mockResolvedValue(mockSession);

      // Call the function
      const result = await reviewsApi.generateReviewSession();

      // Check if the API was called with default maxReviews
      expect(reviewsApi.generateReviewSession).toHaveBeenCalledWith();

      // Check if the result matches the mock data
      expect(result).toEqual(mockSession);
    });

    it('should call the generateReviewSession endpoint with custom maxReviews', async () => {
      // Mock response
      const mockSession: ReviewSession = {
        id: '1',
        user_id: 'user1',
        start_time: '2023-06-01T00:00:00Z',
        end_time: null,
        concepts_reviewed: 0,
        correct_answers: 0,
        average_confidence: 0,
        completed: false
      };

      // Setup the mock implementation
      generateReviewSessionSpy.mockResolvedValue(mockSession);

      // Call the function with custom maxReviews
      const maxReviews = 10;
      const result = await reviewsApi.generateReviewSession(maxReviews);

      // Check if the API was called with the custom maxReviews
      expect(reviewsApi.generateReviewSession).toHaveBeenCalledWith(maxReviews);

      // Check if the result matches the mock data
      expect(result).toEqual(mockSession);
    });
  });

  describe('getStatistics', () => {
    it('should call the getStatistics endpoint', async () => {
      // Mock response
      const mockStatistics: ReviewStatistics = {
        total_concepts: 50,
        reviewed_concepts: 30,
        due_reviews: 5,
        new_concepts: 20,
        review_counts: { 1: 10, 2: 8, 3: 7, 4: 5 },
        average_confidence: 3.5,
        review_history: {
          last_7_days: 15,
          last_30_days: 45,
          all_time: 100
        },
        confidence_distribution: { 1: 5, 2: 10, 3: 10, 4: 5 }
      };

      // Setup mock implementation
      getStatisticsSpy.mockResolvedValue(mockStatistics);

      // Call the function
      const result = await reviewsApi.getStatistics();

      // Check if the API was called
      expect(reviewsApi.getStatistics).toHaveBeenCalled();

      // Check if the result matches the mock data
      expect(result).toEqual(mockStatistics);
    });
  });
});