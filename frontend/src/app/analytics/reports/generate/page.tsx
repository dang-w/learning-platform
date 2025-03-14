'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/cards';
import { format, subWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { ChevronLeftIcon, DocumentTextIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import progressApi, { WeeklyReport } from '@/lib/api/progress';

export default function GenerateReportPage() {
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [isGenerating, setIsGenerating] = useState(false);

  // Calculate week range for display
  const selectedDateObj = new Date(selectedDate);
  const weekStart = format(startOfWeek(selectedDateObj, { weekStartsOn: 1 }), 'MMM dd, yyyy');
  const weekEnd = format(endOfWeek(selectedDateObj, { weekStartsOn: 1 }), 'MMM dd, yyyy');

  // Fetch report if it exists
  const { data: report, isLoading, refetch } = useQuery<WeeklyReport>({
    queryKey: ['weeklyReport', selectedDate],
    queryFn: () => progressApi.generateWeeklyReport(selectedDate),
    enabled: false, // Don't fetch automatically
  });

  // Generate report
  const handleGenerateReport = async () => {
    setIsGenerating(true);
    await refetch();
    setIsGenerating(false);
  };

  // Previous week
  const handlePreviousWeek = () => {
    const prevWeek = subWeeks(selectedDateObj, 1);
    setSelectedDate(format(prevWeek, 'yyyy-MM-dd'));
  };

  // Next week (but not future weeks)
  const handleNextWeek = () => {
    const nextWeek = subWeeks(selectedDateObj, -1);
    if (nextWeek <= new Date()) {
      setSelectedDate(format(nextWeek, 'yyyy-MM-dd'));
    }
  };

  // Check if next week button should be disabled
  const isNextWeekDisabled = () => {
    const nextWeek = subWeeks(selectedDateObj, -1);
    return nextWeek > new Date();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/analytics/reports" className="text-blue-600 hover:text-blue-800">
              <ChevronLeftIcon className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-bold">Generate Weekly Report</h1>
          </div>
          <p className="text-gray-500 mt-2">
            Create detailed reports of your learning progress
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Select Week</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select any date in the week
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    max={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>

                <div className="flex justify-between items-center">
                  <button
                    onClick={handlePreviousWeek}
                    className="px-3 py-2 border rounded-md hover:bg-gray-50"
                  >
                    Previous Week
                  </button>

                  <button
                    onClick={handleNextWeek}
                    className={`px-3 py-2 border rounded-md ${
                      isNextWeekDisabled()
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-gray-50'
                    }`}
                    disabled={isNextWeekDisabled()}
                  >
                    Next Week
                  </button>
                </div>

                <div className="text-center py-3 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-500">Selected Week</p>
                  <p className="font-medium">
                    {weekStart} - {weekEnd}
                  </p>
                </div>

                <button
                  onClick={handleGenerateReport}
                  disabled={isGenerating}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <span className="flex items-center justify-center">
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                      Generating...
                    </span>
                  ) : (
                    'Generate Report'
                  )}
                </button>
              </div>
            </CardContent>
          </Card>

          {report && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Report Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <button
                    className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
                    Download PDF
                  </button>

                  <button
                    className="w-full flex items-center justify-center px-4 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50"
                  >
                    <DocumentTextIcon className="w-5 h-5 mr-2" />
                    View Full Report
                  </button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
            </div>
          ) : !report ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <DocumentTextIcon className="w-12 h-12 mx-auto text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No report generated yet</h3>
              <p className="mt-2 text-gray-500">
                Select a week and click &quot;Generate Report&quot; to create a detailed learning report.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Weekly Report: {weekStart} - {weekEnd}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-blue-700">Total Study Hours</p>
                      <p className="text-2xl font-bold text-blue-900">{report.total_hours}</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <p className="text-sm text-purple-700">Average Focus</p>
                      <p className="text-2xl font-bold text-purple-900">{report.average_focus.toFixed(1)}/10</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Hours by Day</h4>
                      <div className="h-12 bg-gray-100 rounded-md overflow-hidden flex">
                        {Object.entries(report.daily_hours).map(([day, hours]) => {
                          const maxHours = Math.max(...Object.values(report.daily_hours));
                          const percentage = maxHours > 0 ? (hours / maxHours) * 100 : 0;

                          return (
                            <div
                              key={day}
                              className="h-full bg-blue-500 relative group"
                              style={{ width: `${100 / 7}%`, opacity: percentage / 100 }}
                            >
                              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-20 text-white text-xs text-center opacity-0 group-hover:opacity-100 transition-opacity">
                                {hours.toFixed(1)}h
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Focus by Day</h4>
                      <div className="h-12 bg-gray-100 rounded-md overflow-hidden flex">
                        {Object.entries(report.daily_focus).map(([day, focus]) => {
                          const percentage = (focus / 10) * 100;

                          return (
                            <div
                              key={day}
                              className="h-full bg-purple-500 relative group"
                              style={{ width: `${100 / 7}%`, opacity: percentage / 100 }}
                            >
                              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-20 text-white text-xs text-center opacity-0 group-hover:opacity-100 transition-opacity">
                                {focus.toFixed(1)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Topic Distribution</h4>
                    <div className="space-y-2">
                      {Object.entries(report.topic_distribution)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([topic, hours]) => {
                          const percentage = (hours / report.total_hours) * 100;

                          return (
                            <div key={topic}>
                              <div className="flex justify-between text-xs mb-1">
                                <span>{topic}</span>
                                <span>{hours.toFixed(1)}h ({percentage.toFixed(0)}%)</span>
                              </div>
                              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-600"
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Comparison to Previous Week</h4>
                    <div className="flex space-x-4">
                      <div className={`flex items-center ${
                        report.comparison_to_previous.hours_change_percentage >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        <span className="text-lg font-bold">
                          {report.comparison_to_previous.hours_change_percentage >= 0 ? '+' : ''}
                          {report.comparison_to_previous.hours_change_percentage.toFixed(0)}%
                        </span>
                        <span className="ml-1 text-sm">hours</span>
                      </div>

                      <div className={`flex items-center ${
                        report.comparison_to_previous.focus_change_percentage >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        <span className="text-lg font-bold">
                          {report.comparison_to_previous.focus_change_percentage >= 0 ? '+' : ''}
                          {report.comparison_to_previous.focus_change_percentage.toFixed(0)}%
                        </span>
                        <span className="ml-1 text-sm">focus</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {report.charts && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Hours Chart</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <img
                        src={report.charts.hours_chart}
                        alt="Study hours chart"
                        className="w-full h-auto"
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Focus Chart</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <img
                        src={report.charts.focus_chart}
                        alt="Focus score chart"
                        className="w-full h-auto"
                      />
                    </CardContent>
                  </Card>

                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle>Topics Chart</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <img
                        src={report.charts.topics_chart}
                        alt="Topics distribution chart"
                        className="w-full h-auto"
                      />
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}