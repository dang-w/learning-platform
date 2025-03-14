import { useMemo } from 'react';
import { Goal, Milestone } from '@/types/learning-path';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/cards';
import { Progress } from '@/components/ui/feedback/progress';

interface ProgressTrackerProps {
  goals: Goal[];
  milestones: Milestone[];
}

export function ProgressTracker({ goals, milestones }: ProgressTrackerProps) {
  const {
    completedGoalsCount,
    totalGoalsCount,
    completedMilestonesCount,
    totalMilestonesCount,
    nextMilestones
  } = useMemo(() => {
    const completedGoals = goals.filter(goal => goal.status === 'completed');
    const completedMilestones = milestones.filter(milestone => milestone.status === 'completed');

    // Find the next milestones (in progress or not started, sorted by target date)
    const inProgressMilestones = milestones
      .filter(milestone => milestone.status === 'in_progress')
      .sort((a, b) => new Date(a.target_date).getTime() - new Date(b.target_date).getTime());

    const notStartedMilestones = milestones
      .filter(milestone => milestone.status === 'not_started')
      .sort((a, b) => new Date(a.target_date).getTime() - new Date(b.target_date).getTime());

    // Prioritize in-progress milestones, then not started ones
    const nextMilestones = [...inProgressMilestones, ...notStartedMilestones].slice(0, 3);

    return {
      completedGoalsCount: completedGoals.length,
      totalGoalsCount: goals.length,
      completedMilestonesCount: completedMilestones.length,
      totalMilestonesCount: milestones.length,
      nextMilestones
    };
  }, [goals, milestones]);

  const goalsCompletionPercentage = totalGoalsCount > 0
    ? Math.round((completedGoalsCount / totalGoalsCount) * 100)
    : 0;

  const milestonesCompletionPercentage = totalMilestonesCount > 0
    ? Math.round((completedMilestonesCount / totalMilestonesCount) * 100)
    : 0;

  const overallCompletionPercentage = Math.round(
    (goalsCompletionPercentage + milestonesCompletionPercentage) / 2
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Overall Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Overall Completion</span>
                <span className="text-sm font-medium">{overallCompletionPercentage}%</span>
              </div>
              <Progress value={overallCompletionPercentage} />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Goals</span>
                <span className="text-sm font-medium">{completedGoalsCount} of {totalGoalsCount} ({goalsCompletionPercentage}%)</span>
              </div>
              <Progress value={goalsCompletionPercentage} />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Milestones</span>
                <span className="text-sm font-medium">{completedMilestonesCount} of {totalMilestonesCount} ({milestonesCompletionPercentage}%)</span>
              </div>
              <Progress value={milestonesCompletionPercentage} />
            </div>
          </div>
        </CardContent>
      </Card>

      {nextMilestones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Up Next</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {nextMilestones.map(milestone => {
                const relatedGoal = goals.find(goal => goal.id === milestone.goal_id);
                const daysUntilDue = Math.ceil(
                  (new Date(milestone.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                );

                return (
                  <li key={milestone.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{milestone.title}</h4>
                        {relatedGoal && (
                          <p className="text-sm text-gray-500">Part of: {relatedGoal.title}</p>
                        )}
                      </div>
                      <div className={`text-sm font-medium ${daysUntilDue < 0 ? 'text-red-500' : daysUntilDue < 7 ? 'text-amber-500' : 'text-green-500'}`}>
                        {daysUntilDue < 0
                          ? `${Math.abs(daysUntilDue)} days overdue`
                          : daysUntilDue === 0
                            ? 'Due today'
                            : `${daysUntilDue} days left`}
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${milestone.status === 'in_progress' ? 'bg-blue-500' : 'bg-gray-400'}`}
                          style={{ width: milestone.status === 'in_progress' ? '50%' : '0%' }}
                        ></div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}