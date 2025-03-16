import { create } from 'zustand';
import { Goal } from '@/types/goal';

interface GoalState {
  goals: Goal[];
  isLoading: boolean;
  error: string | null;

  // Actions
  addGoal: (goal: Omit<Goal, 'id' | 'completion_date' | 'progress' | 'progress_history'>) => void;
  updateGoal: (id: string, goal: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  fetchGoals: () => Promise<void>;
  fetchGoal: (id: string) => Promise<Goal | undefined>;
  markGoalComplete: (id: string) => void;
  updateGoalProgress: (id: string, progress: number) => void;
}

export const useGoalStore = create<GoalState>((set, get) => ({
  goals: [],
  isLoading: false,
  error: null,

  addGoal: (goalData) => {
    const newGoal: Goal = {
      id: crypto.randomUUID(),
      ...goalData,
      progress: 0,
      progress_history: [],
      completion_date: null
    };

    set((state) => ({
      goals: [...state.goals, newGoal]
    }));
  },

  updateGoal: (id, updatedGoalData) => {
    set((state) => ({
      goals: state.goals.map((goal) =>
        goal.id === id ? { ...goal, ...updatedGoalData } : goal
      )
    }));
  },

  deleteGoal: (id) => {
    set((state) => ({
      goals: state.goals.filter((goal) => goal.id !== id)
    }));
  },

  fetchGoals: async () => {
    set({ isLoading: true, error: null });
    try {
      // Here you would typically call an API
      // For now, we'll just simulate a delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // If you had an API, you would do something like:
      // const goals = await goalApi.getGoals();
      // set({ goals, isLoading: false });

      set({ isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch goals'
      });
    }
  },

  fetchGoal: async (id) => {
    set({ isLoading: true, error: null });
    try {
      // Here you would typically call an API
      // For now, we'll just return from the store
      const goal = get().goals.find(g => g.id === id);
      set({ isLoading: false });
      return goal;
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch goal'
      });
    }
  },

  markGoalComplete: (id) => {
    set((state) => ({
      goals: state.goals.map((goal) =>
        goal.id === id
          ? {
              ...goal,
              completed: true,
              completion_date: new Date().toISOString(),
              progress: 100
            }
          : goal
      )
    }));
  },

  updateGoalProgress: (id, progress) => {
    set((state) => ({
      goals: state.goals.map((goal) => {
        if (goal.id === id) {
          const newProgress = Math.min(Math.max(0, progress), 100);

          return {
            ...goal,
            progress: newProgress,
            progress_history: [
              ...goal.progress_history,
              { date: new Date().toISOString(), progress: newProgress }
            ],
            completed: newProgress === 100,
            completion_date: newProgress === 100 ? new Date().toISOString() : goal.completion_date
          };
        }
        return goal;
      })
    }));
  }
}));