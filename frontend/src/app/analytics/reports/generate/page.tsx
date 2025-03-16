'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/cards';
import { format, startOfWeek, endOfWeek, isAfter, addDays } from 'date-fns';
import { ArrowPathIcon, ChevronLeftIcon, DocumentTextIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import progressApi from '@/lib/api/progress';

export default function GenerateReportPage() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationSuccess, setGenerationSuccess] = useState(false);

  // Calculate start and end dates for the selected week
  const startDate = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Week starts on Monday
  const endDate = endOfWeek(selectedDate, { weekStartsOn: 1 }); // Week ends on Sunday

  // Format dates for display and API calls
  const formattedStartDate = format(startDate, 'yyyy-MM-dd');
  const formattedEndDate = format(endDate, 'yyyy-MM-dd');
  const displayDateRange = `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;

  // Fetch metrics for the selected week to check if data exists
  const { data: weekMetrics = [], isLoading } = useQuery({
    queryKey: ['weekMetrics', formattedStartDate, formattedEndDate],
    queryFn: () => progressApi.getMetrics(formattedStartDate, formattedEndDate),
  });

  // Check if the selected week is in the future
  const isFutureWeek = isAfter(startDate, new Date());

  // Check if the selected week has data
  const hasData = weekMetrics.length > 0;

  // Calculate total study hours for the week
  const totalHours = weekMetrics.reduce((sum, metric) => sum + metric.study_hours, 0);

  // Calculate average focus score for the week
  const averageFocus = weekMetrics.length > 0
    ? weekMetrics.reduce((sum, metric) => sum + metric.focus_score, 0) / weekMetrics.length
    : 0;

  // Generate daily data for preview
  const dailyData = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(startDate, i);
    const dayFormatted = format(day, 'yyyy-MM-dd');
    const dayMetrics = weekMetrics.filter(metric => metric.date === dayFormatted);

    return {
      date: day,
      hours: dayMetrics.reduce((sum, metric) => sum + metric.study_hours, 0),
      focus: dayMetrics.length > 0
        ? dayMetrics.reduce((sum, metric) => sum + metric.focus_score, 0) / dayMetrics.length
        : 0,
      hasData: dayMetrics.length > 0,
    };
  });

  // Mutation for generating report
  const generateReportMutation = useMutation({
    mutationFn: () => progressApi.generateWeeklyReport(formattedStartDate),
    onSuccess: () => {
      setIsGenerating(false);
      setGenerationSuccess(true);
      // Redirect to the report view after a short delay
      setTimeout(() => {
        router.push('/analytics/reports');
      }, 1500);
    },
    onError: () => {
      setIsGenerating(false);
    },
  });

  // Handle report generation
  const handleGenerateReport = () => {
    setIsGenerating(true);
    generateReportMutation.mutate();
  };

  // Handle date change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = new Date(e.target.value);
    setSelectedDate(date);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/analytics/reports" className="text-gray-500 hover:text-gray-700">
              <ChevronLeftIcon className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-bold">Generate Weekly Report</h1>
          </div>
          <p className="text-gray-500 mt-2">
            Create a comprehensive report of your learning progress for a specific week
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
              <div className="space-y-4">
                <div>
                  <label htmlFor="week-select" className="block text-sm font-medium text-gray-700 mb-1">
                    Week Starting
                  </label>
                  <input
                    id="week-select"
                    type="date"
                    value={format(startDate, 'yyyy-MM-dd')}
                    onChange={handleDateChange}
                    max={format(new Date(), 'yyyy-MM-dd')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Selected Period</p>
                  <p className="text-lg font-bold mt-1">{displayDateRange}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Data Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-24">
                  <ArrowPathIcon className="w-6 h-6 animate-spin text-blue-500" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-green-600 font-medium">Total Study Hours</p>
                    <p className="text-2xl font-bold mt-1">{totalHours.toFixed(1)}</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-purple-600 font-medium">Average Focus Score</p>
                    <p className="text-2xl font-bold mt-1">{averageFocus.toFixed(1)}/10</p>
                  </div>
                  <div className="bg-amber-50 p-4 rounded-lg">
                    <p className="text-sm text-amber-600 font-medium">Days with Activity</p>
                    <p className="text-2xl font-bold mt-1">{dailyData.filter(day => day.hasData).length}/7</p>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <button
                onClick={handleGenerateReport}
                disabled={isGenerating || !hasData || isFutureWeek || generationSuccess}
                className={`w-full py-2 px-4 rounded-md flex items-center justify-center ${
                  hasData && !isFutureWeek && !generationSuccess
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isGenerating ? (
                  <>
                    <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : generationSuccess ? (
                  <>
                    <CheckCircleIcon className="w-5 h-5 mr-2" />
                    Report Generated
                  </>
                ) : (
                  <>
                    <DocumentTextIcon className="w-5 h-5 mr-2" />
                    Generate Report
                  </>
                )}
              </button>
            </CardFooter>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Preview</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <ArrowPathIcon className="w-8 h-8 animate-spin text-blue-500" />
                </div>
              ) : isFutureWeek ? (
                <div className="text-center py-12">
                  <DocumentTextIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h2 className="text-xl font-semibold mb-2">Future Week Selected</h2>
                  <p className="text-gray-500">
                    You cannot generate reports for future weeks. Please select a past or current week.
                  </p>
                </div>
              ) : !hasData ? (
                <div className="text-center py-12">
                  <DocumentTextIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h2 className="text-xl font-semibold mb-2">No Data Available</h2>
                  <p className="text-gray-500">
                    There is no learning activity recorded for the selected week.
                    Please select a different week or add study metrics for this period.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Day</th>
                        <th className="text-left py-3 px-4">Study Hours</th>
                        <th className="text-left py-3 px-4">Focus Score</th>
                        <th className="text-left py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyData.map((day, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{format(day.date, 'EEEE, MMM d')}</td>
                          <td className="py-3 px-4">{day.hours.toFixed(1)}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              <span>{day.focus.toFixed(1)}</span>
                              <div className="ml-2 w-24 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: `${(day.focus / 10) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {day.hasData ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Data Available
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                No Data
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Report Contents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                    <DocumentTextIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-medium">Study Time Analysis</h3>
                    <p className="text-sm text-gray-500">
                      Daily breakdown of study hours with visualizations and comparisons to previous weeks
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-full bg-purple-100 text-purple-600">
                    <DocumentTextIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-medium">Focus Score Tracking</h3>
                    <p className="text-sm text-gray-500">
                      Analysis of focus scores throughout the week with trends and patterns
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-full bg-green-100 text-green-600">
                    <DocumentTextIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-medium">Topic Distribution</h3>
                    <p className="text-sm text-gray-500">
                      Breakdown of time spent on different topics with visualizations
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-full bg-amber-100 text-amber-600">
                    <DocumentTextIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-medium">Performance Comparison</h3>
                    <p className="text-sm text-gray-500">
                      Comparison with previous week&apos;s performance to track progress
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}