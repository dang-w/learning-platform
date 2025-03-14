import { create } from 'zustand';
import { knowledgeApi } from '@/lib/api';
import {
  Concept,
  ConceptCreateInput,
  ConceptUpdateInput,
  ReviewCreateInput,
  ReviewSession,
  ReviewStatistics,
  SpacedRepetitionSettings,
} from '@/types/knowledge';

interface KnowledgeState {
  // Concepts
  concepts: Concept[];
  selectedConcept: Concept | null;
  isLoadingConcepts: boolean;
  conceptsError: string | null;

  // Review Session
  currentSession: ReviewSession | null;
  isLoadingSession: boolean;
  sessionError: string | null;

  // Statistics
  statistics: ReviewStatistics | null;
  isLoadingStatistics: boolean;
  statisticsError: string | null;

  // Settings
  settings: SpacedRepetitionSettings | null;
  isLoadingSettings: boolean;
  settingsError: string | null;

  // Actions
  fetchConcepts: (params?: { topic?: string; difficulty?: string }) => Promise<void>;
  fetchConcept: (id: string) => Promise<void>;
  createConcept: (concept: ConceptCreateInput) => Promise<void>;
  updateConcept: (concept: ConceptUpdateInput) => Promise<void>;
  deleteConcept: (id: string) => Promise<void>;

  reviewConcept: (review: ReviewCreateInput) => Promise<void>;
  fetchDueConcepts: () => Promise<void>;
  fetchNewConcepts: (limit?: number) => Promise<void>;

  createReviewSession: () => Promise<void>;
  completeReviewSession: () => Promise<void>;

  fetchReviewStatistics: () => Promise<void>;

  fetchSpacedRepetitionSettings: () => Promise<void>;
  updateSpacedRepetitionSettings: (settings: Partial<SpacedRepetitionSettings>) => Promise<void>;

  clearErrors: () => void;
}

