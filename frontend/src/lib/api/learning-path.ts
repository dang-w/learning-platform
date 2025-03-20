import apiClient from './client';
import { LearningPath } from '@/types/learning-path';

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

export interface MilestoneCreate {
  title: string;
  description: string;
  target_date: string;
  verification_method: string;
  resources: string[];
}

export interface MilestoneUpdate {
  title?: string;
  description?: string;
  target_date?: string;
  verification_method?: string;
  resources?: string[];
  completed?: boolean;
  notes?: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  target_date: string;
  priority: number;
  category: string;
  completed: boolean;
  completion_date: string | null;
  notes: string;
}

export interface GoalCreate {
  title: string;
  description: string;
  target_date: string;
  priority: number;
  category: string;
}

export interface GoalUpdate {
  title?: string;
  description?: string;
  target_date?: string;
  priority?: number;
  category?: string;
  completed?: boolean;
  notes?: string;
}

export interface RoadmapPhase {
  title: string;
  description: string;
  items: Array<{
    title: string;
    completed: boolean;
  }>;
}

export interface Roadmap {
  id: string;
  title: string;
  description: string;
  phases: RoadmapPhase[];
  created_at: string;
  updated_at: string;
}

export interface RoadmapCreate {
  title: string;
  description: string;
  phases: RoadmapPhase[];
}

export interface RoadmapUpdate {
  title?: string;
  description?: string;
  phases?: RoadmapPhase[];
}

export interface LearningPathProgress {
  goals: {
    total: number;
    completed: number;
    completion_percentage: number;
    by_category: Record<string, {
      total: number;
      completed: number;
      completion_percentage: number;
    }>;
  };
  milestones: {
    total: number;
    completed: number;
    completion_percentage: number;
    upcoming: Array<{
      id: string;
      title: string;
      target_date: string;
    }>;
  };
  roadmap: {
    has_roadmap: boolean;
    phases: Array<{
      title: string;
      total_items: number;
      completed_items: number;
      completion_percentage: number;
    }>;
  };
}

const learningPathApi = {
  // Milestones
  createMilestone: async (data: MilestoneCreate): Promise<Milestone> => {
    const response = await apiClient.post<Milestone>('/learning-path/milestones', data);
    return response.data;
  },

  getMilestones: async (completed?: boolean): Promise<Milestone[]> => {
    let url = '/learning-path/milestones';
    if (completed !== undefined) {
      url += `?completed=${completed}`;
    }

    const response = await apiClient.get<Milestone[]>(url);
    return response.data;
  },

  getMilestone: async (milestoneId: string): Promise<Milestone> => {
    const response = await apiClient.get<Milestone>(`/learning-path/milestones/${milestoneId}`);
    return response.data;
  },

  updateMilestone: async (milestoneId: string, data: MilestoneUpdate): Promise<Milestone> => {
    const response = await apiClient.put<Milestone>(`/learning-path/milestones/${milestoneId}`, data);
    return response.data;
  },

  deleteMilestone: async (milestoneId: string): Promise<void> => {
    await apiClient.delete(`/learning-path/milestones/${milestoneId}`);
  },

  // Goals
  createGoal: async (data: GoalCreate): Promise<Goal> => {
    const response = await apiClient.post<Goal>('/learning-path/goals', data);
    return response.data;
  },

  getGoals: async (completed?: boolean, category?: string): Promise<Goal[]> => {
    let url = '/learning-path/goals';
    const params = new URLSearchParams();

    if (completed !== undefined) params.append('completed', String(completed));
    if (category) params.append('category', category);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await apiClient.get<Goal[]>(url);
    return response.data;
  },

  getGoal: async (goalId: string): Promise<Goal> => {
    const response = await apiClient.get<Goal>(`/learning-path/goals/${goalId}`);
    return response.data;
  },

  updateGoal: async (goalId: string, data: GoalUpdate): Promise<Goal> => {
    const response = await apiClient.put<Goal>(`/learning-path/goals/${goalId}`, data);
    return response.data;
  },

  deleteGoal: async (goalId: string): Promise<void> => {
    await apiClient.delete(`/learning-path/goals/${goalId}`);
  },

  // Roadmap
  createRoadmap: async (data: RoadmapCreate): Promise<Roadmap> => {
    const response = await apiClient.post<Roadmap>('/learning-path/roadmap', data);
    return response.data;
  },

  getRoadmap: async (): Promise<Roadmap> => {
    const response = await apiClient.get<Roadmap>('/learning-path/roadmap');
    return response.data;
  },

  updateRoadmap: async (data: RoadmapUpdate): Promise<Roadmap> => {
    const response = await apiClient.put<Roadmap>('/learning-path/roadmap', data);
    return response.data;
  },

  // Progress
  getLearningPathProgress: async () => {
    try {
      console.log('Fetching learning path progress...');
      const response = await apiClient.get('/learning-path/progress');
      console.log('Learning path progress response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching learning path progress:', error);
      throw error;
    }
  },

  getLearningPath: async (): Promise<LearningPath> => {
    const response = await apiClient.get<LearningPath>('/learning-path');
    return response.data;
  },
};

export default learningPathApi;