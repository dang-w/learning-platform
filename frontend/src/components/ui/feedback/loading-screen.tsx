import React from 'react';
import { Spinner } from './spinner';

interface LoadingScreenProps {
  message?: string;
  submessage?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading...',
  submessage
}) => {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center">
        <Spinner size="lg" className="mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{message}</h2>
        {submessage && (
          <p className="text-sm text-gray-600">{submessage}</p>
        )}
      </div>
    </div>
  );
};