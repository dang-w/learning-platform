export type ResourceType = 'articles' | 'videos' | 'courses' | 'books'
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced'

export interface Resource {
  id: string
  title: string
  url: string
  topics: string[]
  difficulty: DifficultyLevel
  estimated_time: number
  completed: boolean
  date_added: string
  completion_date: string | null
  notes: string
}

export interface ResourceCreateInput {
  title: string
  url: string
  topics: string[]
  difficulty: DifficultyLevel
  estimated_time: number
}

export interface ResourceUpdateInput {
  title?: string
  url?: string
  topics?: string[]
  difficulty?: DifficultyLevel
  estimated_time?: number
  notes?: string
}

export interface ResourceCompleteInput {
  notes: string
}

export interface ResourceTypeStats {
  completed: number
  in_progress: number
  total: number
}

export interface ResourceStats {
  articles: ResourceTypeStats
  videos: ResourceTypeStats
  courses: ResourceTypeStats
  books: ResourceTypeStats
  total_completed: number
  total_in_progress: number
  total_resources: number
}