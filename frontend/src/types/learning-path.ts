export type GoalPriority = 'low' | 'medium' | 'high';
export type GoalStatus = 'not_started' | 'in_progress' | 'completed';
export type MilestoneStatus = 'not_started' | 'in_progress' | 'completed';

export interface Goal {
  id: string;
  title: string;
  description: string;
  priority: GoalPriority;
  category: string;
  completed: boolean;
  completion_date: string | null;
  notes: string;
  progress: number;
  progress_history: {
    date: string;
    progress: number;
  }[];
  status: GoalStatus;
  target_date: string;
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
  progress: number;
  goal_id: string;
  status: MilestoneStatus;
}

export interface Resource {
  id: string;
  title: string;
  url: string;
  type: string;
  milestone_id: string;
  created_at: string;
  updated_at: string;
}

export interface LearningPath {
  goals: Goal[];
  milestones: Milestone[];
}

export interface LearningPathProgress {
  overall_progress: number;
  goals_completed: number;
  goals_in_progress: number;
  total_goals: number;
  milestones_completed: number;
  milestones_in_progress: number;
  total_milestones: number;
  recent_achievements: {
    id: string;
    title: string;
    type: 'goal' | 'milestone';
    date: string;
  }[];
}

export interface GoalCreateInput {
  title: string;
  description: string;
  priority: GoalPriority;
  target_date: string;
}

export interface MilestoneCreateInput {
  title: string;
  description: string;
  target_date: string;
  goal_id: string;
}

export interface GoalUpdateInput {
  title?: string;
  description?: string;
  status?: GoalStatus;
  priority?: GoalPriority;
  target_date?: string;
  resources?: string[];
  completion_date?: string | null;
}

export interface MilestoneUpdateInput {
  title?: string;
  description?: string;
  status?: MilestoneStatus;
  target_date?: string;
  resources?: string[];
  goal_id?: string;
  completion_date?: string | null;
}