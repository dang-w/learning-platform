import { useState } from 'react';
import { Milestone } from '@/types/learning-path';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/cards';
import { Button } from '@/components/ui/buttons';
import { Badge } from '@/components/ui/data-display/badge';
import { PlusIcon, PencilIcon } from '@heroicons/react/24/outline';
import { MilestoneForm } from './MilestoneForm';

interface MilestonesListProps {
  milestones: Milestone[];
}

export function MilestonesList({ milestones }: MilestonesListProps) {
  const [isAddingMilestone, setIsAddingMilestone] = useState(false);
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);

  const statusColors = {
    not_started: 'bg-gray-100 text-gray-800',
    in_progress: 'bg-indigo-100 text-indigo-800',
    completed: 'bg-green-100 text-green-800',
  };

  const handleAddMilestone = () => {
    setIsAddingMilestone(true);
  };

  const handleEditMilestone = (milestoneId: string) => {
    setEditingMilestoneId(milestoneId);
  };

  const handleCancelEdit = () => {
    setIsAddingMilestone(false);
    setEditingMilestoneId(null);
  };

  const handleMilestoneSubmit = () => {
    setIsAddingMilestone(false);
    setEditingMilestoneId(null);
    // Refetch milestones or update local state
  };

  const sortedMilestones = [...milestones].sort((a, b) => {
    // Sort by status (not started, in progress, completed)
    if (a.status !== b.status) {
      if (a.status === 'completed') return 1;
      if (b.status === 'completed') return -1;
      if (a.status === 'in_progress') return -1;
      if (b.status === 'in_progress') return 1;
    }

    // Then sort by target date
    return new Date(a.target_date).getTime() - new Date(b.target_date).getTime();
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Milestones</h2>
        <Button onClick={handleAddMilestone} className="flex items-center">
          <PlusIcon className="w-5 h-5 mr-1" />
          Add Milestone
        </Button>
      </div>

      {isAddingMilestone && (
        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Add New Milestone</CardTitle>
            </CardHeader>
            <CardContent>
              <MilestoneForm onSubmit={handleMilestoneSubmit} onCancel={handleCancelEdit} />
            </CardContent>
          </Card>
        </div>
      )}

      {sortedMilestones.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 mb-4">You haven&apos;t created any milestones yet.</p>
          <Button onClick={handleAddMilestone} variant="outline">
            Create Your First Milestone
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedMilestones.map((milestone) => (
            <Card key={milestone.id} className={milestone.status === 'completed' ? 'opacity-70' : ''}>
              <CardContent className="p-4">
                {editingMilestoneId === milestone.id ? (
                  <MilestoneForm
                    milestone={milestone}
                    onSubmit={handleMilestoneSubmit}
                    onCancel={handleCancelEdit}
                  />
                ) : (
                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-medium">{milestone.title}</h3>
                        <p className="text-gray-600 mt-1">{milestone.description}</p>
                      </div>
                      <Badge className={statusColors[milestone.status]}>
                        {milestone.status === 'not_started' && 'Not Started'}
                        {milestone.status === 'in_progress' && 'In Progress'}
                        {milestone.status === 'completed' && 'Completed'}
                      </Badge>
                    </div>

                    <div className="mt-4 flex justify-between items-center">
                      <div className="text-sm text-gray-500">
                        <span>Target: {new Date(milestone.target_date).toLocaleDateString()}</span>
                        {milestone.completion_date && (
                          <span className="ml-4">
                            Completed: {new Date(milestone.completion_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditMilestone(milestone.id)}
                          className="flex items-center"
                        >
                          <PencilIcon className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </div>

                    {milestone.resources.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-sm font-medium mb-2">Resources: {milestone.resources.length}</p>
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