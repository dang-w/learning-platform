import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/cards'
import {
  BookOpenIcon,
  AcademicCapIcon,
  ClockIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'

const actions = [
  {
    title: 'Add Resource',
    description: 'Add a new learning resource',
    href: '/resources/new',
    icon: PlusIcon,
    color: 'text-blue-600 bg-blue-100',
  },
  {
    title: 'Start Review',
    description: 'Review your learned concepts',
    href: '/reviews/session',
    icon: ClockIcon,
    color: 'text-purple-600 bg-purple-100',
  },
  {
    title: 'View Progress',
    description: 'Check your learning progress',
    href: '/resources',
    icon: BookOpenIcon,
    color: 'text-green-600 bg-green-100',
  },
  {
    title: 'Set Goals',
    description: 'Manage your learning goals',
    href: '/goals',
    icon: AcademicCapIcon,
    color: 'text-yellow-600 bg-yellow-100',
  },
]

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {actions.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className="flex flex-col items-center p-4 rounded-lg border hover:bg-gray-50 transition-colors"
            >
              <div className={`p-3 rounded-lg ${action.color} mb-3`}>
                <action.icon className="w-6 h-6" />
              </div>
              <h4 className="font-medium text-gray-900">{action.title}</h4>
              <p className="text-sm text-gray-500 text-center">
                {action.description}
              </p>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}