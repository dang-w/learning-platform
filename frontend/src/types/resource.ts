export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type ResourceTypeString = 'article' | 'video' | 'course' | 'book' | 'documentation' | 'platform' | 'tool' | 'other';

export interface Resource {
  id: string;
  title: string;
  url: string;
  type: ResourceTypeString;
  topics?: string[];
  difficulty?: DifficultyLevel;
  estimated_time?: number;
  description?: string;
  completed?: boolean;
  completion_date?: string | null;
  notes?: string;
  user_rating?: number;
  date_added?: string;
}

export interface ResourceFormData {
  title: string;
  url: string;
  type: ResourceTypeString;
  topics: string[];
  difficulty: DifficultyLevel;
  estimated_time: number;
}

export interface ResourceFormProps {
  resource?: Resource;
  onSubmit: (data: ResourceFormData) => void;
  onCancel: () => void;
}

export interface ResourceListProps {
  resources: Resource[];
  onDelete: (id: string) => void;
  onToggleCompletion: (id: string) => void;
  onEdit: (resource: Resource) => void;
}

export interface ResourceCardProps {
  resource: Resource;
  onDelete: (id: string) => void;
  onToggleCompletion: (id: string) => void;
  onEdit: (resource: Resource) => void;
}

export interface ResourceFilterProps {
  onFilterChange: (filter: ResourceFilter) => void;
}

export interface ResourceFilter {
  search: string;
  status: 'all' | 'completed' | 'incomplete';
  difficulty: DifficultyLevel | 'all';
  topic: string | 'all';
}

export interface ResourceStatistics {
  total_resources: number;
  completed_resources: number;
  completion_percentage: number;
  resources_by_type: Record<ResourceTypeString, number>;
  completed_by_type: Record<ResourceTypeString, number>;
  topics: string[];
  difficulty_distribution: Record<DifficultyLevel, number>;
}

export interface UrlMetadata {
  title?: string;
  description?: string;
  topics?: string[];
  estimated_time?: number;
}

export interface ResourceStatusUpdate {
  completed?: boolean;
  notes?: string;
}

export interface Filters {
  topics: string[];
  types: string[];
  difficulty: string[];
}

export interface ResourceCreateInput {
  title: string;
  url: string;
  type: ResourceTypeString;
  topics?: string[];
  difficulty?: DifficultyLevel;
  estimated_time?: number;
  summary?: string;
}

export interface ResourceUpdateInput {
  title?: string;
  url?: string;
  type?: ResourceTypeString;
  topics?: string[];
  difficulty?: DifficultyLevel;
  estimated_time?: number;
  notes?: string;
  summary?: string;
}

export interface ResourceCompleteInput {
  notes: string;
}

export interface ResourceTypeStats {
  completed: number;
  in_progress?: number;
  total: number;
  completion_percentage?: number;
}

export interface ResourceStats {
  articles: ResourceTypeStats;
  videos: ResourceTypeStats;
  courses: ResourceTypeStats;
  books: ResourceTypeStats;
  documentation?: ResourceTypeStats;
  tool?: ResourceTypeStats;
  other?: ResourceTypeStats;
  total_completed: number;
  total_in_progress?: number;
  total_resources: number;
  completion_percentage?: number;
  by_topic?: Record<string, { total: number; completed: number }>;
  by_difficulty?: Record<DifficultyLevel, { total: number; completed: number }>;
  recent_completions?: Resource[];
}