import { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export interface FormGroupProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function FormGroup({ className, children, ...props }: FormGroupProps) {
  return (
    <div
      className={cn('space-y-2', className)}
      {...props}
    >
      {children}
    </div>
  );
}