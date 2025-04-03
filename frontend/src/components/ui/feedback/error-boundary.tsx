import React from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { Button } from '@/components/ui/buttons';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div role="alert" className="p-4 border border-red-300 bg-red-50 rounded-md">
      <p className="text-red-700 font-semibold">Something went wrong:</p>
      <pre className="text-red-600 text-sm mt-2 whitespace-pre-wrap">{error.message}</pre>
      <Button onClick={resetErrorBoundary} variant="destructive" size="sm" className="mt-4">
        Try again
      </Button>
    </div>
  );
}

export const ErrorBoundary: React.FC<Props> = ({ children, fallback }) => {
  return (
    <ReactErrorBoundary
      FallbackComponent={fallback ? () => <>{fallback}</> : ErrorFallback}
      onReset={() => {
        // reset the state of your app so the error doesn't happen again
        console.log('ErrorBoundary reset triggered');
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
};