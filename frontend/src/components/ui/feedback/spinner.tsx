import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'white';
}

export function Spinner({
  className,
  size = 'md',
  color = 'primary',
  ...props
}: SpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  const colorClasses = {
    primary: 'border-indigo-600 border-t-transparent',
    white: 'border-white border-t-transparent',
  };

  return (
    <div
      className={cn('animate-spin rounded-full border-2', sizeClasses[size], colorClasses[color], className)}
      {...props}
    />
  );
}