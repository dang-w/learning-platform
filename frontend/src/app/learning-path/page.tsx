'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { learningPathApi } from '@/lib/api';
import { Tabs } from '@/components/ui/layout/tabs';
import {
  GoalsList,
  Roadmap,
  MilestonesList,
  ProgressTracker
} from '@/components/learning-path';
import { Spinner } from '@/components/ui/feedback';

export default function LearningPathPage() {
  const [activeTab, setActiveTab] = useState(0);

  const { data: learningPath, isLoading } = useQuery({
    queryKey: ['learning-path'],
    queryFn: () => learningPathApi.getLearningPath(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  const tabItems = [
    {
      label: 'Goals',
      content: <GoalsList goals={learningPath?.goals || []} />,
    },
    {
      label: 'Roadmap',
      content: (
        <Roadmap
          milestones={learningPath?.milestones || []}
          goals={learningPath?.goals || []}
        />
      ),
    },
    {
      label: 'Milestones',
      content: <MilestonesList milestones={learningPath?.milestones || []} />,
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Learning Path</h1>
          <p className="text-gray-600 mt-2">
            Track your learning journey, set goals, and monitor your progress
          </p>
        </div>
        <div className="mt-4 md:mt-0">
          <ProgressTracker
            goals={learningPath?.goals || []}
            milestones={learningPath?.milestones || []}
          />
        </div>
      </div>

      <Tabs
        items={tabItems}
        defaultIndex={activeTab}
        onChange={setActiveTab}
        variant="underline"
      />
    </div>
  );
}