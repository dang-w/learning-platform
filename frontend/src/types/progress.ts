export interface LearningProgress {
  completed: number
  in_progress: number
  not_started: number
  total_resources: number
  completion_percentage: number
  recent_completions: {
    id: string
    title: string
    completion_date: string
  }[]
  recent_activity: {
    id: string
    type: 'completion' | 'start' | 'review'
    resource_id: string
    resource_title: string
    timestamp: string
  }[]
}

export interface StudyMetric {
  id: string;
  date: string;
  study_hours: number;
  topics: string[];
  focus_score: number; // 1-10
  notes: string;
}

export interface StudyMetricFormData {
  date: string;
  study_hours: number;
  topics: string[];
  focus_score: number;
  notes: string;
}

export interface StudyMetricFormProps {
  metric?: StudyMetric;
  onSubmit: (data: StudyMetricFormData) => void;
  onCancel: () => void;
}

export interface MetricListProps {
  metrics: StudyMetric[];
  onDelete: (id: string) => void;
  onEdit: (metric: StudyMetric) => void;
}

export interface MetricFilterProps {
  onFilterChange: (filter: MetricFilter) => void;
}

export interface MetricFilter {
  startDate: string | null;
  endDate: string | null;
  topic: string | 'all';
}

export interface DailyMetricSummary {
  study_hours: number;
  focus_score: number;
  topics: string[];
}

export interface WeeklyMetricSummary {
  total_hours: number;
  study_days: number;
  average_focus: number;
  top_topics: string[];
  daily_hours: Record<string, number>; // day -> hours
}

export interface MonthlyMetricSummary {
  total_hours: number;
  study_days: number;
  average_focus: number;
  top_topics: string[];
  weekly_hours: Record<string, number>; // week -> hours
}

export interface RecentMetricsSummary {
  today: DailyMetricSummary | null;
  yesterday: DailyMetricSummary | null;
  this_week: WeeklyMetricSummary;
  last_week: WeeklyMetricSummary;
  this_month: MonthlyMetricSummary;
}

export interface WeeklyReport {
  this_week: WeeklyMetricSummary;
  last_week: WeeklyMetricSummary;
  comparison: {
    hours_change: number; // percentage
    focus_change: number; // percentage
    consistency_change: number; // percentage
  };
}

export interface StudyTrend {
  date: string;
  hours: number;
  focus: number;
}