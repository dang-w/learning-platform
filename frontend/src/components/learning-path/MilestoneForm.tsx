import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Milestone } from '@/types/learning-path';
import { Button } from '@/components/ui/buttons';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/forms/form';
import { Input } from '@/components/ui/forms/input';
import { Textarea } from '@/components/ui/forms/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/data-display/select';
import { DatePicker } from '@/components/ui/forms/date-picker';

const milestoneSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  status: z.enum(['not_started', 'in_progress', 'completed']),
  target_date: z.date(),
  completion_date: z.date().optional().nullable(),
  goal_id: z.string().optional(),
});

type MilestoneFormValues = z.infer<typeof milestoneSchema>;

interface MilestoneFormProps {
  milestone?: Milestone;
  onSubmit: () => void;
  onCancel: () => void;
  goalId?: string;
}

export function MilestoneForm({ milestone, onSubmit, onCancel, goalId }: MilestoneFormProps) {
  const form = useForm<MilestoneFormValues>({
    resolver: zodResolver(milestoneSchema),
    defaultValues: {
      title: milestone?.title || '',
      description: milestone?.description || '',
      status: milestone?.completed ? 'completed' : 'not_started',
      target_date: milestone?.target_date ? new Date(milestone.target_date) : new Date(),
      completion_date: milestone?.completion_date ? new Date(milestone.completion_date) : null,
      goal_id: goalId || undefined,
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCompletionDate, setShowCompletionDate] = useState(
    form.getValues().status === 'completed'
  );

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'status') {
        setShowCompletionDate(value.status === 'completed');

        // If status changed to completed and no completion date is set, set it to today
        if (value.status === 'completed' && !form.getValues().completion_date) {
          form.setValue('completion_date', new Date());
        }

        // If status changed from completed, clear the completion date
        if (value.status !== 'completed') {
          form.setValue('completion_date', null);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [form]);

  const handleSubmit = async (data: MilestoneFormValues) => {
    setIsSubmitting(true);
    try {
      // API call would go here
      // Example: await api.post('/milestones', data) or await api.put(`/milestones/${milestone.id}`, data)
      console.log('Submitting milestone data:', data);
      onSubmit();
    } catch (error) {
      console.error('Error submitting milestone:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter milestone title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe what this milestone involves"
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="target_date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Target Date</FormLabel>
              <DatePicker
                date={field.value}
                setDate={field.onChange}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        {showCompletionDate && (
          <FormField
            control={form.control}
            name="completion_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Completion Date</FormLabel>
                <DatePicker
                  date={field.value || undefined}
                  setDate={field.onChange}
                />
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="flex justify-end space-x-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : milestone ? 'Update Milestone' : 'Create Milestone'}
          </Button>
        </div>
      </form>
    </Form>
  );
}