export type ResourceType = 'article' | 'video' | 'course' | 'book' | 'documentation'

export interface Resource {
  _id: string
  title: string
  description: string
  url: string
  type: ResourceType
  tags: string[]
  createdAt: string
  updatedAt: string
  createdBy: string
  isCompleted?: boolean
  completedAt?: string
  metadata?: {
    author?: string
    duration?: number
    difficulty?: 'beginner' | 'intermediate' | 'advanced'
    rating?: number
  }
}

export interface ResourceCreateInput extends Omit<Resource, '_id' | 'createdAt' | 'updatedAt' | 'createdBy'> {}

export interface ResourceUpdateInput extends Partial<ResourceCreateInput> {}