import '@testing-library/jest-dom';
import type { jest } from '@jest/globals';
import progressApi, { Metric, MetricCreate, MetricsSummary, WeeklyReport } from '@/lib/api/progress';
import apiClient from '@/lib/api/client';
import { LearningProgress } from '@/types/progress';

// Mock the apiClient
jest.mock('@/lib/api/client', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

describe('Progress API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addMetric', () => {
    it('should call the addMetric endpoint', async () => {
      // Mock response
      const mockMetric: Metric = {
        id: '1',
        date: '2023-01-01',
        study_hours: 3.5,
        topics: 'React, TypeScript',
        focus_score: 8,
        notes: 'Productive study session',
      };
      (apiClient.post as jest.Mock).mockResolvedValue({ data: mockMetric });

      // Test data
      const metricData: MetricCreate = {
        date: '2023-01-01',
        study_hours: 3.5,
        topics: 'React, TypeScript',
        focus_score: 8,
        notes: 'Productive study session',
      };

      // Call the function
      const result = await progressApi.addMetric(metricData);

      // Assertions
      expect(apiClient.post).toHaveBeenCalledWith('/progress/metrics', metricData);
      expect(result).toEqual(mockMetric);
    });
  });

  describe('getMetrics', () => {
    it('should call the getMetrics endpoint without params', async () => {
      // Mock response
      const mockMetrics: Metric[] = [
        {
          id: '1',
          date: '2023-01-01',
          study_hours: 3.5,
          topics: 'React, TypeScript',
          focus_score: 8,
          notes: 'Productive study session',
        },
      ];
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockMetrics });

      // Call the function
      const result = await progressApi.getMetrics();

      // Assertions
      expect(apiClient.get).toHaveBeenCalledWith('/progress/metrics');
      expect(result).toEqual(mockMetrics);
    });

    it('should call the getMetrics endpoint with date range', async () => {
      // Mock response
      const mockMetrics: Metric[] = [
        {
          id: '1',
          date: '2023-01-01',
          study_hours: 3.5,
          topics: 'React, TypeScript',
          focus_score: 8,
          notes: 'Productive study session',
        },
        {
          id: '2',
          date: '2023-01-02',
          study_hours: 2.0,
          topics: 'Next.js',
          focus_score: 7,
          notes: 'Worked on routing',
        },
      ];
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockMetrics });

      // Call the function with date range
      const startDate = '2023-01-01';
      const endDate = '2023-01-07';
      const result = await progressApi.getMetrics(startDate, endDate);

      // Assertions
      expect(apiClient.get).toHaveBeenCalledWith('/progress/metrics?start_date=2023-01-01&end_date=2023-01-07');
      expect(result).toEqual(mockMetrics);
    });
  });

  describe('getRecentMetricsSummary', () => {
    it('should call the getRecentMetricsSummary endpoint with default days', async () => {
      // Mock response
      const mockSummary: MetricsSummary = {
        total_hours: 20.5,
        average_focus: 7.5,
        most_studied_topics: ['React', 'TypeScript', 'Next.js'],
        streak_days: 5,
        recent_metrics: [
          {
            id: '1',
            date: '2023-01-01',
            study_hours: 3.5,
            topics: 'React, TypeScript',
            focus_score: 8,
            notes: 'Productive study session',
          },
        ],
      };
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockSummary });

      // Call the function
      const result = await progressApi.getRecentMetricsSummary();

      // Assertions
      expect(apiClient.get).toHaveBeenCalledWith('/progress/metrics/recent?days=7');
      expect(result).toEqual(mockSummary);
    });

    it('should call the getRecentMetricsSummary endpoint with custom days', async () => {
      // Mock response
      const mockSummary: MetricsSummary = {
        total_hours: 30.5,
        average_focus: 7.2,
        most_studied_topics: ['React', 'TypeScript', 'Next.js'],
        streak_days: 10,
        recent_metrics: [
          {
            id: '1',
            date: '2023-01-01',
            study_hours: 3.5,
            topics: 'React, TypeScript',
            focus_score: 8,
            notes: 'Productive study session',
          },
        ],
      };
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockSummary });

      // Call the function with custom days
      const days = 14;
      const result = await progressApi.getRecentMetricsSummary(days);

      // Assertions
      expect(apiClient.get).toHaveBeenCalledWith('/progress/metrics/recent?days=14');
      expect(result).toEqual(mockSummary);
    });
  });

  describe('generateWeeklyReport', () => {
    it('should call the generateWeeklyReport endpoint without date', async () => {
      // Mock response
      const mockReport: WeeklyReport = {
        start_date: '2023-01-01',
        end_date: '2023-01-07',
        total_hours: 20.5,
        average_focus: 7.5,
        topic_distribution: {
          React: 8.5,
          TypeScript: 6.0,
          'Next.js': 6.0,
        },
        daily_hours: {
          '2023-01-01': 3.5,
          '2023-01-02': 2.0,
          '2023-01-03': 4.0,
          '2023-01-04': 3.0,
          '2023-01-05': 3.5,
          '2023-01-06': 2.5,
          '2023-01-07': 2.0,
        },
        daily_focus: {
          '2023-01-01': 8,
          '2023-01-02': 7,
          '2023-01-03': 8,
          '2023-01-04': 7,
          '2023-01-05': 8,
          '2023-01-06': 7,
          '2023-01-07': 7,
        },
        charts: {
          hours_chart: 'base64_encoded_image',
          focus_chart: 'base64_encoded_image',
          topics_chart: 'base64_encoded_image',
        },
        comparison_to_previous: {
          hours_change_percentage: 15.2,
          focus_change_percentage: 5.5,
        },
      };
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockReport });

      // Call the function
      const result = await progressApi.generateWeeklyReport();

      // Assertions
      expect(apiClient.get).toHaveBeenCalledWith('/progress/report/weekly');
      expect(result).toEqual(mockReport);
    });

    it('should call the generateWeeklyReport endpoint with date', async () => {
      // Mock response
      const mockReport: WeeklyReport = {
        start_date: '2023-01-01',
        end_date: '2023-01-07',
        total_hours: 20.5,
        average_focus: 7.5,
        topic_distribution: {
          React: 8.5,
          TypeScript: 6.0,
          'Next.js': 6.0,
        },
        daily_hours: {
          '2023-01-01': 3.5,
          '2023-01-02': 2.0,
          '2023-01-03': 4.0,
          '2023-01-04': 3.0,
          '2023-01-05': 3.5,
          '2023-01-06': 2.5,
          '2023-01-07': 2.0,
        },
        daily_focus: {
          '2023-01-01': 8,
          '2023-01-02': 7,
          '2023-01-03': 8,
          '2023-01-04': 7,
          '2023-01-05': 8,
          '2023-01-06': 7,
          '2023-01-07': 7,
        },
        charts: {
          hours_chart: 'base64_encoded_image',
          focus_chart: 'base64_encoded_image',
          topics_chart: 'base64_encoded_image',
        },
        comparison_to_previous: {
          hours_change_percentage: 15.2,
          focus_change_percentage: 5.5,
        },
      };
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockReport });

      // Call the function with date
      const date = '2023-01-01';
      const result = await progressApi.generateWeeklyReport(date);

      // Assertions
      expect(apiClient.get).toHaveBeenCalledWith('/progress/report/weekly?date=2023-01-01');
      expect(result).toEqual(mockReport);
    });
  });

  describe('deleteMetric', () => {
    it('should call the deleteMetric endpoint', async () => {
      // Mock response
      (apiClient.delete as jest.Mock).mockResolvedValue({});

      // Call the function
      await progressApi.deleteMetric('1');

      // Assertions
      expect(apiClient.delete).toHaveBeenCalledWith('/progress/metrics/1');
    });
  });

  describe('fetchLearningProgress', () => {
    it('should call the fetchLearningProgress endpoint', async () => {
      // Mock response
      const mockProgress: LearningProgress = {
        total_resources: 50,
        completion_percentage: 50,
        completed: 25,
        in_progress: 15,
        not_started: 10,
        recent_activity: [
          {
            id: '1',
            type: 'completion',
            resource_id: '1',
            resource_title: 'Resource 1',
            timestamp: '2023-01-01T00:00:00Z',
          },
        ],
        recent_completions: [
          {
            id: '1',
            title: 'Resource 1',
            completion_date: '2023-01-01T00:00:00Z',
          },
        ]
      };
      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockProgress });

      // Call the function
      const result = await progressApi.fetchLearningProgress();

      // Assertions
      expect(apiClient.get).toHaveBeenCalledWith('/progress');
      expect(result).toEqual(mockProgress);
    });
  });
});