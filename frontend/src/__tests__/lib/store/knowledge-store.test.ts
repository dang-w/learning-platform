import { act, renderHook } from '@testing-library/react';
import { useKnowledgeStore } from '@/lib/store/knowledge-store';
import { knowledgeApi } from '@/lib/api';
import {
  Concept,
  ConceptCreateInput,
  ConceptUpdateInput,
  ReviewSession,
  ReviewStatistics,
  SpacedRepetitionSettings,
  ReviewCreateInput,
  SpacedRepetitionAlgorithm
} from '@/types/knowledge';

// Mock the knowledge API
jest.mock('@/lib/api', () => ({
  knowledgeApi: {
    getConcepts: jest.fn(),
    getConcept: jest.fn(),
    createConcept: jest.fn(),
    updateConcept: jest.fn(),
    deleteConcept: jest.fn(),
    reviewConcept: jest.fn(),
    getDueConcepts: jest.fn(),
    getNewConcepts: jest.fn(),
    createReviewSession: jest.fn(),
    completeReviewSession: jest.fn(),
    getReviewStatistics: jest.fn(),
    getSpacedRepetitionSettings: jest.fn(),
    updateSpacedRepetitionSettings: jest.fn(),
  },
}));

describe('useKnowledgeStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset the store state
    const { result } = renderHook(() => useKnowledgeStore());
    act(() => {
      result.current.clearErrors();
    });
  });

  // Mock data
  const mockConcepts: Concept[] = [
    {
      id: '1',
      title: 'Concept 1',
      content: 'Content 1',
      topics: ['javascript'],
      difficulty: 'beginner',
      created_at: '2023-01-01T00:00:00Z',
      review_count: 0,
      next_review_at: undefined,
      last_reviewed_at: undefined,
      confidence_level: 0,
      user_id: 'user1'
    },
    {
      id: '2',
      title: 'Concept 2',
      content: 'Content 2',
      topics: ['typescript'],
      difficulty: 'intermediate',
      created_at: '2023-01-02T00:00:00Z',
      review_count: 0,
      next_review_at: undefined,
      last_reviewed_at: undefined,
      confidence_level: 0,
      user_id: 'user1'
    },
  ];

  const mockConcept: Concept = {
    id: '1',
    title: 'Concept 1',
    content: 'Content 1',
    topics: ['javascript'],
    difficulty: 'beginner',
    created_at: '2023-01-01T00:00:00Z',
    review_count: 0,
    next_review_at: undefined,
    last_reviewed_at: undefined,
    confidence_level: 0,
    user_id: 'user1'
  };

  const mockSession: ReviewSession = {
    id: 'session1',
    concepts: mockConcepts,
    created_at: new Date().toISOString(),
    user_id: 'user1'
  };

  const mockStatistics: ReviewStatistics = {
    total_concepts: 10,
    concepts_due: 2,
    concepts_by_confidence: { 1: 2, 2: 3, 3: 4, 4: 1 },
    concepts_by_topic: { javascript: 5, typescript: 5 },
    review_streak: 3,
    average_confidence: 0.8
  };

  const mockSettings: SpacedRepetitionSettings = {
    algorithm: SpacedRepetitionAlgorithm.SM2,
    daily_review_limit: 50,
    include_new_concepts: true,
    new_concepts_per_day: 10
  };

  describe('Concept actions', () => {
    it('should fetch concepts', async () => {
      (knowledgeApi.getConcepts as jest.Mock).mockResolvedValue(mockConcepts);

      const { result } = renderHook(() => useKnowledgeStore());

      await act(async () => {
        await result.current.fetchConcepts();
      });

      expect(knowledgeApi.getConcepts).toHaveBeenCalled();
      expect(result.current.concepts).toEqual(mockConcepts);
      expect(result.current.isLoadingConcepts).toBe(false);
      expect(result.current.conceptsError).toBeNull();
    });

    it('should fetch concepts with params', async () => {
      (knowledgeApi.getConcepts as jest.Mock).mockResolvedValue(mockConcepts);

      const { result } = renderHook(() => useKnowledgeStore());
      const params = { topic: 'javascript', difficulty: 'intermediate' };

      await act(async () => {
        await result.current.fetchConcepts(params);
      });

      expect(knowledgeApi.getConcepts).toHaveBeenCalledWith(params);
      expect(result.current.concepts).toEqual(mockConcepts);
    });

    it('should handle fetch concepts error', async () => {
      const error = new Error('Failed to fetch concepts');
      (knowledgeApi.getConcepts as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useKnowledgeStore());

      await act(async () => {
        try {
          await result.current.fetchConcepts();
          // This should not be reached
          fail('Expected an error to be thrown');
        } catch {
          // Expected error, do nothing
        }
      });

      expect(result.current.isLoadingConcepts).toBe(false);
      expect(result.current.conceptsError).toBe('Failed to fetch concepts');
    });

    it('should fetch a single concept', async () => {
      (knowledgeApi.getConcept as jest.Mock).mockResolvedValue(mockConcept);

      const { result } = renderHook(() => useKnowledgeStore());

      await act(async () => {
        await result.current.fetchConcept('1');
      });

      expect(knowledgeApi.getConcept).toHaveBeenCalledWith('1');
      expect(result.current.selectedConcept).toEqual(mockConcept);
    });

    it('should create a concept', async () => {
      const newConceptInput: ConceptCreateInput = {
        title: 'New Concept',
        content: 'New Content',
        topics: ['react'],
        difficulty: 'beginner'
      };

      const newConcept: Concept = {
        id: '3',
        ...newConceptInput,
        created_at: '2023-01-03T00:00:00Z',
        review_count: 0,
        next_review_at: undefined,
        last_reviewed_at: undefined,
        confidence_level: 0,
        user_id: 'user1'
      };

      (knowledgeApi.createConcept as jest.Mock).mockResolvedValue(newConcept);

      const { result } = renderHook(() => useKnowledgeStore());

      // First set some initial concepts
      act(() => {
        result.current.concepts = [...mockConcepts];
      });

      await act(async () => {
        await result.current.createConcept(newConceptInput);
      });

      expect(knowledgeApi.createConcept).toHaveBeenCalledWith(newConceptInput);
      expect(result.current.concepts).toHaveLength(3);
      expect(result.current.concepts[2]).toEqual(newConcept);
    });

    it('should update a concept', async () => {
      const updatedConcept: ConceptUpdateInput = {
        id: '1',
        title: 'Updated Concept',
        content: 'Updated Content',
        topics: ['javascript', 'react'],
        difficulty: 'intermediate'
      };

      const fullUpdatedConcept: Concept = {
        id: '1',
        title: 'Updated Concept',
        content: 'Updated Content',
        topics: ['javascript', 'react'],
        difficulty: 'intermediate',
        created_at: '2023-01-01T00:00:00Z',
        review_count: 0,
        next_review_at: undefined,
        last_reviewed_at: undefined,
        confidence_level: 0,
        user_id: 'user1'
      };

      (knowledgeApi.updateConcept as jest.Mock).mockResolvedValue(fullUpdatedConcept);

      const { result } = renderHook(() => useKnowledgeStore());

      // First set some initial concepts
      act(() => {
        result.current.concepts = [...mockConcepts];
      });

      await act(async () => {
        await result.current.updateConcept(updatedConcept);
      });

      expect(knowledgeApi.updateConcept).toHaveBeenCalledWith(updatedConcept);
      expect(result.current.concepts[0]).toEqual(fullUpdatedConcept);
      expect(result.current.selectedConcept).toEqual(fullUpdatedConcept);
    });

    it('should delete a concept', async () => {
      (knowledgeApi.deleteConcept as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useKnowledgeStore());

      // First set some initial concepts
      act(() => {
        result.current.concepts = [...mockConcepts];
        result.current.selectedConcept = mockConcepts[0];
      });

      await act(async () => {
        await result.current.deleteConcept('1');
      });

      expect(knowledgeApi.deleteConcept).toHaveBeenCalledWith('1');
      expect(result.current.concepts).toHaveLength(1);
      expect(result.current.concepts[0].id).toBe('2');
      expect(result.current.selectedConcept).toBeNull();
    });

    it('should keep selected concept when deleting a different concept', async () => {
      (knowledgeApi.deleteConcept as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useKnowledgeStore());

      // First set some initial concepts
      act(() => {
        result.current.concepts = [...mockConcepts];
        result.current.selectedConcept = mockConcepts[0];
      });

      await act(async () => {
        await result.current.deleteConcept('2');
      });

      expect(result.current.concepts).toHaveLength(1);
      expect(result.current.concepts[0].id).toBe('1');
      expect(result.current.selectedConcept).toEqual(mockConcepts[0]);
    });
  });

  describe('Review actions', () => {
    it('should review a concept', async () => {
      (knowledgeApi.reviewConcept as jest.Mock).mockResolvedValue(undefined);
      (knowledgeApi.getDueConcepts as jest.Mock).mockResolvedValue([mockConcepts[1]]);

      const { result } = renderHook(() => useKnowledgeStore());
      const review: ReviewCreateInput = {
        concept_id: '1',
        confidence_level: 4,
        notes: 'Good understanding'
      };

      await act(async () => {
        await result.current.reviewConcept(review);
      });

      expect(knowledgeApi.reviewConcept).toHaveBeenCalledWith(review);
      expect(knowledgeApi.getDueConcepts).toHaveBeenCalled();
    });

    it('should update current session when reviewing a concept in a session', async () => {
      (knowledgeApi.reviewConcept as jest.Mock).mockResolvedValue(undefined);
      (knowledgeApi.getDueConcepts as jest.Mock).mockResolvedValue([]);

      const { result } = renderHook(() => useKnowledgeStore());
      const review: ReviewCreateInput = {
        concept_id: '1',
        confidence_level: 4,
        notes: 'Good understanding'
      };

      // Set up a current session
      act(() => {
        result.current.currentSession = { ...mockSession };
      });

      await act(async () => {
        await result.current.reviewConcept(review);
      });

      expect(result.current.currentSession?.concepts).toHaveLength(1);
      expect(result.current.currentSession?.concepts[0].id).toBe('2');
    });

    it('should fetch due concepts', async () => {
      (knowledgeApi.getDueConcepts as jest.Mock).mockResolvedValue(mockConcepts);

      const { result } = renderHook(() => useKnowledgeStore());

      await act(async () => {
        await result.current.fetchDueConcepts();
      });

      expect(knowledgeApi.getDueConcepts).toHaveBeenCalled();
      expect(result.current.concepts).toEqual(mockConcepts);
    });

    it('should fetch new concepts', async () => {
      (knowledgeApi.getNewConcepts as jest.Mock).mockResolvedValue(mockConcepts);

      const { result } = renderHook(() => useKnowledgeStore());

      await act(async () => {
        await result.current.fetchNewConcepts(5);
      });

      expect(knowledgeApi.getNewConcepts).toHaveBeenCalledWith(5);
      expect(result.current.concepts).toEqual(mockConcepts);
    });
  });

  describe('Session actions', () => {
    it('should create a review session', async () => {
      (knowledgeApi.createReviewSession as jest.Mock).mockResolvedValue(mockSession);

      const { result } = renderHook(() => useKnowledgeStore());

      await act(async () => {
        await result.current.createReviewSession();
      });

      expect(knowledgeApi.createReviewSession).toHaveBeenCalled();
      expect(result.current.currentSession).toEqual(mockSession);
      expect(result.current.isLoadingSession).toBe(false);
      expect(result.current.sessionError).toBeNull();
    });

    it('should complete a review session', async () => {
      (knowledgeApi.completeReviewSession as jest.Mock).mockResolvedValue(undefined);
      (knowledgeApi.getReviewStatistics as jest.Mock).mockResolvedValue(mockStatistics);

      const { result } = renderHook(() => useKnowledgeStore());

      // Set up a current session
      act(() => {
        result.current.currentSession = { ...mockSession };
      });

      await act(async () => {
        await result.current.completeReviewSession();
      });

      expect(knowledgeApi.completeReviewSession).toHaveBeenCalledWith(mockSession.id);
      expect(result.current.currentSession).toBeNull();
      expect(knowledgeApi.getReviewStatistics).toHaveBeenCalled();
    });

    it('should throw error when completing session without active session', async () => {
      const { result } = renderHook(() => useKnowledgeStore());

      // Ensure no current session
      act(() => {
        result.current.currentSession = null;
      });

      await expect(async () => {
        await act(async () => {
          await result.current.completeReviewSession();
        });
      }).rejects.toThrow('No active review session');
    });
  });

  describe('Statistics and settings', () => {
    it('should fetch review statistics', async () => {
      (knowledgeApi.getReviewStatistics as jest.Mock).mockResolvedValue(mockStatistics);

      const { result } = renderHook(() => useKnowledgeStore());

      await act(async () => {
        await result.current.fetchReviewStatistics();
      });

      expect(knowledgeApi.getReviewStatistics).toHaveBeenCalled();
      expect(result.current.statistics).toEqual(mockStatistics);
      expect(result.current.isLoadingStatistics).toBe(false);
      expect(result.current.statisticsError).toBeNull();
    });

    it('should fetch spaced repetition settings', async () => {
      (knowledgeApi.getSpacedRepetitionSettings as jest.Mock).mockResolvedValue(mockSettings);

      const { result } = renderHook(() => useKnowledgeStore());

      await act(async () => {
        await result.current.fetchSpacedRepetitionSettings();
      });

      expect(knowledgeApi.getSpacedRepetitionSettings).toHaveBeenCalled();
      expect(result.current.settings).toEqual(mockSettings);
      expect(result.current.isLoadingSettings).toBe(false);
      expect(result.current.settingsError).toBeNull();
    });

    it('should update spaced repetition settings', async () => {
      const updatedSettings = {
        ...mockSettings,
        new_concepts_per_day: 15
      };
      (knowledgeApi.updateSpacedRepetitionSettings as jest.Mock).mockResolvedValue(updatedSettings);

      const { result } = renderHook(() => useKnowledgeStore());

      await act(async () => {
        await result.current.updateSpacedRepetitionSettings({ new_concepts_per_day: 15 });
      });

      expect(knowledgeApi.updateSpacedRepetitionSettings).toHaveBeenCalledWith({ new_concepts_per_day: 15 });
      expect(result.current.settings).toEqual(updatedSettings);
    });
  });

  describe('Error handling', () => {
    it('should clear all errors', () => {
      const { result } = renderHook(() => useKnowledgeStore());

      // Set some errors
      act(() => {
        result.current.conceptsError = 'Concept error';
        result.current.sessionError = 'Session error';
        result.current.statisticsError = 'Statistics error';
        result.current.settingsError = 'Settings error';
      });

      act(() => {
        result.current.clearErrors();
      });

      expect(result.current.conceptsError).toBeNull();
      expect(result.current.sessionError).toBeNull();
      expect(result.current.statisticsError).toBeNull();
      expect(result.current.settingsError).toBeNull();
    });

    it('should handle API errors with custom messages', async () => {
      (knowledgeApi.getConcepts as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useKnowledgeStore());

      await act(async () => {
        try {
          await result.current.fetchConcepts();
          // This should not be reached
          fail('Expected an error to be thrown');
        } catch {
          // Expected error, do nothing
        }
      });

      expect(result.current.conceptsError).toBe('Network error');
    });

    it('should handle non-Error API errors', async () => {
      (knowledgeApi.getConcepts as jest.Mock).mockRejectedValue('Unknown error');

      const { result } = renderHook(() => useKnowledgeStore());

      await act(async () => {
        try {
          await result.current.fetchConcepts();
          // This should not be reached
          fail('Expected an error to be thrown');
        } catch {
          // Expected error, do nothing
        }
      });

      expect(result.current.conceptsError).toBe('Failed to fetch concepts');
    });
  });
});