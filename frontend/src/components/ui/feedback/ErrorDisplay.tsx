'use client';

import React from 'react';
import { Alert, AlertCircle } from 'lucide-react';

interface ErrorDisplayProps {
  error: any;
  title?: string;
}

export default function ErrorDisplay({ error, title = 'Error' }: ErrorDisplayProps) {
  // Get the error message
  let message = '';

  if (typeof error === 'string') {
    message = error;
  } else if (error?.message) {
    message = error.message;
  } else if (error?.response?.data?.detail) {
    message = error.response.data.detail;
  } else if (error?.response?.statusText) {
    message = `${error.response.status}: ${error.response.statusText}`;
  } else {
    message = 'An unexpected error occurred';
  }

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
            {error?.config && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs font-medium">Debug Details</summary>
                <div className="mt-2 text-xs overflow-auto max-h-56 p-2 bg-red-100 rounded">
                  <p>URL: {error.config.url}</p>
                  <p>Method: {error.config.method?.toUpperCase()}</p>
                  <p>Status: {error.response?.status}</p>
                  {error.response?.data && (
                    <>
                      <p className="mt-1 font-semibold">Response:</p>
                      <pre className="whitespace-pre-wrap break-all">{JSON.stringify(error.response.data, null, 2)}</pre>
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