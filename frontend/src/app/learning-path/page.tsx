'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { learningPathApi } from '@/lib/api';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  GoalsList,
  Roadmap,
  MilestonesList,
  ProgressTracker
} from '@/components/learning-path';
import { Spinner } from '@/components/ui/feedback';

export default function LearningPathPage() {
  const [activeTab, setActiveTab] = useState('goals');

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

  return (
    <div className="container mx-auto px-4 py-8" data-testid="learning-path-overview">
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

      <Tabs defaultValue="goals" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start border-b border-gray-200 bg-transparent p-0">
          <TabsTrigger
            value="goals"
            className="border-b-2 border-transparent px-4 py-2 data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent"
          >
            Goals
          </TabsTrigger>
          <TabsTrigger
            value="roadmap"
            className="border-b-2 border-transparent px-4 py-2 data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent"
          >
            Roadmap
          </TabsTrigger>
          <TabsTrigger
            value="milestones"
            className="border-b-2 border-transparent px-4 py-2 data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent"
          >
            Milestones
          </TabsTrigger>
        </TabsList>
        <TabsContent value="goals">
          <GoalsList goals={learningPath?.goals || []} />
        </TabsContent>
        <TabsContent value="roadmap">
          <Roadmap
            milestones={learningPath?.milestones || []}
            goals={learningPath?.goals || []}
          />
        </TabsContent>
        <TabsContent value="milestones">
          <MilestonesList milestones={learningPath?.milestones || []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}