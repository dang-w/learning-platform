'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { knowledgeApi } from '@/lib/api';
import { Button } from '@/components/ui/buttons';
import { Alert, Spinner } from '@/components/ui/feedback';
import { SpacedRepetitionAlgorithm } from '@/types/knowledge';

export default function SpacedRepetitionSettingsPage() {
  const router = useRouter();

  const [algorithm, setAlgorithm] = useState<SpacedRepetitionAlgorithm>(SpacedRepetitionAlgorithm.SM2);
  const [dailyReviewLimit, setDailyReviewLimit] = useState<number>(20);
  const [includeNewConcepts, setIncludeNewConcepts] = useState<boolean>(true);
  const [newConceptsPerDay, setNewConceptsPerDay] = useState<number>(5);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const settingsData = await knowledgeApi.getSpacedRepetitionSettings();

        // Initialize form with fetched settings
        setAlgorithm(settingsData.algorithm);
        setDailyReviewLimit(settingsData.daily_review_limit);
        setIncludeNewConcepts(settingsData.include_new_concepts);
        setNewConceptsPerDay(settingsData.new_concepts_per_day);

      } catch (error) {
        console.error('Failed to load spaced repetition settings:', error);
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load settings. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      await knowledgeApi.updateSpacedRepetitionSettings({
        algorithm,
        daily_review_limit: dailyReviewLimit,
        include_new_concepts: includeNewConcepts,
        new_concepts_per_day: newConceptsPerDay
      });

      setSuccessMessage('Settings updated successfully!');

    } catch (error) {
      console.error('Failed to save spaced repetition settings:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRetry = () => {
    if (isLoading) {
      // Reload the current page
      router.refresh();
    } else {
      // Try saving again
      handleSaveSettings();
    }
  };

  const handleBackToKnowledge = () => {
    router.push('/knowledge');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64" data-testid="loading-spinner">
          <Spinner size="lg" />
          <span className="ml-4 text-lg">Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900" data-testid="settings-heading">
          Spaced Repetition Settings
        </h1>
        <Button
          onClick={handleBackToKnowledge}
          variant="outline"
          data-testid="back-to-knowledge-button"
        >
          Back to Knowledge
        </Button>
      </div>

      {errorMessage && (
        <Alert variant="error" className="mb-6" data-testid="error-message">
          <div className="flex justify-between items-center">
            <div>{errorMessage}</div>
            <Button onClick={handleRetry} size="sm">
              Retry
            </Button>
          </div>
        </Alert>
      )}

      {successMessage && (
        <Alert variant="success" className="mb-6" data-testid="success-message">
          {successMessage}
        </Alert>
      )}

      <div className="bg-white rounded-lg shadow-md p-6 mb-8" data-testid="settings-form">
        <div className="space-y-6">
          <div>
            <label htmlFor="algorithm" className="block font-medium mb-2">
              Spaced Repetition Algorithm
            </label>
            <select
              id="algorithm"
              className="w-full p-3 border border-gray-300 rounded-md"
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value as SpacedRepetitionAlgorithm)}
              data-testid="algorithm-select"
            >
              <option value={SpacedRepetitionAlgorithm.SM2}>SuperMemo 2</option>
              <option value={SpacedRepetitionAlgorithm.LEITNER}>Leitner System</option>
              <option value={SpacedRepetitionAlgorithm.CUSTOM}>Custom</option>
            </select>
            <p className="text-sm text-gray-500 mt-1">
              {algorithm === SpacedRepetitionAlgorithm.SM2 &&
                'SuperMemo 2: Adjusts intervals based on your confidence rating.'}
              {algorithm === SpacedRepetitionAlgorithm.LEITNER &&
                'Leitner System: Concepts are moved between difficulty boxes.'}
              {algorithm === SpacedRepetitionAlgorithm.CUSTOM &&
                'Custom: Uses your personalized spacing settings.'}
            </p>
          </div>

          <div>
            <label htmlFor="daily-review-limit" className="block font-medium mb-2">
              Daily Review Limit
            </label>
            <input
              id="daily-review-limit"
              type="number"
              min="1"
              max="100"
              className="w-full p-3 border border-gray-300 rounded-md"
              value={dailyReviewLimit}
              onChange={(e) => setDailyReviewLimit(Number(e.target.value))}
              data-testid="daily-review-limit-input"
            />
            <p className="text-sm text-gray-500 mt-1">
              Maximum number of reviews to show per day.
            </p>
          </div>

          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="include-new-concepts"
                type="checkbox"
                className="h-4 w-4 border-gray-300 rounded"
                checked={includeNewConcepts}
                onChange={(e) => setIncludeNewConcepts(e.target.checked)}
                data-testid="include-new-concepts-checkbox"
              />
            </div>
            <div className="ml-3">
              <label htmlFor="include-new-concepts" className="font-medium">
                Include New Concepts
              </label>
              <p className="text-sm text-gray-500">
                Include new, never-reviewed concepts in your daily review sessions.
              </p>
            </div>
          </div>

          {includeNewConcepts && (
            <div>
              <label htmlFor="new-concepts-per-day" className="block font-medium mb-2">
                New Concepts Per Day
              </label>
              <input
                id="new-concepts-per-day"
                type="number"
                min="1"
                max="50"
                className="w-full p-3 border border-gray-300 rounded-md"
                value={newConceptsPerDay}
                onChange={(e) => setNewConceptsPerDay(Number(e.target.value))}
                data-testid="new-concepts-per-day-input"
              />
              <p className="text-sm text-gray-500 mt-1">
                Number of new concepts to introduce each day.
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 flex justify-end">
          <Button
            onClick={handleSaveSettings}
            disabled={isSaving}
            data-testid="save-settings-button"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6" data-testid="about-spaced-repetition">
        <h2 className="text-xl font-semibold mb-4">About Spaced Repetition</h2>
        <div className="prose max-w-none text-gray-700">
          <p>
            Spaced repetition is an evidence-based learning technique that incorporates increasing intervals of time between subsequent review of previously learned material. This approach leverages the psychological spacing effect, which demonstrates that information is more effectively memorized when learned in multiple spaced-out sessions.
          </p>
          <h3 className="text-lg font-medium mt-4 mb-2">How it works</h3>
          <p>
            When you review a concept, you rate how well you remembered it. Based on your rating:
          </p>
          <ul className="list-disc pl-5 mt-2 mb-4">
            <li>Concepts you found difficult will appear again sooner</li>
            <li>Concepts you found easy will have longer intervals before being shown again</li>
            <li>The system automatically optimizes your learning by focusing on what you need to review most</li>
          </ul>
          <p>
            This approach helps you focus your study time on the information that you&apos;re most likely to forget, making your learning more efficient and effective.
          </p>
        </div>
      </div>
    </div>
  );
}