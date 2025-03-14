export type GoalPriority = 'low' | 'medium' | 'high';
export type GoalStatus = 'not_started' | 'in_progress' | 'completed';
export type MilestoneStatus = 'not_started' | 'in_progress' | 'completed';

export interface Goal {
  id: string;
  title: string;
  description: string;
  priority: GoalPriority;
  status: GoalStatus;
  target_date: string;
  completion_date?: string | null;
  created_at: string;
  updated_at: string;
  milestones?: Milestone[];
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  status: MilestoneStatus;
  target_date: string;
  completion_date?: string | null;
  goal_id: string;
  created_at: string;
  updated_at: string;
  resources: Resource[];
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
  goals_completion_percentage: number;
  milestones_completion_percentage: number;
  on_track: boolean;
  goals_completed: number;
  goals_total: number;
  milestones_completed: number;
  milestones_total: number;
  next_milestone?: Milestone;
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