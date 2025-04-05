import { z } from 'zod';
import { ResourceTypeString, DifficultyLevel } from '@/types/resource';

// Define all possible resource types and difficulties for Zod enums
const resourceTypes: [ResourceTypeString, ...ResourceTypeString[]] = ['article', 'video', 'course', 'book', 'documentation', 'tool', 'other'];
const difficultyLevels: [DifficultyLevel, ...DifficultyLevel[]] = ['beginner', 'intermediate', 'advanced', 'expert'];

export const resourceSchema = z.object({
  url: z.string().url('Please enter a valid URL'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  type: z.enum(resourceTypes, { errorMap: () => ({ message: 'Please select a valid resource type' }) }),
  estimated_time: z.preprocess(
    (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
    z.number().min(1, 'Estimated time must be at least 1 minute').int('Estimated time must be an integer')
  ),
  difficulty: z.enum(difficultyLevels, { errorMap: () => ({ message: 'Please select a valid difficulty level' }) }),
  topics: z.array(z.string()).min(0), // Allow zero topics initially, handle validation elsewhere if needed
});

// Use the inferred type from Zod schema
export type ResourceFormData = z.infer<typeof resourceSchema>;