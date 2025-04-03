import { useMemo } from 'react';
import { Goal, Milestone } from '@/types/learning-path';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/cards';
import {
  CheckCircleIcon,
  ClockIcon,
  ArrowLongRightIcon,
} from '@heroicons/react/24/outline';

interface RoadmapProps {
  goals: Goal[];
  milestones: Milestone[];
}

export function Roadmap({ goals, milestones }: RoadmapProps) {
  // Organize milestones by goal
  const goalMilestones = useMemo(() => {
    const result: Record<string, Milestone[]> = {};

    // Initialize with empty arrays for all goals
    goals.forEach(goal => {
      result[goal.id] = [];
    });

    // Add milestones to their respective goals
    milestones.forEach(milestone => {
      if (result[milestone.goal_id]) {
        result[milestone.goal_id].push(milestone);
      }
    });

    // Sort milestones by target date within each goal
    Object.keys(result).forEach(goalId => {
      result[goalId].sort((a, b) =>
        new Date(a.target_date).getTime() - new Date(b.target_date).getTime()
      );
    });

    return result;
  }, [goals, milestones]);

  // Sort goals by priority and target date
  const sortedGoals = useMemo(() => {
    return [...goals].sort((a, b) => {
      // First by priority
      if (a.priority !== b.priority) {
        if (a.priority === 'high') return -1;
        if (b.priority === 'high') return 1;
        if (a.priority === 'medium') return -1;
        if (b.priority === 'medium') return 1;
      }

      // Then by target date
      return new Date(a.target_date).getTime() - new Date(b.target_date).getTime();
    });
  }, [goals]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (goals.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <p className="text-gray-500 mb-4">
          You haven&apos;t set any learning goals yet. Create goals and milestones to visualize your learning path.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="roadmap-visualization">
      <h2 className="text-xl font-semibold mb-6">Your Learning Roadmap</h2>

      <div className="space-y-8">
        {sortedGoals.map((goal) => (
          <Card key={goal.id}>
            <CardHeader className={getStatusColor(goal.status)}>
              <CardTitle className="flex items-center">
                {goal.status === 'completed' ? (
                  <CheckCircleIcon className="w-5 h-5 mr-2 text-green-600" />
                ) : (
                  <ClockIcon className="w-5 h-5 mr-2 text-blue-600" />
                )}
                {goal.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <p className="text-gray-600 mb-4">{goal.description}</p>

              {/* Timeline */}
              <div className="mt-6">
                {goalMilestones[goal.id]?.length > 0 ? (
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

                    {/* Milestones */}
                    <div className="space-y-8">
                      {goalMilestones[goal.id].map((milestone, index) => (
                        <div key={milestone.id} className="relative pl-12">
                          {/* Timeline dot */}
                          <div className={`absolute left-2 top-1.5 w-5 h-5 rounded-full border-2 ${
                            milestone.status === 'completed'
                              ? 'bg-green-100 border-green-500'
                              : milestone.status === 'in_progress'
                              ? 'bg-blue-100 border-blue-500'
                              : 'bg-gray-100 border-gray-300'
                          }`} />

                          {/* Milestone content */}
                          <div className={`p-4 rounded-lg border ${getStatusColor(milestone.status)}`}>
                            <h4 className="font-medium">{milestone.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{milestone.description}</p>
                            <p className="text-xs text-gray-500 mt-2">
                              Target: {new Date(milestone.target_date).toLocaleDateString()}
                              {milestone.completion_date && (
                                <span className="ml-3">
                                  Completed: {new Date(milestone.completion_date).toLocaleDateString()}
                                </span>
                              )}
                            </p>
                          </div>

                          {/* Connector arrow to next milestone */}
                          {index < goalMilestones[goal.id].length - 1 && (
                            <div className="absolute left-4 top-12 h-8 flex items-center justify-center">
                              <ArrowLongRightIcon className="w-4 h-4 text-gray-400 rotate-90" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm italic">No milestones created for this goal yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}