export const useKnowledgeStore = create<KnowledgeState>((set, get) => ({
  // Concepts
  concepts: [],
  selectedConcept: null,
  isLoadingConcepts: false,
  conceptsError: null,

  // Review Session
  currentSession: null,
  isLoadingSession: false,
  sessionError: null,

  // Statistics
  statistics: null,
  isLoadingStatistics: false,
  statisticsError: null,

  // Settings
  settings: null,
  isLoadingSettings: false,
  settingsError: null,

  // Actions
  fetchConcepts: async (params) => {
    try {
      set({ isLoadingConcepts: true, conceptsError: null });
      const concepts = await knowledgeApi.getConcepts(params);
      set({ concepts, isLoadingConcepts: false });
    } catch (error) {
      set({
        isLoadingConcepts: false,
        conceptsError: error instanceof Error ? error.message : 'Failed to fetch concepts',
      });
      throw error;
    }
  },

  fetchConcept: async (id) => {
    try {
      set({ isLoadingConcepts: true, conceptsError: null });
      const concept = await knowledgeApi.getConcept(id);
      set({ selectedConcept: concept, isLoadingConcepts: false });
    } catch (error) {
      set({
        isLoadingConcepts: false,
        conceptsError: error instanceof Error ? error.message : 'Failed to fetch concept',
      });
      throw error;
    }
  },

  createConcept: async (concept) => {
    try {
      set({ isLoadingConcepts: true, conceptsError: null });
      const newConcept = await knowledgeApi.createConcept(concept);
      set(state => ({
        concepts: [...state.concepts, newConcept],
        isLoadingConcepts: false,
      }));
    } catch (error) {
      set({
        isLoadingConcepts: false,
        conceptsError: error instanceof Error ? error.message : 'Failed to create concept',
      });
      throw error;
    }
  },

  updateConcept: async (concept) => {
    try {
      set({ isLoadingConcepts: true, conceptsError: null });
      const updatedConcept = await knowledgeApi.updateConcept(concept);
      set(state => ({
        concepts: state.concepts.map(c => c.id === updatedConcept.id ? updatedConcept : c),
        selectedConcept: updatedConcept,
        isLoadingConcepts: false,
      }));
    } catch (error) {
      set({
        isLoadingConcepts: false,
        conceptsError: error instanceof Error ? error.message : 'Failed to update concept',
      });
      throw error;
    }
  },

  deleteConcept: async (id) => {
    try {
      set({ isLoadingConcepts: true, conceptsError: null });
      await knowledgeApi.deleteConcept(id);
      set(state => ({
        concepts: state.concepts.filter(c => c.id !== id),
        selectedConcept: state.selectedConcept?.id === id ? null : state.selectedConcept,
        isLoadingConcepts: false,
      }));
    } catch (error) {
      set({
        isLoadingConcepts: false,
        conceptsError: error instanceof Error ? error.message : 'Failed to delete concept',
      });
      throw error;
    }
  },

  reviewConcept: async (review) => {
    try {
      set({ isLoadingConcepts: true, conceptsError: null });
      await knowledgeApi.reviewConcept(review);

      // If we're in a session, update the current concept
      if (get().currentSession) {
        const currentSession = get().currentSession!;
        const updatedConcepts = currentSession.concepts.filter(c => c.id !== review.concept_id);

        set({
          currentSession: {
            ...currentSession,
            concepts: updatedConcepts,
          },
          isLoadingConcepts: false,
        });
      }

      // Refresh due concepts
      await get().fetchDueConcepts();
    } catch (error) {
      set({
        isLoadingConcepts: false,
        conceptsError: error instanceof Error ? error.message : 'Failed to review concept',
      });
      throw error;
    }
  },

  fetchDueConcepts: async () => {
    try {
      set({ isLoadingConcepts: true, conceptsError: null });
      const concepts = await knowledgeApi.getDueConcepts();
      set({ concepts, isLoadingConcepts: false });
    } catch (error) {
      set({
        isLoadingConcepts: false,
        conceptsError: error instanceof Error ? error.message : 'Failed to fetch due concepts',
      });
      throw error;
    }
  },

  fetchNewConcepts: async (limit) => {
    try {
      set({ isLoadingConcepts: true, conceptsError: null });
      const concepts = await knowledgeApi.getNewConcepts(limit);
      set({ concepts, isLoadingConcepts: false });
    } catch (error) {
      set({
        isLoadingConcepts: false,
        conceptsError: error instanceof Error ? error.message : 'Failed to fetch new concepts',
      });
      throw error;
    }
  },

  createReviewSession: async () => {
    try {
      set({ isLoadingSession: true, sessionError: null });
      const session = await knowledgeApi.createReviewSession();
      set({ currentSession: session, isLoadingSession: false });
    } catch (error) {
      set({
        isLoadingSession: false,
        sessionError: error instanceof Error ? error.message : 'Failed to create review session',
      });
      throw error;
    }
  },

  completeReviewSession: async () => {
    try {
      if (!get().currentSession) {
        throw new Error('No active review session');
      }

      set({ isLoadingSession: true, sessionError: null });
      await knowledgeApi.completeReviewSession(get().currentSession!.id);
      set({ currentSession: null, isLoadingSession: false });

      // Refresh statistics
      await get().fetchReviewStatistics();
    } catch (error) {
      set({
        isLoadingSession: false,
        sessionError: error instanceof Error ? error.message : 'Failed to complete review session',
      });
      throw error;
    }
  },

  fetchReviewStatistics: async () => {
    try {
      set({ isLoadingStatistics: true, statisticsError: null });
      const statistics = await knowledgeApi.getReviewStatistics();
      set({ statistics, isLoadingStatistics: false });
    } catch (error) {
      set({
        isLoadingStatistics: false,
        statisticsError: error instanceof Error ? error.message : 'Failed to fetch review statistics',
      });
      throw error;
    }
  },

  fetchSpacedRepetitionSettings: async () => {
    try {
      set({ isLoadingSettings: true, settingsError: null });
      const settings = await knowledgeApi.getSpacedRepetitionSettings();
      set({ settings, isLoadingSettings: false });
    } catch (error) {
      set({
        isLoadingSettings: false,
        settingsError: error instanceof Error ? error.message : 'Failed to fetch spaced repetition settings',
      });
      throw error;
    }
  },

  updateSpacedRepetitionSettings: async (settings) => {
    try {
      set({ isLoadingSettings: true, settingsError: null });
      const updatedSettings = await knowledgeApi.updateSpacedRepetitionSettings(settings);
      set({ settings: updatedSettings, isLoadingSettings: false });
    } catch (error) {
      set({
        isLoadingSettings: false,
        settingsError: error instanceof Error ? error.message : 'Failed to update spaced repetition settings',
      });
      throw error;
    }
  },

  clearErrors: () => {
    set({
      conceptsError: null,
      sessionError: null,
      statisticsError: null,
      settingsError: null,
    });
  },
}));