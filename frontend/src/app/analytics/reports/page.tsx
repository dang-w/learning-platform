'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/cards';
import { format, subWeeks, addWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { ArrowPathIcon, ChevronLeftIcon, ArrowLeftIcon, ArrowRightIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import progressApi from '@/lib/api/progress';
import Image from 'next/image';

// Define a complete interface for WeeklyReport
interface WeeklyReport {
  total_hours: number;
  average_focus: number;
  resources_completed: number;
  concepts_reviewed: number;
  daily_hours: Record<string, number>;
  daily_focus: Record<string, number>;
  daily_topics: Record<string, string[]>;
  charts?: {
    hours_chart?: string;
    focus_chart?: string;
    topics_chart?: string;
  };
  comparison_to_previous?: {
    hours_change_percentage: number;
    focus_change_percentage: number;
  };
}

export default function ReportsPage() {
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date());

  // Calculate start and end dates for the selected week
  const startDate = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Week starts on Monday
  const endDate = endOfWeek(currentWeek, { weekStartsOn: 1 }); // Week ends on Sunday

  // Format dates for display and API calls
  const formattedStartDate = format(startDate, 'yyyy-MM-dd');
  const displayDateRange = `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;

  // Fetch weekly report
  const { data: weeklyReport, isLoading } = useQuery<WeeklyReport, Error>({
    queryKey: ['weeklyReport', formattedStartDate],
    queryFn: async () => {
      const data = await progressApi.generateWeeklyReport(formattedStartDate);
      return data as unknown as WeeklyReport;
    },
  });

  // Navigate to previous week
  const goToPreviousWeek = () => {
    setCurrentWeek(prevWeek => subWeeks(prevWeek, 1));
  };

  // Navigate to next week
  const goToNextWeek = () => {
    const nextWeek = addWeeks(currentWeek, 1);
    if (nextWeek <= new Date()) {
      setCurrentWeek(nextWeek);
    }
  };

  // Check if next week button should be disabled
  const isNextWeekDisabled = () => {
    const nextWeek = addWeeks(currentWeek, 1);
    return nextWeek > new Date();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/analytics" className="text-gray-500 hover:text-gray-700">
              <ChevronLeftIcon className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-bold">Weekly Reports</h1>
          </div>
          <p className="text-gray-500 mt-2">
            Detailed weekly learning reports with performance comparisons
          </p>
        </div>
        <div className="mt-4 md:mt-0">
          <Link
            href="/analytics/reports/generate"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <DocumentTextIcon className="w-5 h-5 mr-2" />
            Generate New Report
          </Link>
        </div>
      </div>

      {/* Week selector */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <button
              onClick={goToPreviousWeek}
              className="p-2 rounded-full hover:bg-gray-100"
              aria-label="Previous week"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div className="text-lg font-medium">{displayDateRange}</div>
            <button
              onClick={goToNextWeek}
              className={`p-2 rounded-full ${
                isNextWeekDisabled() ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-100'
              }`}
              disabled={isNextWeekDisabled()}
              aria-label="Next week"
            >
              <ArrowRightIcon className="w-5 h-5" />
            </button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <ArrowPathIcon className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : weeklyReport ? (
        <div className="space-y-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-blue-50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-blue-600 font-medium">Total Study Hours</p>
                  <p className="text-4xl font-bold mt-2">{weeklyReport.total_hours.toFixed(1)}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-green-50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-green-600 font-medium">Average Focus</p>
                  <p className="text-4xl font-bold mt-2">{weeklyReport.average_focus.toFixed(1)}/10</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-amber-50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-amber-600 font-medium">Resources Completed</p>
                  <p className="text-4xl font-bold mt-2">{weeklyReport.resources_completed || 0}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-purple-50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-purple-600 font-medium">Concepts Reviewed</p>
                  <p className="text-4xl font-bold mt-2">{weeklyReport.concepts_reviewed || 0}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Daily Study Hours</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                {weeklyReport.charts?.hours_chart ? (
                  <Image
                    src={`data:image/png;base64,${weeklyReport.charts.hours_chart}`}
                    alt="Daily study hours chart"
                    className="w-full h-full object-contain"
                    width={500}
                    height={300}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">No data available for this week</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Daily Focus Scores</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                {weeklyReport.charts?.focus_chart ? (
                  <Image
                    src={`data:image/png;base64,${weeklyReport.charts.focus_chart}`}
                    alt="Daily focus scores chart"
                    className="w-full h-full object-contain"
                    width={500}
                    height={300}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">No data available for this week</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Topic Distribution</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                {weeklyReport.charts?.topics_chart ? (
                  <Image
                    src={`data:image/png;base64,${weeklyReport.charts.topics_chart}`}
                    alt="Topic distribution chart"
                    className="w-full h-full object-contain"
                    width={800}
                    height={300}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">No data available for this week</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Comparison to Previous Week */}
          {weeklyReport.comparison_to_previous && (
            <Card>
              <CardHeader>
                <CardTitle>Comparison to Previous Week</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center">
                    <div className={`p-3 rounded-full ${
                      weeklyReport.comparison_to_previous.hours_change_percentage >= 0
                        ? 'bg-green-100 text-green-600'
                        : 'bg-red-100 text-red-600'
                    }`}>
                      <ArrowPathIcon className="w-6 h-6" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm text-gray-500">Study Hours</p>
                      <p className="text-xl font-semibold">
                        {weeklyReport.comparison_to_previous.hours_change_percentage >= 0 ? '+' : ''}
                        {weeklyReport.comparison_to_previous.hours_change_percentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className={`p-3 rounded-full ${
                      weeklyReport.comparison_to_previous.focus_change_percentage >= 0
                        ? 'bg-green-100 text-green-600'
                        : 'bg-red-100 text-red-600'
                    }`}>
                      <ArrowPathIcon className="w-6 h-6" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm text-gray-500">Focus Score</p>
                      <p className="text-xl font-semibold">
                        {weeklyReport.comparison_to_previous.focus_change_percentage >= 0 ? '+' : ''}
                        {weeklyReport.comparison_to_previous.focus_change_percentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Daily Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Day</th>
                      <th className="text-left py-3 px-4">Study Hours</th>
                      <th className="text-left py-3 px-4">Focus Score</th>
                      <th className="text-left py-3 px-4">Topics</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(weeklyReport.daily_hours).map(([day, hours]) => (
                      <tr key={day} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{format(new Date(day), 'EEEE, MMM d')}</td>
                        <td className="py-3 px-4">{hours.toFixed(1)}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <span>{weeklyReport?.daily_focus[day]?.toFixed(1) || 0}</span>
                            <div className="ml-2 w-24 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${((weeklyReport?.daily_focus[day] || 0) / 10) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {(weeklyReport?.daily_topics && weeklyReport.daily_topics[day]) ? (
                              weeklyReport.daily_topics[day].slice(0, 3).map((topic: string, index: number) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                >
                                  {topic}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-400">No topics recorded</span>
                            )}
                            {(weeklyReport?.daily_topics &&
                              weeklyReport.daily_topics[day] &&
                              weeklyReport.daily_topics[day].length > 3) && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                +{weeklyReport.daily_topics[day].length - 3} more
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <DocumentTextIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold mb-2">No report available for this week</h2>
          <p className="text-gray-500 mb-6">
            There is no data available to generate a report for the selected week.
          </p>
          <Link
            href="/analytics/reports/generate"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Generate New Report
          </Link>
        </div>
      )}
    </div>
  );
}