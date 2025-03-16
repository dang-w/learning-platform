import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/buttons';
import { StudyMetricFormData, StudyMetricFormProps } from '@/types/progress';

export function StudyMetricsForm({ metric, onSubmit, onCancel }: StudyMetricFormProps) {
  const [formData, setFormData] = useState<StudyMetricFormData>({
    date: '',
    study_hours: 0,
    topics: [],
    focus_score: 5,
    notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [topicsInput, setTopicsInput] = useState('');

  // Pre-fill form when editing an existing metric
  useEffect(() => {
    if (metric) {
      setFormData({
        date: metric.date,
        study_hours: metric.study_hours,
        topics: Array.isArray(metric.topics)
          ? metric.topics
          : (metric.topics as string).split(',').map((t: string) => t.trim()),
        focus_score: metric.focus_score,
        notes: metric.notes
      });
      setTopicsInput(Array.isArray(metric.topics)
        ? metric.topics.join(', ')
        : metric.topics as string);
    }
  }, [metric]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    if (!formData.study_hours) {
      newErrors.study_hours = 'Study hours are required';
    } else if (formData.study_hours <= 0) {
      newErrors.study_hours = 'Study hours must be positive';
    }

    if (!topicsInput.trim()) {
      newErrors.topics = 'At least one topic is required';
    }

    if (!formData.focus_score) {
      newErrors.focus_score = 'Focus score is required';
    } else if (formData.focus_score < 1 || formData.focus_score > 10) {
      newErrors.focus_score = 'Focus score must be between 1 and 10';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      // Process topics from comma-separated string to array
      const processedTopics = topicsInput
        .split(',')
        .map(topic => topic.trim())
        .filter(topic => topic.length > 0);

      onSubmit({
        ...formData,
        topics: processedTopics
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name === 'topics') {
      setTopicsInput(value);
    } else if (name === 'study_hours' || name === 'focus_score') {
      setFormData({
        ...formData,
        [name]: parseFloat(value) || 0
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="date" className="block text-sm font-medium mb-1">
          Date
        </label>
        <input
          id="date"
          name="date"
          type="date"
          className={`w-full p-2 border rounded ${errors.date ? 'border-red-500' : 'border-gray-300'}`}
          value={formData.date}
          onChange={handleChange}
        />
        {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date}</p>}
      </div>

      <div>
        <label htmlFor="study_hours" className="block text-sm font-medium mb-1">
          Study Hours
        </label>
        <input
          id="study_hours"
          name="study_hours"
          type="number"
          step="0.5"
          min="0.5"
          className={`w-full p-2 border rounded ${errors.study_hours ? 'border-red-500' : 'border-gray-300'}`}
          value={formData.study_hours || ''}
          onChange={handleChange}
        />
        {errors.study_hours && <p className="text-red-500 text-sm mt-1">{errors.study_hours}</p>}
      </div>

      <div>
        <label htmlFor="topics" className="block text-sm font-medium mb-1">
          Topics
        </label>
        <input
          id="topics"
          name="topics"
          type="text"
          placeholder="React, TypeScript, Next.js"
          className={`w-full p-2 border rounded ${errors.topics ? 'border-red-500' : 'border-gray-300'}`}
          value={topicsInput}
          onChange={handleChange}
        />
        <p className="text-gray-500 text-xs mt-1">Separate topics with commas</p>
        {errors.topics && <p className="text-red-500 text-sm mt-1">{errors.topics}</p>}
      </div>

      <div>
        <label htmlFor="focus_score" className="block text-sm font-medium mb-1">
          Focus Score
        </label>
        <input
          id="focus_score"
          name="focus_score"
          type="number"
          min="1"
          max="10"
          className={`w-full p-2 border rounded ${errors.focus_score ? 'border-red-500' : 'border-gray-300'}`}
          value={formData.focus_score || ''}
          onChange={handleChange}
        />
        <p className="text-gray-500 text-xs mt-1">Rate your focus from 1 to 10</p>
        {errors.focus_score && <p className="text-red-500 text-sm mt-1">{errors.focus_score}</p>}
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium mb-1">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          className="w-full p-2 border border-gray-300 rounded"
          value={formData.notes}
          onChange={handleChange}
        />
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Save
        </Button>
      </div>
    </form>
  );
}