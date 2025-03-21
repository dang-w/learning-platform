'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { PlusIcon } from '@heroicons/react/24/solid';
import { Progress } from '@/components/ui/feedback/progress';
import { Spinner } from '@/components/ui/feedback/spinner';
import { Alert } from '@/components/ui/feedback/alert';
import { Input } from '@/components/ui/forms/input';
import { Label } from '@/components/ui/forms/label';
import { Textarea } from '@/components/ui/forms/textarea';
import { StudyMetricFormData } from '@/types/progress';
import progressApi, { Metric } from '@/lib/api/progress';

// Types to match the backend response structure
interface MetricsApiResponse {
  total_hours: number;
  avg_focus: number;
  study_days: number;
  consistency: number;
  top_topics: Array<{topic: string; count: number}>;
}

// CHART COLORS
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

// HELPER FUNCTIONS
const formatStudyHours = (hours: number) => {
  return `${Math.floor(hours)}h ${Math.round((hours % 1) * 60)}m`;
};

// FORM COMPONENT FOR ADDING NEW METRICS
const MetricForm = ({ onClose, onSubmit }: { onClose: () => void, onSubmit: (data: StudyMetricFormData) => void }) => {
  const [formData, setFormData] = useState<StudyMetricFormData>({
    date: format(new Date(), 'yyyy-MM-dd'),
    study_hours: 1,
    topics: [],
    focus_score: 7,
    notes: '',
  });

  const [topicInput, setTopicInput] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: name === 'study_hours' ? parseFloat(value) : value }));
  };

  const handleTopicAdd = () => {
    if (topicInput.trim()) {
      setFormData((prev) => ({
        ...prev,
        topics: [...prev.topics, topicInput.trim()]
      }));
      setTopicInput('');
    }
  };

  const handleTopicRemove = (topic: string) => {
    setFormData((prev) => ({
      ...prev,
      topics: prev.topics.filter(t => t !== topic)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="date">Date</Label>
        <Input
          type="date"
          id="date"
          name="date"
          value={formData.date}
          onChange={handleChange}
          required
        />
      </div>

      <div>
        <Label htmlFor="study_hours">Study Hours</Label>
        <Input
          type="number"
          id="study_hours"
          name="study_hours"
          min="0.25"
          step="0.25"
          value={formData.study_hours}
          onChange={handleChange}
          required
        />
      </div>

      <div>
        <Label htmlFor="topics">Topics</Label>
        <div className="flex gap-2">
          <Input
            type="text"
            id="topic_input"
            value={topicInput}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTopicInput(e.target.value)}
            placeholder="Add a topic"
          />
          <button
            type="button"
            onClick={handleTopicAdd}
            className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
          >
            Add
          </button>
        </div>

        {formData.topics.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.topics.map((topic, index) => (
              <div key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md flex items-center">
                <span>{topic}</span>
                <button
                  type="button"
                  onClick={() => handleTopicRemove(topic)}
                  className="ml-2 text-blue-800 hover:text-blue-600"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="focus_score">Focus Score (1-10)</Label>
        <Input
          type="range"
          id="focus_score"
          name="focus_score"
          min="1"
          max="10"
          value={formData.focus_score}
          onChange={handleChange}
          className="w-full"
          required
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>1</span>
          <span>5</span>
          <span>10</span>
        </div>
        <div className="text-center mt-1">
          Current: {formData.focus_score}
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Add any notes about your study session..."
        />
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Save Metric
        </button>
      </div>
    </form>
  );
};

export default function ProgressPage() {
  const queryClient = useQueryClient();
  const [isAddingMetric, setIsAddingMetric] = useState(false);
  const [timeRange, setTimeRange] = useState<'7days' | '30days' | '90days'>('7days');

  // FETCH LEARNING PROGRESS
  const {
    data: progressData,
    isLoading: isLoadingProgress,
    error: progressError
  } = useQuery({
    queryKey: ['learningProgress'],
    queryFn: progressApi.fetchLearningProgress,
  });

  // FETCH METRICS
  const {
    data: metrics,
    isLoading: isLoadingMetrics,
    error: metricsError
  } = useQuery({
    queryKey: ['metrics'],
    queryFn: progressApi.getAllMetrics,
  });

  // FETCH METRICS SUMMARY
  const daysToFetch = timeRange === '7days' ? 7 : timeRange === '30days' ? 30 : 90;
  const {
    data: metricsSummary,
    isLoading: isLoadingSummary,
    error: summaryError
  } = useQuery({
    queryKey: ['metricsSummary', daysToFetch],
    queryFn: () => progressApi.getRecentMetricsSummary(daysToFetch),
  });

  // ADD METRIC MUTATION
  const addMetricMutation = useMutation({
    mutationFn: (data: StudyMetricFormData) => {
      const metricData = {
        date: data.date,
        study_hours: data.study_hours,
        topics: data.topics.join(', '),
        focus_score: data.focus_score,
        notes: data.notes
      };
      return progressApi.addMetric(metricData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      queryClient.invalidateQueries({ queryKey: ['metricsSummary'] });
      setIsAddingMetric(false);
    },
  });

  // HANDLE METRIC SUBMISSION
  const handleMetricSubmit = (data: StudyMetricFormData) => {
    addMetricMutation.mutate(data);
  };

  // PREPARE CHART DATA
  const prepareStudyHoursData = (metrics: Metric[]) => {
    if (!metrics || metrics.length === 0) return [];

    const sortedMetrics = [...metrics].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return sortedMetrics.map(m => ({
      date: format(parseISO(m.date), 'MMM dd'),
      hours: m.study_hours
    }));
  };

  const prepareFocusScoreData = (metrics: Metric[]) => {
    if (!metrics || metrics.length === 0) return [];

    const sortedMetrics = [...metrics].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return sortedMetrics.map(m => ({
      date: format(parseISO(m.date), 'MMM dd'),
      score: m.focus_score
    }));
  };

  const prepareTopicDistribution = (metrics: Metric[]) => {
    if (!metrics || metrics.length === 0) return [];

    const topicCount: Record<string, number> = {};

    metrics.forEach(m => {
      const topics = m.topics.split(',').map(t => t.trim());
      topics.forEach(topic => {
        if (topic) {
          topicCount[topic] = (topicCount[topic] || 0) + 1;
        }
      });
    });

    return Object.entries(topicCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  };

  // LOADING STATES
  const isLoading = isLoadingProgress || isLoadingMetrics || isLoadingSummary;
  const error = progressError || metricsError || summaryError;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <Alert variant="error">
          Error loading progress data. Please try again later.
        </Alert>
      </div>
    );
  }

  // PROCESS DATA
  const studyHoursData = prepareStudyHoursData(metrics || []);
  const focusScoreData = prepareFocusScoreData(metrics || []);
  const topicDistributionData = prepareTopicDistribution(metrics || []);

  // SUMMARY CALCULATIONS
  const apiMetrics = metricsSummary as unknown as MetricsApiResponse;
  const totalHours = apiMetrics?.total_hours || 0;
  const avgFocus = Number(apiMetrics?.avg_focus || 0);
  const studyDays = Number(apiMetrics?.study_days || 0);
  const consistency = Number(apiMetrics?.consistency || 0);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Progress Tracking</h1>
        <button
          onClick={() => setIsAddingMetric(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Study Session
        </button>
      </div>

      {/* TIME RANGE SELECTOR */}
      <div className="mb-6">
        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium ${timeRange === '7days' ? 'bg-white shadow' : 'text-gray-500'}`}
            onClick={() => setTimeRange('7days')}
          >
            7 Days
          </button>
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium ${timeRange === '30days' ? 'bg-white shadow' : 'text-gray-500'}`}
            onClick={() => setTimeRange('30days')}
          >
            30 Days
          </button>
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium ${timeRange === '90days' ? 'bg-white shadow' : 'text-gray-500'}`}
            onClick={() => setTimeRange('90days')}
          >
            90 Days
          </button>
        </div>
      </div>

      {/* DASHBOARD CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* TOTAL HOURS */}
        <div className="bg-white p-5 rounded-md shadow-sm">
          <h3 className="text-lg font-semibold mb-2">Total Study Hours</h3>
          <div className="text-3xl font-bold">
            {formatStudyHours(totalHours)}
          </div>
        </div>

        {/* AVERAGE FOCUS */}
        <div className="bg-white p-5 rounded-md shadow-sm">
          <h3 className="text-lg font-semibold mb-2">Average Focus</h3>
          <div className="text-3xl font-bold">
            {avgFocus.toFixed(1)}/10
          </div>
          <div className="mt-2">
            <Progress value={avgFocus * 10} />
          </div>
        </div>

        {/* STUDY DAYS */}
        <div className="bg-white p-5 rounded-md shadow-sm">
          <h3 className="text-lg font-semibold mb-2">Study Days</h3>
          <div className="text-3xl font-bold">
            {studyDays} days
          </div>
          <div className="text-sm text-gray-500 mt-1">
            Out of {daysToFetch} days
          </div>
        </div>

        {/* CONSISTENCY */}
        <div className="bg-white p-5 rounded-md shadow-sm">
          <h3 className="text-lg font-semibold mb-2">Consistency</h3>
          <div className="text-3xl font-bold">
            {Math.round(consistency)}%
          </div>
          <div className="mt-2">
            <Progress value={consistency} />
          </div>
        </div>
      </div>

      {/* LEARNING COMPLETION STATUS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-md shadow-sm">
          <div className="p-5 border-b">
            <h3 className="text-lg font-semibold">Learning Resources Progress</h3>
            <p className="text-sm text-gray-500">
              Overall completion status across all resources
            </p>
          </div>
          <div className="p-5">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-medium">Completion</div>
                  <div className="text-sm text-gray-500">
                    {progressData?.completion_percentage || 0}%
                  </div>
                </div>
                <Progress value={progressData?.completion_percentage || 0} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="text-center">
                <div className="text-xl font-bold text-green-600">
                  {progressData?.completed || 0}
                </div>
                <div className="text-sm text-gray-500">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-blue-600">
                  {progressData?.in_progress || 0}
                </div>
                <div className="text-sm text-gray-500">In Progress</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-gray-600">
                  {progressData?.not_started || 0}
                </div>
                <div className="text-sm text-gray-500">Not Started</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-md shadow-sm">
          <div className="p-5 border-b">
            <h3 className="text-lg font-semibold">Recent Activity</h3>
            <p className="text-sm text-gray-500">
              Your latest learning activities
            </p>
          </div>
          <div className="p-5">
            {progressData?.recent_activity && progressData.recent_activity.length > 0 ? (
              <div className="space-y-4">
                {progressData.recent_activity.slice(0, 4).map((activity) => (
                  <div key={activity.id} className="flex items-start">
                    <div className={`w-2 h-2 mt-2 rounded-full mr-3 ${
                      activity.type === 'completion' ? 'bg-green-500' :
                      activity.type === 'start' ? 'bg-blue-500' : 'bg-purple-500'
                    }`} />
                    <div>
                      <div className="text-sm font-medium">
                        {activity.type === 'completion' ? 'Completed' :
                         activity.type === 'start' ? 'Started' : 'Reviewed'}
                        {' '}
                        <span className="font-bold">{activity.resource_title}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {format(parseISO(activity.timestamp), 'MMM dd, yyyy')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 italic py-4 text-center">
                No recent activity found
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* STUDY HOURS CHART */}
        <div className="bg-white rounded-md shadow-sm">
          <div className="p-5 border-b">
            <h3 className="text-lg font-semibold">Study Hours Trend</h3>
            <p className="text-sm text-gray-500">Your study hours over time</p>
          </div>
          <div className="p-5">
            <div className="h-80">
              {studyHoursData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={studyHoursData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="hours"
                      stroke="#8884d8"
                      activeDot={{ r: 8 }}
                      name="Study Hours"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No study data available
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FOCUS SCORE CHART */}
        <div className="bg-white rounded-md shadow-sm">
          <div className="p-5 border-b">
            <h3 className="text-lg font-semibold">Focus Score Trend</h3>
            <p className="text-sm text-gray-500">Your focus level over time</p>
          </div>
          <div className="p-5">
            <div className="h-80">
              {focusScoreData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={focusScoreData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 10]} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#82ca9d"
                      activeDot={{ r: 8 }}
                      name="Focus Score"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No focus data available
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* TOPIC DISTRIBUTION */}
      <div className="grid grid-cols-1 mb-8">
        <div className="bg-white rounded-md shadow-sm">
          <div className="p-5 border-b">
            <h3 className="text-lg font-semibold">Topic Distribution</h3>
            <p className="text-sm text-gray-500">Most studied topics</p>
          </div>
          <div className="p-5">
            <div className="h-80">
              {topicDistributionData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={topicDistributionData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }: {name: string, percent: number}) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {topicDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No topic data available
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* RECENT METRICS */}
      <div className="mb-8">
        <div className="bg-white rounded-md shadow-sm">
          <div className="p-5 border-b">
            <h3 className="text-lg font-semibold">Recent Study Sessions</h3>
            <p className="text-sm text-gray-500">Your last 5 recorded study sessions</p>
          </div>
          <div className="p-5">
            {metrics && metrics.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Date</th>
                      <th className="text-left py-3 px-4">Hours</th>
                      <th className="text-left py-3 px-4">Topics</th>
                      <th className="text-left py-3 px-4">Focus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...metrics]
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .slice(0, 5)
                      .map((metric) => (
                        <tr key={metric.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">{format(parseISO(metric.date), 'MMM dd, yyyy')}</td>
                          <td className="py-3 px-4">{formatStudyHours(metric.study_hours)}</td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1">
                              {metric.topics.split(',').map((topic: string, index: number) => (
                                topic.trim() && (
                                  <span
                                    key={index}
                                    className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                                  >
                                    {topic.trim()}
                                  </span>
                                )
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              <span className="mr-2">{metric.focus_score}/10</span>
                              <div className="w-24">
                                <Progress value={metric.focus_score * 10} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                No study sessions recorded yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ADD METRIC DIALOG */}
      {isAddingMetric && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-md max-w-lg w-full mx-4 overflow-y-auto max-h-[90vh]">
            <div className="p-5 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Add Study Session</h2>
                <button
                  onClick={() => setIsAddingMetric(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  ×
                </button>
              </div>
              <p className="text-sm text-gray-500">
                Record your study session details to track your progress.
              </p>
            </div>
            <div className="p-5">
              <MetricForm
                onClose={() => setIsAddingMetric(false)}
                onSubmit={handleMetricSubmit}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}