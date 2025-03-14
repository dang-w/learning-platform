import { LabelHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  error?: boolean;
}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, error, children, ...props }, ref) => {
    return (
      <label
        className={cn(
          'block text-sm font-medium',
          error ? 'text-red-700' : 'text-gray-700',
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </label>
    );
  }
);

Label.displayName = 'Label';