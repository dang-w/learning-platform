export interface UserCredentials {
  username: string;
  password: string;
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

export interface Resource {
  id: string;
  title: string;
  url: string;
  description: string;
  type: string; // e.g., 'articles', 'videos', 'courses'
  status: 'pending' | 'completed' | 'archived'; // Example statuses
  user_id: string;
  created_at: string; // ISO Date string
  updated_at: string; // ISO Date string
  topics?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced'; // Example difficulties
  estimated_time?: number; // In minutes
  // Add any other fields returned by your API
}

export interface ResourceCreatePayload {
    title: string;
    url: string;
    description: string;
    type: 'articles' | 'videos' | 'courses' | 'books'; // Use specific types if the API expects them
    topics?: string[];
    difficulty?: 'beginner' | 'intermediate' | 'advanced'; // Use specific types matching Resource interface
    estimatedTime?: number; // Matches task input structure
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
