'use client';

import { useState, useEffect } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { format, subDays, parseISO } from 'date-fns';

// Types for our chart data
interface ReviewData {
  date: string;
  totalReviews: number;
  correctReviews: number;
  incorrectReviews: number;
}

interface ReviewAccuracyData {
  name: string;
  value: number;
  color: string;
}

interface ReviewHistoryChartProps {
  userId: string;
  timeRange: 'week' | 'month' | 'year';
  className?: string;
}

// Custom tooltip prop types
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: ReviewData | ReviewAccuracyData;
  }>;
  label?: string;
}

// Mock review data - in a real app, this would come from an API
const generateMockData = (days: number): ReviewData[] => {
  const data: ReviewData[] = [];

  for (let i = days; i >= 0; i--) {
    const date = subDays(new Date(), i);
    const formattedDate = format(date, 'yyyy-MM-dd');

    // Generate some random but realistic looking data
    const totalReviews = Math.floor(Math.random() * 50) + 10;
    const correctReviews = Math.floor(Math.random() * (totalReviews - 5)) + 5;
    const incorrectReviews = totalReviews - correctReviews;

    data.push({
      date: formattedDate,
      totalReviews,
      correctReviews,
      incorrectReviews
    });
  }

  return data;
};

export const ReviewHistoryChart = ({ userId, timeRange, className = '' }: ReviewHistoryChartProps) => {
  const [activeChart, setActiveChart] = useState<'activity' | 'accuracy'>('activity');
  const [activityData, setActivityData] = useState<ReviewData[]>([]);
  const [accuracyData, setAccuracyData] = useState<ReviewAccuracyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API call delay
    setIsLoading(true);

    // Set days based on timeRange
    let days = 7;
    if (timeRange === 'month') days = 30;
    if (timeRange === 'year') days = 365;

    // Generate mock data - in a real app, this would be fetched from an API
    setTimeout(() => {
      const reviewData = generateMockData(days);
      setActivityData(reviewData);

      // Calculate accuracy data for pie chart
      const totalCorrect = reviewData.reduce((sum, day) => sum + day.correctReviews, 0);
      const totalIncorrect = reviewData.reduce((sum, day) => sum + day.incorrectReviews, 0);

      setAccuracyData([
        { name: 'Correct', value: totalCorrect, color: '#10B981' },
        { name: 'Incorrect', value: totalIncorrect, color: '#EF4444' }
      ]);

      setIsLoading(false);
    }, 500);
  }, [timeRange, userId]);

  // Format the date for display in the chart
  const formatXAxis = (tickItem: string) => {
    return format(parseISO(tickItem), 'MMM dd');
  };

  // Custom tooltip for the activity chart
  const ActivityTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ReviewData;
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-md rounded">
          <p className="font-medium">{format(parseISO(data.date), 'MMMM dd, yyyy')}</p>
          <p className="text-emerald-600">Correct: {data.correctReviews}</p>
          <p className="text-red-600">Incorrect: {data.incorrectReviews}</p>
          <p className="font-medium">Total: {data.totalReviews}</p>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for the accuracy chart
  const AccuracyTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ReviewAccuracyData;
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-md rounded">
          <p className="font-medium">{data.name}</p>
          <p>Count: {data.value}</p>
          <p>Percentage: {((data.value / (accuracyData[0].value + accuracyData[1].value)) * 100).toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`} data-testid="review-history-chart">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Review History</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveChart('activity')}
            className={`px-3 py-1 text-sm rounded-md ${
              activeChart === 'activity'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Activity
          </button>
          <button
            onClick={() => setActiveChart('accuracy')}
            className={`px-3 py-1 text-sm rounded-md ${
              activeChart === 'accuracy'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Accuracy
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="h-80 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {activeChart === 'activity' ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart
                data={activityData}
                margin={{ top: 10, right: 10, left: 5, bottom: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatXAxis}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis name="Reviews" />
                <Tooltip content={<ActivityTooltip />} />
                <Legend verticalAlign="top" height={36} />
                <Bar
                  name="Correct Reviews"
                  dataKey="correctReviews"
                  stackId="a"
                  fill="#10B981"
                />
                <Bar
                  name="Incorrect Reviews"
                  dataKey="incorrectReviews"
                  stackId="a"
                  fill="#EF4444"
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={accuracyData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                  >
                    {accuracyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<AccuracyTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center space-x-8 mt-4">
                {accuracyData.map((entry, index) => (
                  <div key={index} className="flex items-center">
                    <div
                      className="w-4 h-4 mr-2 rounded-sm"
                      style={{ backgroundColor: entry.color }}
                    ></div>
                    <span>
                      {entry.name}: {entry.value} (
                      {((entry.value / (accuracyData[0].value + accuracyData[1].value)) * 100).toFixed(1)}
                      %)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-gray-500 mt-6">
            <p className="italic">
              Note: This chart shows your spaced repetition review history over the selected time period.
              {activeChart === 'activity'
                ? ' The height of each bar represents the total number of reviews completed on that day.'
                : ' The pie chart shows your overall accuracy across all reviews in this period.'}
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default ReviewHistoryChart;