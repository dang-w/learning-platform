import { HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';

const progressVariants = cva(
  'w-full overflow-hidden rounded-full bg-gray-200',
  {
    variants: {
      size: {
        sm: 'h-1',
        md: 'h-2',
        lg: 'h-3',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

const progressBarVariants = cva(
  'h-full rounded-full transition-all',
  {
    variants: {
      variant: {
        default: 'bg-indigo-600',
        success: 'bg-green-600',
        warning: 'bg-yellow-600',
        danger: 'bg-red-600',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface ProgressProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof progressVariants> {
  value: number;
  max?: number;
  variant?: VariantProps<typeof progressBarVariants>['variant'];
  showValue?: boolean;
  valuePosition?: 'inside' | 'outside';
}

export function Progress({
  className,
  size,
  value,
  max = 100,
  variant,
  showValue = false,
  valuePosition = 'outside',
  ...props
}: ProgressProps) {
  const percentage = Math.min(Math.max(0, (value / max) * 100), 100);

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1">
        {props.children && <div className="text-sm font-medium text-gray-700">{props.children}</div>}
        {showValue && valuePosition === 'outside' && (
          <div className="text-sm font-medium text-gray-700">{Math.round(percentage)}%</div>
        )}
      </div>
      <div
        className={cn(progressVariants({ size, className }))}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        {...props}
      >
        <div
          className={cn(progressBarVariants({ variant }))}
          style={{ width: `${percentage}%` }}
        >
          {showValue && valuePosition === 'inside' && percentage > 20 && (
            <span className="px-2 text-xs font-medium text-white">{Math.round(percentage)}%</span>
          )}
        </div>
      </div>
    </div>
  );
}