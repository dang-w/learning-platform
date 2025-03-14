import { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/solid';

export type AlertVariant = 'success' | 'error' | 'warning' | 'info';

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant: AlertVariant;
  title?: string;
  children: ReactNode;
  onClose?: () => void;
}

export function Alert({
  className,
  variant,
  title,
  children,
  onClose,
  ...props
}: AlertProps) {
  const variantClasses = {
    success: 'bg-green-50',
    error: 'bg-red-50',
    warning: 'bg-yellow-50',
    info: 'bg-blue-50',
  };

  const titleClasses = {
    success: 'text-green-800',
    error: 'text-red-800',
    warning: 'text-yellow-800',
    info: 'text-blue-800',
  };

  const contentClasses = {
    success: 'text-green-700',
    error: 'text-red-700',
    warning: 'text-yellow-700',
    info: 'text-blue-700',
  };

  const icons = {
    success: <CheckCircleIcon className="h-5 w-5 text-green-400" aria-hidden="true" />,
    error: <XCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />,
    warning: <ExclamationCircleIcon className="h-5 w-5 text-yellow-400" aria-hidden="true" />,
    info: <InformationCircleIcon className="h-5 w-5 text-blue-400" aria-hidden="true" />,
  };

  return (
    <div
      className={cn('rounded-md p-4', variantClasses[variant], className)}
      {...props}
    >
      <div className="flex">
        <div className="flex-shrink-0">
          {icons[variant]}
        </div>
        <div className="ml-3">
          {title && (
            <h3 className={cn('text-sm font-medium', titleClasses[variant])}>
              {title}
            </h3>
          )}
          <div className={cn('text-sm', title ? 'mt-2' : '', contentClasses[variant])}>
            {children}
          </div>
        </div>
        {onClose && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  'inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2',
                  {
                    'bg-green-50 text-green-500 hover:bg-green-100 focus:ring-green-600 focus:ring-offset-green-50': variant === 'success',
                    'bg-red-50 text-red-500 hover:bg-red-100 focus:ring-red-600 focus:ring-offset-red-50': variant === 'error',
                    'bg-yellow-50 text-yellow-500 hover:bg-yellow-100 focus:ring-yellow-600 focus:ring-offset-yellow-50': variant === 'warning',
                    'bg-blue-50 text-blue-500 hover:bg-blue-100 focus:ring-blue-600 focus:ring-offset-blue-50': variant === 'info',
                  }
                )}
              >
                <span className="sr-only">Dismiss</span>
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}