// API-related types

export interface ApiErrorResponse {
  detail?: string;
  message?: string;
  status?: number;
  error?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: 'success' | 'error';
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}