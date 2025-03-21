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
  reviews: Review[];
  next_review: string | null;
  updated_at: string;
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
  user_id: string;
  confidence_level: number; // 1-5
  notes?: string;
  created_at: string;
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
  date: string;
  completed: boolean;
}

// ReviewStatistics provides metrics about the review process
export interface ReviewStatistics {
  total_concepts: number;
  total_reviews: number;
  concepts_with_reviews: number;
  concepts_without_reviews: number;
  average_confidence: number;
  concepts_due: number;
  review_streak: number;
  concepts_by_topic: Record<string, number>;
  concepts_by_confidence: Record<number, number>;
  topics: string[];
  review_history: {
    date: string;
    count: number;
    average_confidence: number;
  }[];
  top_topics: { name: string; count: number }[];
  recently_reviewed_concepts: Concept[];
  due_concepts: number;
  streak_days: number;
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

export interface ConceptFormData {
  title: string;
  content: string;
  topics: string[];
}

export interface ConceptFormProps {
  concept?: Concept;
  onSubmit: (data: ConceptFormData) => void;
  onCancel: () => void;
}

export interface ConceptListProps {
  concepts: Concept[];
  onDelete: (id: string) => void;
  onEdit: (concept: Concept) => void;
  onReview: (concept: Concept) => void;
}

export interface ConceptCardProps {
  concept: Concept;
  onDelete: (id: string) => void;
  onEdit: (concept: Concept) => void;
  onReview: (concept: Concept) => void;
}

export interface ConceptFilterProps {
  onFilterChange: (filter: ConceptFilter) => void;
}

export interface ConceptFilter {
  search: string;
  topic: string | 'all';
  reviewStatus: 'all' | 'due' | 'not-due' | 'never-reviewed';
}

export interface ReviewFormData {
  confidence: number;
}

export interface ReviewFormProps {
  concept: Concept;
  onSubmit: (data: ReviewFormData) => void;
  onSkip: () => void;
}