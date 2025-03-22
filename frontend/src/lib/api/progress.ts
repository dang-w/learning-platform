import { LearningProgress } from '@/types/progress';
import { fetchJsonWithAuth } from '../utils/api';

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
    try {
      return await fetchJsonWithAuth<Metric>('/api/progress/metrics', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error('Error adding metric:', error);
      throw error;
    }
  },

  getMetrics: async (startDate?: string, endDate?: string): Promise<Metric[]> => {
    try {
      let url = '/api/progress/metrics';
      const params = new URLSearchParams();

      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      return await fetchJsonWithAuth<Metric[]>(url);
    } catch (error) {
      console.error('Error fetching metrics:', error);
      throw error;
    }
  },

  getRecentMetricsSummary: async (days: number = 7): Promise<MetricsSummary> => {
    try {
      console.log(`Fetching recent metrics summary for the last ${days} days`);
      return await fetchJsonWithAuth<MetricsSummary>(`/api/progress/metrics/recent?days=${days}`);
    } catch (error) {
      console.error('Error fetching recent metrics:', error);
      throw error;
    }
  },

  generateWeeklyReport: async (date?: string): Promise<WeeklyReport> => {
    try {
      let url = '/api/progress/report/weekly';
      if (date) {
        url += `?date=${date}`;
      }

      return await fetchJsonWithAuth<WeeklyReport>(url);
    } catch (error) {
      console.error('Error generating weekly report:', error);
      throw error;
    }
  },

  deleteMetric: async (metricId: string): Promise<void> => {
    try {
      await fetchJsonWithAuth(`/api/progress/metrics/${metricId}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Error deleting metric:', error);
      throw error;
    }
  },

  fetchLearningProgress: async (): Promise<LearningProgress> => {
    try {
      return await fetchJsonWithAuth<LearningProgress>('/api/learning-path/progress');
    } catch (error) {
      console.error('Error fetching learning progress:', error);
      throw error;
    }
  },

  getAllMetrics: async () => {
    try {
      return await fetchJsonWithAuth('/api/progress/metrics');
    } catch (error) {
      console.error('Error fetching all metrics:', error);
      throw error;
    }
  },

  getStudySessions: async () => {
    try {
      return await fetchJsonWithAuth('/api/progress/study-session');
    } catch (error) {
      console.error('Error fetching study sessions:', error);
      throw error;
    }
  },
};

export default progressApi;