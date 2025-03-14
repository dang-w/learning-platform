'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/cards';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ChartBarIcon,
  ClockIcon,
  BookOpenIcon,
  AcademicCapIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState('overview');

  const analyticsModules = [
    {
      id: 'study-time',
      title: 'Study Time Analytics',
      description: 'Analyze your study patterns, focus scores, and time distribution across topics.',
      icon: ClockIcon,
      href: '/analytics/study-time',
      color: 'bg-blue-100 text-blue-600',
    },
    {
      id: 'resources',
      title: 'Resource Completion',
      description: 'Track your progress through different types of learning resources.',
      icon: BookOpenIcon,
      href: '/analytics/resources',
      color: 'bg-green-100 text-green-600',
    },
    {
      id: 'knowledge',
      title: 'Knowledge Retention',
      description: 'Visualize your knowledge growth and retention through spaced repetition.',
      icon: AcademicCapIcon,
      href: '/analytics/knowledge',
      color: 'bg-purple-100 text-purple-600',
    },
    {
      id: 'learning-path',
      title: 'Learning Path Progress',
      description: 'Track your progress through custom learning paths and roadmaps.',
      icon: ArrowTrendingUpIcon,
      href: '/analytics/learning-path',
      color: 'bg-amber-100 text-amber-600',
    },
    {
      id: 'reports',
      title: 'Weekly Reports',
      description: 'Generate and view detailed weekly learning reports.',
      icon: ChartBarIcon,
      href: '/analytics/reports',
      color: 'bg-rose-100 text-rose-600',
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Progress Analytics</h1>
          <p className="text-gray-500 mt-2">
            Comprehensive analytics to track and optimize your learning journey
          </p>
        </div>
        <div className="mt-4 md:mt-0">
          <Link
            href="/analytics/reports/generate"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <ChartBarIcon className="w-5 h-5 mr-2" />
            Generate Report
          </Link>
        </div>
      </div>

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="study-time">Study Time</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
          <TabsTrigger value="learning-path">Learning Path</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {analyticsModules.map((module) => (
              <Link key={module.id} href={module.href}>
                <Card className="h-full hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-center gap-4">
                    <div className={`p-3 rounded-lg ${module.color}`}>
                      <module.icon className="w-6 h-6" />
                    </div>
                    <CardTitle>{module.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-500">{module.description}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="study-time" className="mt-6">
          <div className="text-center py-12">
            <p className="text-gray-500">
              Please navigate to the Study Time Analytics page for detailed insights.
            </p>
            <Link
              href="/analytics/study-time"
              className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Go to Study Time Analytics
            </Link>
          </div>
        </TabsContent>

        <TabsContent value="resources" className="mt-6">
          <div className="text-center py-12">
            <p className="text-gray-500">
              Please navigate to the Resource Completion Analytics page for detailed insights.
            </p>
            <Link
              href="/analytics/resources"
              className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Go to Resource Analytics
            </Link>
          </div>
        </TabsContent>

        <TabsContent value="knowledge" className="mt-6">
          <div className="text-center py-12">
            <p className="text-gray-500">
              Please navigate to the Knowledge Retention Analytics page for detailed insights.
            </p>
            <Link
              href="/analytics/knowledge"
              className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Go to Knowledge Analytics
            </Link>
          </div>
        </TabsContent>

        <TabsContent value="learning-path" className="mt-6">
          <div className="text-center py-12">
            <p className="text-gray-500">
              Please navigate to the Learning Path Progress Analytics page for detailed insights.
            </p>
            <Link
              href="/analytics/learning-path"
              className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Go to Learning Path Analytics
            </Link>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}