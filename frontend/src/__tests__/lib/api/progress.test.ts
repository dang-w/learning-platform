import '@testing-library/jest-dom';
import progressApi, { Metric, MetricCreate, MetricsSummary, WeeklyReport } from '@/lib/api/progress';
import { LearningProgress } from '@/types/progress';
import apiClient from '@/lib/api/client';
import { expect } from '@jest/globals';

// Mock the apiClient
jest.mock('@/lib/api/client', () => {
  return {
    __esModule: true,
    default: {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    }
  };
});

// Cast the imported apiClient to its mocked type for intellisense/type safety
const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('Progress API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mocks on the imported object
    mockedApiClient.get.mockReset();
    mockedApiClient.post.mockReset();
    mockedApiClient.put.mockReset();
    mockedApiClient.delete.mockReset();
  });

  describe('addMetric', () => {
    it('should call the addMetric endpoint', async () => {
      // Mock response
      const mockMetric: Metric = {
        id: '1', date: '2023-01-01', study_hours: 3.5, topics: 'React, TypeScript', focus_score: 8, notes: 'Productive session'
      };
      mockedApiClient.post.mockResolvedValue({ data: mockMetric });

      // Test data
      const metricData: MetricCreate = {
        date: '2023-01-01', study_hours: 3.5, topics: 'React, TypeScript', focus_score: 8, notes: 'Productive session'
      };

      // Call the function
      const result = await progressApi.addMetric(metricData);

      // Assertions
      expect(mockedApiClient.post).toHaveBeenCalledWith('/api/progress/metrics', metricData);
      expect(result).toEqual(mockMetric);
    });
  });

  describe('getMetrics', () => {
    it('should call the getMetrics endpoint without params', async () => {
      // Mock response
      const mockMetrics: Metric[] = [{ id: '1', date: '2023-01-01', study_hours: 3.5, topics: 'React', focus_score: 8, notes: 'Notes 1' }];
      mockedApiClient.get.mockResolvedValue({ data: mockMetrics });

      // Call the function
      const result = await progressApi.getMetrics();

      // Assertions
      // Check URL and that params object was passed (even if empty search params)
      expect(mockedApiClient.get).toHaveBeenCalledWith('/api/progress/metrics', { params: expect.any(URLSearchParams) });
      expect(result).toEqual(mockMetrics);
    });

    it('should call the getMetrics endpoint with date range', async () => {
      // Mock response
      const mockMetrics: Metric[] = [
        { id: '1', date: '2023-01-01', study_hours: 3.5, topics: 'React', focus_score: 8, notes: 'Notes 1' },
        { id: '2', date: '2023-01-02', study_hours: 2.0, topics: 'Next.js', focus_score: 7, notes: 'Notes 2' },
      ];
      mockedApiClient.get.mockResolvedValue({ data: mockMetrics });

      // Call the function with date range
      const startDate = '2023-01-01';
      const endDate = '2023-01-07';
      const result = await progressApi.getMetrics(startDate, endDate);

      // Assertions
      const expectedParams = new URLSearchParams({ start_date: startDate, end_date: endDate });
      expect(mockedApiClient.get).toHaveBeenCalledWith('/api/progress/metrics', { params: expectedParams });
      expect(result).toEqual(mockMetrics);
    });
  });

  describe('getRecentMetricsSummary', () => {
    it('should call the getRecentMetricsSummary endpoint with default days', async () => {
      // Mock response
      const mockSummary: MetricsSummary = {
        total_hours: 20.5, average_focus: 7.5, most_studied_topics: ['React'], streak_days: 5,
        recent_metrics: [
          { id: '1', date: '2023-01-01', study_hours: 3.5, topics: 'React', focus_score: 8, notes: 'Notes 1' },
        ],
      };
      mockedApiClient.get.mockResolvedValue({ data: mockSummary });

      // Call the function
      const result = await progressApi.getRecentMetricsSummary(); // Default days = 7

      // Assertions
      expect(mockedApiClient.get).toHaveBeenCalledWith('/api/progress/metrics/recent', { params: { days: 7 } });
      expect(result).toEqual(mockSummary);
    });

    it('should call the getRecentMetricsSummary endpoint with custom days', async () => {
      // Mock response
      const mockSummary: MetricsSummary = {
        total_hours: 30.5, average_focus: 7.2, most_studied_topics: ['React'], streak_days: 10,
        recent_metrics: [
          { id: '1', date: '2023-01-01', study_hours: 3.5, topics: 'React', focus_score: 8, notes: 'Notes 1' },
        ],
      };
      mockedApiClient.get.mockResolvedValue({ data: mockSummary });

      // Call the function with custom days
      const days = 14;
      const result = await progressApi.getRecentMetricsSummary(days);

      // Assertions
      expect(mockedApiClient.get).toHaveBeenCalledWith('/api/progress/metrics/recent', { params: { days: 14 } });
      expect(result).toEqual(mockSummary);
    });
  });

  describe('generateWeeklyReport', () => {
    it('should call the generateWeeklyReport endpoint without date', async () => {
      // Mock response
      const mockReport: WeeklyReport = {
        start_date: '2023-01-01', end_date: '2023-01-07', total_hours: 20.5, average_focus: 7.5, topic_distribution: {}, daily_hours: {}, daily_focus: {}, charts: { hours_chart: '', focus_chart: '', topics_chart: '' }, comparison_to_previous: { hours_change_percentage: 0, focus_change_percentage: 0 }
      };
      mockedApiClient.get.mockResolvedValue({ data: mockReport });

      // Call the function
      const result = await progressApi.generateWeeklyReport();

      // Assertions
      expect(mockedApiClient.get).toHaveBeenCalledWith('/api/progress/report/weekly', { params: undefined });
      expect(result).toEqual(mockReport);
    });

    it('should call the generateWeeklyReport endpoint with date', async () => {
      // Mock response
      const mockReport: WeeklyReport = {
        start_date: '2023-01-08', end_date: '2023-01-14', total_hours: 18.0, average_focus: 8.0, topic_distribution: {}, daily_hours: {}, daily_focus: {}, charts: { hours_chart: '', focus_chart: '', topics_chart: '' }, comparison_to_previous: { hours_change_percentage: 0, focus_change_percentage: 0 }
      };
      mockedApiClient.get.mockResolvedValue({ data: mockReport });

      // Call the function with date
      const date = '2023-01-10';
      const result = await progressApi.generateWeeklyReport(date);

      // Assertions
      expect(mockedApiClient.get).toHaveBeenCalledWith('/api/progress/report/weekly', { params: { date } });
      expect(result).toEqual(mockReport);
    });
  });

  describe('deleteMetric', () => {
    it('should call the deleteMetric endpoint', async () => {
      // Mock response (delete usually returns no content)
      mockedApiClient.delete.mockResolvedValue({});

      // Call the function
      const metricId = '1';
      await progressApi.deleteMetric(metricId);

      // Assertions
      expect(mockedApiClient.delete).toHaveBeenCalledWith(`/api/progress/metrics/${metricId}`);
    });
  });

  describe('fetchLearningProgress', () => {
    it('should call the fetchLearningProgress endpoint', async () => {
      // Mock response matching the LearningProgress interface
      const mockProgress: LearningProgress = {
        completed: 25,
        in_progress: 15,
        not_started: 10,
        total_resources: 50,
        completion_percentage: 50,
        recent_completions: [
          { id: 'res1', title: 'Resource 1', completion_date: '2023-01-01T10:00:00Z' }
        ],
        recent_activity: [
          { id: 'act1', type: 'completion', resource_id: 'res1', resource_title: 'Resource 1', timestamp: '2023-01-01T10:00:00Z' },
          { id: 'act2', type: 'start', resource_id: 'res2', resource_title: 'Resource 2', timestamp: '2023-01-02T11:00:00Z' }
        ]
      };
      mockedApiClient.get.mockResolvedValue({ data: mockProgress });

      // Call the function
      const result = await progressApi.fetchLearningProgress();

      // Assertions
      expect(mockedApiClient.get).toHaveBeenCalledWith('/api/learning-path/progress');
      expect(result).toEqual(mockProgress);
    });
  });

  // TODO: Add tests for getAllMetrics and getStudySessions if needed, including mock setup and assertions.
});