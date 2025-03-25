import React from 'react';

interface LoadingIndicatorProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'light';
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  size = 'medium',
  color = 'primary',
}) => {
  // Determine size classes
  const sizeClasses = {
    small: 'h-6 w-6 border-2',
    medium: 'h-10 w-10 border-3',
    large: 'h-16 w-16 border-4',
  };

  // Determine color classes
  const colorClasses = {
    primary: 'border-indigo-600',
    secondary: 'border-purple-600',
    light: 'border-gray-300',
  };

  return (
    <div className="flex items-center justify-center w-full h-full p-8">
      <div
        className={`
          ${sizeClasses[size]}
          ${colorClasses[color]}
          animate-spin rounded-full
          border-t-transparent
        `}
      />
    </div>
  );
};

export default LoadingIndicator;