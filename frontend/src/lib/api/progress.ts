import apiClient from './client';
import { LearningProgress } from '@/types/progress';

export interface Metric {
  id: string;
  date: string;
  study_hours: number;
  topics: string;
  focus_score: number;
  notes: string;
}

export interface MetricCreate {
  date: string;
  study_hours: number;
  topics: string;
  focus_score: number;
  notes: string;
}

export interface MetricsSummary {
  total_hours: number;
  average_focus: number;
  most_studied_topics: string[];
  streak_days: number;
  recent_metrics: Metric[];
}

export interface WeeklyReport {
  start_date: string;
  end_date: string;
  total_hours: number;
  average_focus: number;
  topic_distribution: Record<string, number>;
  daily_hours: Record<string, number>;
  daily_focus: Record<string, number>;
  charts: {
    hours_chart: string; // Base64 encoded image
    focus_chart: string; // Base64 encoded image
    topics_chart: string; // Base64 encoded image
  };
  comparison_to_previous: {
    hours_change_percentage: number;
    focus_change_percentage: number;
  };
}

const progressApi = {
  addMetric: async (data: MetricCreate): Promise<Metric> => {
    const response = await apiClient.post<Metric>('/progress/metrics', data);
    return response.data;
  },

  getMetrics: async (startDate?: string, endDate?: string): Promise<Metric[]> => {
    let url = '/progress/metrics';
    const params = new URLSearchParams();

    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await apiClient.get<Metric[]>(url);
    return response.data;
  },

  getRecentMetricsSummary: async (days: number = 7): Promise<MetricsSummary> => {
    try {
      console.log('Fetching recent metrics...');
      const response = await apiClient.get(`/progress/metrics/recent?days=${days}`);
      console.log('Recent metrics response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching recent metrics:', error);
      throw error;
    }
  },

  generateWeeklyReport: async (date?: string): Promise<WeeklyReport> => {
    let url = '/progress/report/weekly';
    if (date) {
      url += `?date=${date}`;
    }

    const response = await apiClient.get<WeeklyReport>(url);
    return response.data;
  },

  deleteMetric: async (metricId: string): Promise<void> => {
    await apiClient.delete(`/progress/metrics/${metricId}`);
  },

  fetchLearningProgress: async (): Promise<LearningProgress> => {
    const response = await apiClient.get<LearningProgress>('/progress');
    return response.data;
  },

  getAllMetrics: async () => {
    try {
      const response = await apiClient.get('/progress/metrics');
      return response.data;
    } catch (error) {
      console.error('Error fetching all metrics:', error);
      throw error;
    }
  },

  getStudySessions: async () => {
    try {
      const response = await apiClient.get('/progress/study-session');
      return response.data;
    } catch (error) {
      console.error('Error fetching study sessions:', error);
      throw error;
    }
  },
};

export default progressApi;