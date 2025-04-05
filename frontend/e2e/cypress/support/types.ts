export interface UserCredentials {
  username: string;
  password?: string; // Optional if only username is needed sometimes
  email?: string; // Add optional email
  firstName?: string; // Add optional firstName
  lastName?: string; // Add optional lastName
}

export interface UserRegistrationData {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
}

export interface UserProfileData {
    // Define fields expected by the profile update form/API
    firstName?: string;
    lastName?: string;
    email?: string;
    // Add other updatable profile fields
}

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type ResourceTypeString = 'article' | 'video' | 'course' | 'book' | 'documentation' | 'tool' | 'other';

export interface Resource {
  id: string;
  title: string;
  url: string;
  description: string;
  type: ResourceTypeString; // e.g., 'articles', 'videos', 'courses'
  status: 'pending' | 'completed' | 'archived'; // Example statuses
  user_id: string;
  created_at: string; // ISO Date string
  updated_at: string; // ISO Date string
  topics?: string[];
  difficulty?: DifficultyLevel; // Example difficulties
  estimated_time?: number; // In minutes
  // Add any other fields returned by your API
}

export interface ResourceCreatePayload {
    title: string;
    url: string;
    description: string;
    type: 'article' | 'video' | 'course' | 'book'; // Use specific types if the API expects them
    topics?: string[];
    difficulty?: 'beginner' | 'intermediate' | 'advanced'; // Use specific types matching Resource interface
    estimated_time?: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface TestNotesState {
  successMessage: string | null;
  errorMessage: string | null;
  notes: Note[];
  filteredNotes: Note[];
  selectedNote: Note | null;
  isLoading: boolean;
  error: string | null;
  activeTag: string | null;
  searchTerm: string;
}
