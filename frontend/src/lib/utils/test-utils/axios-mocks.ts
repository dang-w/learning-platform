import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// Define a type for the expected structure of AxiosError for testing purposes
interface TestAxiosError extends Error {
  isAxiosError: boolean;
  response?: AxiosResponse;
  config?: InternalAxiosRequestConfig;
  request?: unknown;
  code?: string;
  status?: number;
}

export function createAxiosErrorResponse(
  status: number,
  message: string,
  config: Partial<InternalAxiosRequestConfig> = {}
): AxiosError {
  const response: AxiosResponse = {
    data: { message },
    status,
    statusText: status === 401 ? 'Unauthorized' : 'Error',
    headers: {},
    config: {} as InternalAxiosRequestConfig
  };

  // Create a plain Error and cast it, then manually assign properties
  const error = new Error(`Request failed with status code ${status}`) as TestAxiosError;
  error.response = response;
  error.isAxiosError = true;
  error.config = config as InternalAxiosRequestConfig; // Add provided or default config
  error.request = {}; // Add request
  error.code = status === 401 ? 'ERR_UNAUTHORIZED' : `ERR_BAD_REQUEST_${status}`;
  error.status = status; // Explicitly set status property

  // Ensure the name property matches AxiosError
  error.name = 'AxiosError';

  // Explicitly set the prototype (might still be needed)
  Object.setPrototypeOf(error, AxiosError.prototype);

  // Return the crafted error, cast back to AxiosError for the function signature
  return error as AxiosError;
}