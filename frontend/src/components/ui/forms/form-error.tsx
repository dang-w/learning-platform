import { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export interface FormErrorProps extends HTMLAttributes<HTMLParagraphElement> {
  children: ReactNode;
}

export function FormError({ className, children, ...props }: FormErrorProps) {
  return (
    <p
      className={cn('mt-1 text-sm text-red-600', className)}
      {...props}
    >
      {children}
    </p>
  );
}