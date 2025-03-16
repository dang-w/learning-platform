export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';
export type ResourceType = 'articles' | 'videos' | 'courses' | 'books';

export interface Resource {
  id: string;
  title: string;
  url: string;
  topics: string[];
  difficulty: DifficultyLevel;
  estimated_time: number; // in minutes
  completed: boolean;
  date_added: string;
  completion_date: string | null;
  notes: string;
}

export interface ResourceFormData {
  title: string;
  url: string;
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
  resources_by_type: Record<ResourceType, number>;
  completed_by_type: Record<ResourceType, number>;
  topics: string[];
  difficulty_distribution: Record<DifficultyLevel, number>;
}

export interface UrlMetadata {
  title?: string;
  description?: string;
  topics?: string[];
  estimated_time?: number;
}