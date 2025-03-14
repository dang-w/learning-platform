import { ReactNode, useState } from 'react';
import { Tab } from '@headlessui/react';
import { cn } from '@/lib/utils/cn';

export interface TabItem {
  label: string;
  content: ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  defaultIndex?: number;
  onChange?: (index: number) => void;
  variant?: 'default' | 'pills' | 'underline';
  className?: string;
}

export function Tabs({
  items,
  defaultIndex = 0,
  onChange,
  variant = 'default',
  className,
}: TabsProps) {
  const [selectedIndex, setSelectedIndex] = useState(defaultIndex);

  const handleChange = (index: number) => {
    setSelectedIndex(index);
    onChange?.(index);
  };

  const variantClasses = {
    default: {
      list: 'flex space-x-1 rounded-xl bg-gray-100 p-1',
      tab: {
        selected: 'bg-white shadow',
        notSelected: 'hover:bg-white/[0.12] hover:text-gray-700',
        base: 'w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500',
      },
    },
    pills: {
      list: 'flex space-x-2',
      tab: {
        selected: 'bg-indigo-600 text-white',
        notSelected: 'text-gray-500 hover:text-gray-700',
        base: 'rounded-full px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500',
      },
    },
    underline: {
      list: 'flex space-x-8 border-b border-gray-200',
      tab: {
        selected: 'border-indigo-600 text-indigo-600',
        notSelected: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
        base: 'py-4 px-1 text-sm font-medium border-b-2 focus:outline-none focus:ring-0',
      },
    },
  };

  return (
    <div className={cn('w-full', className)}>
      <Tab.Group selectedIndex={selectedIndex} onChange={handleChange}>
        <Tab.List className={variantClasses[variant].list}>
          {items.map((item, index) => (
            <Tab
              key={index}
              disabled={item.disabled}
              className={({ selected }) =>
                cn(
                  variantClasses[variant].tab.base,
                  selected
                    ? variantClasses[variant].tab.selected
                    : variantClasses[variant].tab.notSelected,
                  item.disabled && 'opacity-50 cursor-not-allowed'
                )
              }
            >
              {item.label}
            </Tab>
          ))}
        </Tab.List>
        <Tab.Panels className="mt-2">
          {items.map((item, index) => (
            <Tab.Panel
              key={index}
              className={cn(
                'rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
              )}
            >
              {item.content}
            </Tab.Panel>
          ))}
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
}