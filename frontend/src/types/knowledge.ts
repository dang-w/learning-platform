/**
 * Types for the Knowledge Management System
 */

// Concept represents a piece of knowledge to be learned and reviewed
export interface Concept {
  id: string;
  title: string;
  content: string;
  notes?: string;
  topics: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  created_at: string;
  last_reviewed_at?: string;
  next_review_at?: string;
  review_count: number;
  confidence_level: number; // 1-5 scale
  user_id: string;
}

// ConceptCreateInput is used when creating a new concept
export interface ConceptCreateInput {
  title: string;
  content: string;
  notes?: string;
  topics: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

// ConceptUpdateInput is used when updating an existing concept
export interface ConceptUpdateInput extends Partial<ConceptCreateInput> {
  id: string;
}

// Review represents a review session for a concept
export interface Review {
  id: string;
  concept_id: string;
  reviewed_at: string;
  confidence_level: number; // 1-5 scale
  notes?: string;
  user_id: string;
}

// ReviewCreateInput is used when creating a new review
export interface ReviewCreateInput {
  concept_id: string;
  confidence_level: number;
  notes?: string;
}

// ReviewSession represents a collection of concepts to review
export interface ReviewSession {
  id: string;
  concepts: Concept[];
  created_at: string;
  completed_at?: string;
  user_id: string;
}

// ReviewStatistics provides metrics about the review process
export interface ReviewStatistics {
  total_concepts: number;
  concepts_due: number;
  concepts_by_confidence: {
    [key: number]: number; // confidence level -> count
  };
  concepts_by_topic: {
    [key: string]: number; // topic -> count
  };
  review_streak: number;
  average_confidence: number;
}

// SpacedRepetitionAlgorithm defines the algorithm used for scheduling reviews
export enum SpacedRepetitionAlgorithm {
  SM2 = 'sm2', // SuperMemo 2
  LEITNER = 'leitner', // Leitner System
  CUSTOM = 'custom', // Custom algorithm
}

// SpacedRepetitionSettings defines user settings for the spaced repetition system
export interface SpacedRepetitionSettings {
  algorithm: SpacedRepetitionAlgorithm;
  daily_review_limit: number;
  include_new_concepts: boolean;
  new_concepts_per_day: number;
}