import { create } from 'zustand'
import { ResourceTypeString as ResourceType } from '@/types/resource'

interface ProgressStats {
  totalResources: number
  completedResources: number
  completionPercentage: number
  streak: number
  lastActivityDate: string | null
  timeSpent: number // in minutes
}

type ProgressData = {
  total: number
  completed: number
  percentage: number
}

type ProgressByType = Record<ResourceType, ProgressData>

interface ProgressState {
  stats: ProgressStats
  progressByType: ProgressByType
  isLoading: boolean
  error: string | null
  // Actions
  updateProgress: (type: ResourceType, completed: boolean) => void
  setTimeSpent: (minutes: number) => void
  resetProgress: () => void
}

const initialProgressByType: ProgressByType = {
  article: { total: 0, completed: 0, percentage: 0 },
  video: { total: 0, completed: 0, percentage: 0 },
  course: { total: 0, completed: 0, percentage: 0 },
  book: { total: 0, completed: 0, percentage: 0 },
  documentation: { total: 0, completed: 0, percentage: 0 },
  tool: { total: 0, completed: 0, percentage: 0 },
  other: { total: 0, completed: 0, percentage: 0 },
}

const calculateStats = (progressByType: ProgressByType): ProgressStats => {
  const totalResources = Object.values(progressByType).reduce<number>(
    (sum, { total }) => sum + total,
    0
  )
  const completedResources = Object.values(progressByType).reduce<number>(
    (sum, { completed }) => sum + completed,
    0
  )

  return {
    totalResources,
    completedResources,
    completionPercentage: totalResources > 0
      ? (completedResources / totalResources) * 100
      : 0,
    streak: 0, // This should be calculated based on activity history
    lastActivityDate: null,
    timeSpent: 0,
  }
}

export const useProgressStore = create<ProgressState>((set) => ({
  stats: calculateStats(initialProgressByType),
  progressByType: initialProgressByType,
  isLoading: false,
  error: null,

  updateProgress: (type: ResourceType, completed: boolean) => {
    set((state) => {
      const newProgressByType = {
        ...state.progressByType,
        [type]: {
          ...state.progressByType[type],
          completed: state.progressByType[type].completed + (completed ? 1 : -1),
        },
      }

      // Recalculate percentages
      Object.keys(newProgressByType).forEach((key) => {
        const typeKey = key as ResourceType
        const progress = newProgressByType[typeKey]
        progress.percentage = progress.total > 0
          ? (progress.completed / progress.total) * 100
          : 0
      })

      return {
        progressByType: newProgressByType,
        stats: {
          ...calculateStats(newProgressByType),
          lastActivityDate: new Date().toISOString(),
        },
      }
    })
  },

  setTimeSpent: (minutes: number) => {
    set((state) => ({
      stats: {
        ...state.stats,
        timeSpent: state.stats.timeSpent + minutes,
        lastActivityDate: new Date().toISOString(),
      },
    }))
  },

  resetProgress: () => {
    set({
      stats: calculateStats(initialProgressByType),
      progressByType: initialProgressByType,
      error: null,
    })
  },
}))