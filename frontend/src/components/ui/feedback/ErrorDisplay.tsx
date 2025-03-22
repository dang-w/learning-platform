'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';
interface ErrorDisplayProps {
  error?: Error | string | unknown;
  title?: string;
  message?: string;
}

export default function ErrorDisplay({ error, title = 'Error', message: propMessage }: ErrorDisplayProps) {
  // Get the error message
  let message = propMessage || '';

  if (!message) {
    if (typeof error === 'string') {
      message = error;
    } else if (error instanceof Error) {
      message = error.message;
    } else if (error && typeof error === 'object' && 'message' in error) {
      message = String(error.message);
    } else if (error && typeof error === 'object' && 'response' in error && typeof error.response === 'object') {
      const response = error.response as {
        data?: { detail?: string };
        status?: number;
        statusText?: string;
      };
      if (response?.data?.detail) {
        message = String(response.data.detail);
      } else if (response?.statusText) {
        message = `${response.status}: ${response.statusText}`;
      }
    } else if (error) {
      message = 'An unexpected error occurred';
    }
  }

  // If no error and no message, don't render anything
  if (!message && !error) {
    return null;
  }

  // Safely type the error with a specific interface
  const errorObj = error as {
    config?: { url?: string; method?: string };
    response?: {
      status?: number;
      data?: Record<string, unknown>;
    };
  };

  return (
    <div className="bg-red-50 border border-red-200 rounded-md p-4 my-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <AlertCircle className="h-5 w-5 text-red-500" />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">{title}</h3>
          <div className="mt-2 text-sm text-red-700">
            <p>{message}</p>

            {/* Show additional debug info if available */}
            {errorObj?.config && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs font-medium">Debug Details</summary>
                <div className="mt-2 text-xs overflow-auto max-h-56 p-2 bg-red-100 rounded">
                  <p>URL: {errorObj.config.url}</p>
                  <p>Method: {errorObj.config.method?.toUpperCase()}</p>
                  <p>Status: {errorObj.response?.status}</p>
                  {errorObj.response?.data && (
                    <>
                      <p className="mt-1 font-semibold">Response:</p>
                      <pre className="whitespace-pre-wrap break-all">{JSON.stringify(errorObj.response.data, null, 2)}</pre>
                    </>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}