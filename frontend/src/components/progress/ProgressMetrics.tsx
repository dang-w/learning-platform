import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/cards';
import { Button } from '@/components/ui/buttons';
import { StudyMetricsForm } from '@/components/progress/StudyMetricsForm';
import progressApi, { Metric, MetricCreate } from '@/lib/api/progress';
import { StudyMetricFormData } from '@/types/progress';

export function ProgressMetrics() {
  const [showForm, setShowForm] = useState(false);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const queryClient = useQueryClient();

  // Fetch recent metrics summary
  const { data: summary, isLoading: isSummaryLoading, isError: isSummaryError, refetch: refetchSummary } = useQuery({
    queryKey: ['progressSummary'],
    queryFn: () => progressApi.getRecentMetricsSummary(7),
  });

  // Fetch metrics with optional date filter
  const { data: metrics, isLoading: isMetricsLoading, isError: isMetricsError, refetch: refetchMetrics } = useQuery({
    queryKey: ['progressMetrics', startDate, endDate],
    queryFn: () => progressApi.getMetrics(startDate || undefined, endDate || undefined),
    enabled: !isSummaryLoading, // Only fetch metrics after summary is loaded
  });

  // Mutation for adding a new metric
  const addMetricMutation = useMutation({
    mutationFn: (data: MetricCreate) => progressApi.addMetric(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progressSummary'] });
      queryClient.invalidateQueries({ queryKey: ['progressMetrics'] });
      setShowForm(false);
    },
  });

  const handleSubmit = (data: StudyMetricFormData) => {
    addMetricMutation.mutate({
      date: data.date,
      study_hours: data.study_hours,
      topics: Array.isArray(data.topics) ? data.topics.join(', ') : data.topics,
      focus_score: data.focus_score,
      notes: data.notes,
    });
  };

  const handleFilterApply = () => {
    refetchMetrics();
    setShowFilter(false);
  };

  const handleTryAgain = () => {
    refetchSummary();
    refetchMetrics();
  };

  const isLoading = isSummaryLoading || isMetricsLoading;
  const isError = isSummaryError || isMetricsError;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
        <p className="ml-2">Loading progress metrics...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-red-500 mb-4">Error loading progress metrics</p>
        <Button onClick={handleTryAgain}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>Record Study Session</CardTitle>
          </CardHeader>
          <CardContent>
            <StudyMetricsForm
              onSubmit={handleSubmit}
              onCancel={() => setShowForm(false)}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Study Progress</h2>
            <div className="space-x-2">
              <Button variant="outline" onClick={() => setShowFilter(!showFilter)}>
                Filter by Date
              </Button>
              <Button onClick={() => setShowForm(true)}>
                Add Study Session
              </Button>
            </div>
          </div>

          {showFilter && (
            <Card className="p-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="start-date" className="block text-sm font-medium mb-1">
                    Start Date
                  </label>
                  <input
                    id="start-date"
                    type="date"
                    className="w-full p-2 border rounded"
                    value={startDate || ''}
                    onChange={(e) => setStartDate(e.target.value || null)}
                  />
                </div>
                <div>
                  <label htmlFor="end-date" className="block text-sm font-medium mb-1">
                    End Date
                  </label>
                  <input
                    id="end-date"
                    type="date"
                    className="w-full p-2 border rounded"
                    value={endDate || ''}
                    onChange={(e) => setEndDate(e.target.value || null)}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" className="mr-2" onClick={() => setShowFilter(false)}>
                  Cancel
                </Button>
                <Button onClick={handleFilterApply}>
                  Apply Filter
                </Button>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-blue-600 font-medium">Total Hours</p>
                  <p className="text-4xl font-bold mt-2">{summary?.total_hours || 0}</p>
                  <p className="text-sm text-gray-500 mt-1">Last 7 days</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-green-600 font-medium">Average Focus</p>
                  <p className="text-4xl font-bold mt-2">{summary?.average_focus || 0}</p>
                  <p className="text-sm text-gray-500 mt-1">Out of 10</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-purple-600 font-medium">Study Streak</p>
                  <p className="text-4xl font-bold mt-2">{summary?.streak_days || 0}</p>
                  <p className="text-sm text-gray-500 mt-1">days</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Most Studied Topics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {summary?.most_studied_topics.map((topic, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Study Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              {metrics && metrics.length > 0 ? (
                <div className="space-y-4">
                  {metrics.map((metric: Metric) => (
                    <div key={metric.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">
                            {format(parseISO(metric.date), 'MMM dd, yyyy')}
                          </h4>
                          <p className="text-sm text-gray-500">{metric.topics}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{metric.study_hours} hours</p>
                          <p className="text-sm text-gray-500">Focus: {metric.focus_score}/10</p>
                        </div>
                      </div>
                      {metric.notes && (
                        <p className="text-sm mt-2 bg-gray-50 p-2 rounded">{metric.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  No study sessions recorded for the selected period.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}