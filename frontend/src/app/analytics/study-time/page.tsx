'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/cards';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Tooltip,
  Legend,
  Filler,
  ChartData,
  ChartOptions,
} from 'chart.js';
import { Line, Bar, Radar, Doughnut } from 'react-chartjs-2';
import progressApi from '@/lib/api/progress';
import { format, subDays, parseISO, getDay } from 'date-fns';
import { CalendarIcon, ArrowPathIcon, ChevronLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Tooltip,
  Legend,
  Filler
);

// Date range options
type DateRange = '7days' | '30days' | '90days' | 'custom';

export default function StudyTimeAnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>('30days');
  const [startDate, setStartDate] = useState<string>(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  // Update date range when selection changes
  useEffect(() => {
    const today = new Date();

    switch (dateRange) {
      case '7days':
        setStartDate(format(subDays(today, 7), 'yyyy-MM-dd'));
        setEndDate(format(today, 'yyyy-MM-dd'));
        break;
      case '30days':
        setStartDate(format(subDays(today, 30), 'yyyy-MM-dd'));
        setEndDate(format(today, 'yyyy-MM-dd'));
        break;
      case '90days':
        setStartDate(format(subDays(today, 90), 'yyyy-MM-dd'));
        setEndDate(format(today, 'yyyy-MM-dd'));
        break;
      // For custom range, don't update dates automatically
    }
  }, [dateRange]);

  // Fetch metrics for the selected date range
  const { data: metrics = [], isLoading } = useQuery({
    queryKey: ['metrics', startDate, endDate],
    queryFn: () => progressApi.getMetrics(startDate, endDate),
  });

  // Process data for charts
  const studyHoursData: ChartData<'line'> = {
    labels: metrics.map(metric => format(parseISO(metric.date), 'MMM dd')),
    datasets: [
      {
        label: 'Study Hours',
        data: metrics.map(metric => metric.study_hours),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const focusScoreData: ChartData<'line'> = {
    labels: metrics.map(metric => format(parseISO(metric.date), 'MMM dd')),
    datasets: [
      {
        label: 'Focus Score',
        data: metrics.map(metric => metric.focus_score),
        borderColor: 'rgb(139, 92, 246)',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        tension: 0.3,
        fill: true,
      },
    ],
  };

  // Process topic distribution data
  const topicData = metrics.reduce((acc: Record<string, number>, metric) => {
    const topics = metric.topics.split(',').map(t => t.trim());
    topics.forEach(topic => {
      if (topic) {
        acc[topic] = (acc[topic] || 0) + metric.study_hours;
      }
    });
    return acc;
  }, {});

  // Sort topics by hours spent (descending)
  const sortedTopics = Object.entries(topicData)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8); // Limit to top 8 topics

  const topicChartData: ChartData<'bar'> = {
    labels: sortedTopics.map(([topic]) => topic),
    datasets: [
      {
        label: 'Hours Spent',
        data: sortedTopics.map(([, hours]) => hours),
        backgroundColor: [
          'rgba(59, 130, 246, 0.7)',
          'rgba(139, 92, 246, 0.7)',
          'rgba(16, 185, 129, 0.7)',
          'rgba(245, 158, 11, 0.7)',
          'rgba(239, 68, 68, 0.7)',
          'rgba(236, 72, 153, 0.7)',
          'rgba(79, 70, 229, 0.7)',
          'rgba(14, 165, 233, 0.7)',
        ],
      },
    ],
  };

  // Weekly pattern data
  const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const weekdayHours = Array(7).fill(0);
  const weekdayFocus = Array(7).fill(0);
  const weekdayCounts = Array(7).fill(0);

  metrics.forEach(metric => {
    const date = parseISO(metric.date);
    const dayOfWeek = getDay(date);
    weekdayHours[dayOfWeek] += metric.study_hours;
    weekdayFocus[dayOfWeek] += metric.focus_score;
    weekdayCounts[dayOfWeek]++;
  });

  // Calculate averages
  const avgWeekdayHours = weekdayHours.map((hours, index) =>
    weekdayCounts[index] ? hours / weekdayCounts[index] : 0
  );

  const avgWeekdayFocus = weekdayFocus.map((focus, index) =>
    weekdayCounts[index] ? focus / weekdayCounts[index] : 0
  );

  const weeklyPatternData: ChartData<'radar'> = {
    labels: weekdayNames,
    datasets: [
      {
        label: 'Avg. Study Hours',
        data: avgWeekdayHours,
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: 'rgb(59, 130, 246)',
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgb(59, 130, 246)',
      },
      {
        label: 'Avg. Focus Score',
        data: avgWeekdayFocus,
        backgroundColor: 'rgba(139, 92, 246, 0.2)',
        borderColor: 'rgb(139, 92, 246)',
        pointBackgroundColor: 'rgb(139, 92, 246)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgb(139, 92, 246)',
      },
    ],
  };

  // Time distribution by hour of day
  const hourlyDistribution = Array(24).fill(0);

  metrics.forEach(metric => {
    // Assuming we have hour data in the metrics
    // This is a placeholder - in a real app, you'd have more detailed time tracking
    const hour = 9; // Example: 9 AM
    hourlyDistribution[hour] += metric.study_hours;
  });

  const timeDistributionData: ChartData<'doughnut'> = {
    labels: ['Morning (6-12)', 'Afternoon (12-18)', 'Evening (18-24)', 'Night (0-6)'],
    datasets: [
      {
        data: [
          hourlyDistribution.slice(6, 12).reduce((sum, val) => sum + val, 0),
          hourlyDistribution.slice(12, 18).reduce((sum, val) => sum + val, 0),
          hourlyDistribution.slice(18, 24).reduce((sum, val) => sum + val, 0),
          hourlyDistribution.slice(0, 6).reduce((sum, val) => sum + val, 0),
        ],
        backgroundColor: [
          'rgba(245, 158, 11, 0.7)', // amber
          'rgba(59, 130, 246, 0.7)', // blue
          'rgba(139, 92, 246, 0.7)', // purple
          'rgba(17, 24, 39, 0.7)', // gray-900
        ],
        borderColor: [
          'rgb(245, 158, 11)',
          'rgb(59, 130, 246)',
          'rgb(139, 92, 246)',
          'rgb(17, 24, 39)',
        ],
      },
    ],
  };

  // Chart options
  const lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Hours',
        },
      },
    },
  };

  const radarChartOptions: ChartOptions<'radar'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        angleLines: {
          display: true,
        },
        suggestedMin: 0,
      },
    },
  };

  const doughnutChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
      },
    },
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/analytics" className="text-blue-600 hover:text-blue-800">
              <ChevronLeftIcon className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-bold">Study Time Analytics</h1>
          </div>
          <p className="text-gray-500 mt-2">
            Analyze your study patterns, focus scores, and time distribution
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
              <option value="custom">Custom Range</option>
            </select>

            {dateRange === 'custom' && (
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 border rounded-md text-sm"
                />
                <span>to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 border rounded-md text-sm"
                />
              </div>
            )}
          </div>

          <button
            onClick={() => {
              // Refresh data
              // This will trigger a refetch due to the query key change
              setStartDate(startDate);
              setEndDate(endDate);
            }}
            className="p-2 rounded-md bg-gray-100 hover:bg-gray-200"
            title="Refresh data"
          >
            <ArrowPathIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
        </div>
      ) : metrics.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <CalendarIcon className="w-12 h-12 mx-auto text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No study data available</h3>
          <p className="mt-2 text-gray-500">
            No study metrics found for the selected date range.
          </p>
          <Link
            href="/progress/metrics/add"
            className="mt-6 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Add Study Metrics
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-500">Total Study Hours</p>
                  <p className="text-3xl font-bold text-blue-600 mt-1">
                    {metrics.reduce((sum, metric) => sum + metric.study_hours, 0).toFixed(1)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-500">Average Daily Hours</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">
                    {(metrics.reduce((sum, metric) => sum + metric.study_hours, 0) / metrics.length).toFixed(1)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-500">Average Focus Score</p>
                  <p className="text-3xl font-bold text-purple-600 mt-1">
                    {(metrics.reduce((sum, metric) => sum + metric.focus_score, 0) / metrics.length).toFixed(1)}/10
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-500">Study Days</p>
                  <p className="text-3xl font-bold text-amber-600 mt-1">
                    {metrics.length}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Study Hours Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <Line data={studyHoursData} options={lineChartOptions} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Focus Score Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <Line data={focusScoreData} options={lineChartOptions} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Topic Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Topic Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <Bar data={topicChartData} options={barChartOptions} />
              </div>
            </CardContent>
          </Card>

          {/* Weekly Pattern and Time Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Pattern</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <Radar data={weeklyPatternData} options={radarChartOptions} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Time of Day Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <Doughnut data={timeDistributionData} options={doughnutChartOptions} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Metrics Table */}
          <Card>
            <CardHeader>
              <CardTitle>Study Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                    <tr>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Hours</th>
                      <th className="px-6 py-3">Focus</th>
                      <th className="px-6 py-3">Topics</th>
                      <th className="px-6 py-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.map((metric) => (
                      <tr
                        key={metric.id}
                        className="bg-white border-b hover:bg-gray-50 cursor-pointer"
                      >
                        <td className="px-6 py-4">{format(parseISO(metric.date), 'MMM dd, yyyy')}</td>
                        <td className="px-6 py-4">{metric.study_hours}</td>
                        <td className="px-6 py-4">{metric.focus_score}/10</td>
                        <td className="px-6 py-4">{metric.topics}</td>
                        <td className="px-6 py-4 truncate max-w-xs">{metric.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}