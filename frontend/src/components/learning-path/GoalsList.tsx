import { useState } from 'react';
import { Goal } from '@/types/learning-path';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/cards';
import { Button } from '@/components/ui/buttons';
import { Badge } from '@/components/ui/data-display/badge';
import { PlusIcon, PencilIcon } from '@heroicons/react/24/outline';
import { GoalForm } from './GoalForm';

interface GoalsListProps {
  goals: Goal[];
}

export function GoalsList({ goals }: GoalsListProps) {
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);

  const priorityColors = {
    low: 'bg-blue-100 text-blue-800',
    medium: 'bg-amber-100 text-amber-800',
    high: 'bg-red-100 text-red-800',
  };

  const statusColors = {
    not_started: 'bg-gray-100 text-gray-800',
    in_progress: 'bg-indigo-100 text-indigo-800',
    completed: 'bg-green-100 text-green-800',
  };

  const handleAddGoal = () => {
    setIsAddingGoal(true);
  };

  const handleEditGoal = (goalId: string) => {
    setEditingGoalId(goalId);
  };

  const handleCancelEdit = () => {
    setIsAddingGoal(false);
    setEditingGoalId(null);
  };

  const handleGoalSubmit = () => {
    setIsAddingGoal(false);
    setEditingGoalId(null);
    // Refetch goals or update local state
  };

  const sortedGoals = [...goals].sort((a, b) => {
    // First sort by status (not started, in progress, completed)
    if (a.status !== b.status) {
      if (a.status === 'completed') return 1;
      if (b.status === 'completed') return -1;
      if (a.status === 'in_progress') return -1;
      if (b.status === 'in_progress') return 1;
    }

    // Then sort by priority (high, medium, low)
    if (a.priority !== b.priority) {
      if (a.priority === 'high') return -1;
      if (b.priority === 'high') return 1;
      if (a.priority === 'medium') return -1;
      if (b.priority === 'medium') return 1;
    }

    // Finally sort by target date
    return new Date(a.target_date).getTime() - new Date(b.target_date).getTime();
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Learning Goals</h2>
        <Button onClick={handleAddGoal} className="flex items-center">
          <PlusIcon className="w-5 h-5 mr-1" />
          Add Goal
        </Button>
      </div>

      {isAddingGoal && (
        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Add New Goal</CardTitle>
            </CardHeader>
            <CardContent>
              <GoalForm onSubmit={handleGoalSubmit} onCancel={handleCancelEdit} />
            </CardContent>
          </Card>
        </div>
      )}

      {sortedGoals.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 mb-4">You haven&apos;t set any learning goals yet.</p>
          <Button onClick={handleAddGoal} variant="outline">
            Create Your First Goal
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedGoals.map((goal) => (
            <Card key={goal.id} className={goal.status === 'completed' ? 'opacity-70' : ''}>
              <CardContent className="p-4">
                {editingGoalId === goal.id ? (
                  <GoalForm
                    goal={goal}
                    onSubmit={handleGoalSubmit}
                    onCancel={handleCancelEdit}
                  />
                ) : (
                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-medium">{goal.title}</h3>
                        <p className="text-gray-600 mt-1">{goal.description}</p>
                      </div>
                      <div className="flex space-x-2">
                        <Badge className={priorityColors[goal.priority]}>
                          {goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1)}
                        </Badge>
                        <Badge className={statusColors[goal.status]}>
                          {goal.status === 'not_started' && 'Not Started'}
                          {goal.status === 'in_progress' && 'In Progress'}
                          {goal.status === 'completed' && 'Completed'}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-4 flex justify-between items-center">
                      <div className="text-sm text-gray-500">
                        <span>Target: {new Date(goal.target_date).toLocaleDateString()}</span>
                        {goal.completion_date && (
                          <span className="ml-4">
                            Completed: {new Date(goal.completion_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditGoal(goal.id)}
                          className="flex items-center"
                        >
                          <PencilIcon className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </div>

                    {goal.milestones && goal.milestones.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-sm font-medium mb-2">Milestones: {goal.milestones.length}</p>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-blue-500 h-1.5 rounded-full"
                            style={{
                              width: `${goal.milestones.filter(m => m.status === 'completed').length / goal.milestones.length * 100}%`
                            }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}