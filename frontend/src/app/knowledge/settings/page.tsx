'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { knowledgeApi } from '@/lib/api';
import { Button } from '@/components/ui/buttons';
import { Alert, Spinner } from '@/components/ui/feedback';
import { SpacedRepetitionAlgorithm } from '@/types/knowledge';
import Link from 'next/link';
import { FaChevronLeft } from 'react-icons/fa';
import ReviewHistoryChart from '@/components/knowledge/ReviewHistoryChart';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export default function SpacedRepetitionSettingsPage() {
  const router = useRouter();
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week');
  const { user } = useCurrentUser();
  const userId = user?.id || '';

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
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8">
        <Link
          href="/knowledge"
          className="text-blue-600 hover:text-blue-800 flex items-center"
        >
          <FaChevronLeft className="mr-2" />
          Back to Knowledge Dashboard
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-8">Spaced Repetition Settings</h1>

      {errorMessage && (
        <Alert variant="error" className="mb-6" data-testid="error-message">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">Error</p>
              <p>{errorMessage}</p>
            </div>
            <Button onClick={handleRetry} variant="secondary" size="sm">
              Retry
            </Button>
          </div>
        </Alert>
      )}

      {successMessage && (
        <Alert variant="success" className="mb-6" data-testid="success-message">
          <p className="font-semibold">{successMessage}</p>
        </Alert>
      )}

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-6">Algorithm Settings</h2>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Spaced Repetition Algorithm
            </label>
            <div className="grid grid-cols-3 gap-4 mb-2">
              <button
                type="button"
                onClick={() => setAlgorithm(SpacedRepetitionAlgorithm.SM2)}
                className={`p-4 border rounded-lg text-center ${
                  algorithm === SpacedRepetitionAlgorithm.SM2
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
                data-testid="algorithm-sm2"
              >
                <div className="font-medium">SM2</div>
                <div className="text-sm text-gray-500 mt-1">SuperMemo 2</div>
              </button>
              <button
                type="button"
                onClick={() => setAlgorithm(SpacedRepetitionAlgorithm.LEITNER)}
                className={`p-4 border rounded-lg text-center ${
                  algorithm === SpacedRepetitionAlgorithm.LEITNER
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
                data-testid="algorithm-leitner"
              >
                <div className="font-medium">Leitner</div>
                <div className="text-sm text-gray-500 mt-1">Box System</div>
              </button>
              <button
                type="button"
                onClick={() => setAlgorithm(SpacedRepetitionAlgorithm.CUSTOM)}
                className={`p-4 border rounded-lg text-center ${
                  algorithm === SpacedRepetitionAlgorithm.CUSTOM
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
                data-testid="algorithm-custom"
              >
                <div className="font-medium">Custom</div>
                <div className="text-sm text-gray-500 mt-1">Our algorithm</div>
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="dailyReviewLimit" className="block text-sm font-medium mb-2">
              Daily Review Limit
            </label>
            <input
              type="number"
              id="dailyReviewLimit"
              min="5"
              max="200"
              step="5"
              value={dailyReviewLimit}
              onChange={(e) => setDailyReviewLimit(Number(e.target.value))}
              className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              data-testid="daily-review-limit"
            />
            <p className="text-sm text-gray-500 mt-1">
              Maximum number of reviews to show per day
            </p>
          </div>

          <div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeNewConcepts"
                checked={includeNewConcepts}
                onChange={(e) => setIncludeNewConcepts(e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                data-testid="include-new-concepts"
              />
              <label htmlFor="includeNewConcepts" className="ml-2 block text-sm font-medium">
                Include new concepts in daily reviews
              </label>
            </div>
          </div>

          {includeNewConcepts && (
            <div>
              <label htmlFor="newConceptsPerDay" className="block text-sm font-medium mb-2">
                New Concepts Per Day
              </label>
              <input
                type="number"
                id="newConceptsPerDay"
                min="1"
                max="50"
                value={newConceptsPerDay}
                onChange={(e) => setNewConceptsPerDay(Number(e.target.value))}
                className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                data-testid="new-concepts-per-day"
              />
              <p className="text-sm text-gray-500 mt-1">
                Maximum number of new concepts to introduce per day
              </p>
            </div>
          )}
        </div>

        <div className="mt-8">
          <Button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="mr-3"
            data-testid="save-settings-button"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
          <Button
            onClick={handleBackToKnowledge}
            variant="outline"
            data-testid="back-button"
          >
            Cancel
          </Button>
        </div>
      </div>

      {/* Review History Chart */}
      <div className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Your Review Progress</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setTimeRange('week')}
              className={`px-4 py-2 rounded-md text-sm ${
                timeRange === 'week'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setTimeRange('month')}
              className={`px-4 py-2 rounded-md text-sm ${
                timeRange === 'month'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setTimeRange('year')}
              className={`px-4 py-2 rounded-md text-sm ${
                timeRange === 'year'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Year
            </button>
          </div>
        </div>
        <ReviewHistoryChart
          userId={userId}
          timeRange={timeRange}
          className="mb-8"
        />
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

          <h3 className="text-lg font-medium mt-6 mb-2">Algorithm Explanations</h3>

          <h4 className="font-medium text-md mt-4 mb-1">SM2 Algorithm</h4>
          <p className="mb-2">
            The SuperMemo 2 (SM2) algorithm is one of the most widely used spaced repetition algorithms. It was developed by Piotr Wozniak in the 1980s and forms the foundation of many modern spaced repetition systems.
          </p>
          <p className="mb-4">
            SM2 uses your confidence ratings to calculate optimal intervals between reviews. The algorithm adjusts the intervals based on how difficult you find each concept, resulting in a personalized review schedule optimized for your learning pattern.
          </p>

          <h4 className="font-medium text-md mt-4 mb-1">Leitner System</h4>
          <p className="mb-2">
            The Leitner System, developed by Sebastian Leitner in the 1970s, uses a series of boxes to implement spaced repetition. In our digital implementation:
          </p>
          <ul className="list-disc pl-5 mt-2 mb-4">
            <li>Concepts move between different &quot;boxes&quot; based on your confidence ratings</li>
            <li>Concepts in earlier boxes are reviewed more frequently</li>
            <li>Concepts in later boxes are reviewed less frequently</li>
            <li>If you rate a concept as difficult, it moves to an earlier box</li>
            <li>If you rate a concept as easy, it moves to a later box</li>
          </ul>
          <p className="mb-4">
            This system is particularly effective for beginners to spaced repetition as it&apos;s intuitive and easy to understand.
          </p>

          <h4 className="font-medium text-md mt-4 mb-1">Custom Algorithm</h4>
          <p className="mb-4">
            Our custom algorithm combines elements of SM2 and the Leitner System with additional optimizations for AI/ML concept learning. It incorporates factors such as concept complexity, interrelationships between concepts, and your learning history to create a highly personalized review schedule.
          </p>

          <h3 className="text-lg font-medium mt-6 mb-2">Scientific Background</h3>
          <p className="mb-2">
            Spaced repetition is based on the spacing effect, first documented by Hermann Ebbinghaus in the 1880s. His research showed that memory retention declines over time according to a predictable &quot;forgetting curve,&quot; but that each review strengthens the memory and slows the rate of forgetting.
          </p>
          <p className="mb-4">
            Modern research in cognitive psychology has consistently validated the effectiveness of spaced repetition for long-term information retention. Studies show that it can increase retention by 200-400% compared to mass learning (cramming).
          </p>

          <h3 className="text-lg font-medium mt-6 mb-2">Tips for Effective Use</h3>
          <ul className="list-disc pl-5 mt-2 mb-4">
            <li><strong>Be consistent</strong> - Regular, short review sessions are more effective than occasional long ones</li>
            <li><strong>Be honest</strong> - Rate your confidence accurately; the algorithm works best with truthful input</li>
            <li><strong>Keep concepts atomic</strong> - Break complex ideas into smaller, focused concepts</li>
            <li><strong>Create connections</strong> - Link related concepts to build a knowledge network</li>
            <li><strong>Review actively</strong> - Don&apos;t just read; try to recall the concept before revealing the answer</li>
          </ul>
        </div>
      </div>
    </div>
  );
}