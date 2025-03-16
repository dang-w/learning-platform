export interface ProgressHistory {
  date: string;
  progress: number;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  target_date: string;
  priority: number; // 1-10
  category: string;
  completed: boolean;
  completion_date: string | null;
  notes: string;
  progress: number; // 0-100
  progress_history: ProgressHistory[];
}

export interface GoalFormData {
  title: string;
  description: string;
  target_date: string;
  priority: number;
  category: string;
  completed: boolean;
  notes: string;
  progress?: number;
}

export interface GoalFormProps {
  goal?: Goal;
  onSubmit: (data: GoalFormData) => void;
  onCancel: () => void;
}

export interface GoalListProps {
  goals: Goal[];
  onDelete: (id: string) => void;
  onEdit: (goal: Goal) => void;
}

export interface GoalCardProps {
  goal: Goal;
  onDelete: (id: string) => void;
  onEdit: (goal: Goal) => void;
}

export interface GoalFilterProps {
  onFilterChange: (filter: GoalFilter) => void;
}

export interface GoalFilter {
  search: string;
  status: 'all' | 'completed' | 'in-progress';
  category: string | 'all';
  priority: 'all' | 'high' | 'medium' | 'low';
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  target_date: string;
  verification_method: string;
  resources: string[];
  completed: boolean;
  completion_date: string | null;
  notes: string;
}

export interface MilestoneFormData {
  title: string;
  description: string;
  target_date: string;
  verification_method: string;
  resources: string[];
  completed: boolean;
  notes: string;
}

export interface MilestoneFormProps {
  milestone?: Milestone;
  onSubmit: (data: MilestoneFormData) => void;
  onCancel: () => void;
}

export interface LearningPathProgress {
  overall_progress: number;
  completed_goals: number;
  total_goals: number;
  completed_milestones: number;
  total_milestones: number;
  progress_by_category: Record<string, number>;
  progress_history: {
    date: string;
    progress: number;
  }[];
}