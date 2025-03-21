import React, { useState } from 'react';
import { Modal } from '@/components/ui/layout/modal';
import { Button } from '@/components/ui/buttons';
import { useRouter } from 'next/navigation';

interface SpacedRepetitionOnboardingProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SpacedRepetitionOnboarding({ isOpen, onClose }: SpacedRepetitionOnboardingProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: 'Welcome to Spaced Repetition',
      content: (
        <div className="space-y-4">
          <p>
            Spaced repetition is a powerful learning technique that helps you remember information
            more effectively by reviewing it at optimal intervals.
          </p>
          <p>
            This system is particularly effective for learning AI/ML concepts that
            require long-term retention and understanding.
          </p>
          <div className="flex justify-center">
            <img
              src="/images/spaced-repetition-curve.svg"
              alt="Forgetting curve with spaced repetition"
              className="max-w-md my-4"
              onError={(e) => {e.currentTarget.style.display = 'none'}}
            />
          </div>
        </div>
      )
    },
    {
      title: 'How It Works',
      content: (
        <div className="space-y-4">
          <p>
            The spaced repetition system schedules reviews based on how well you know each concept:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Rate your confidence</strong> after each review on a scale of 1-5
            </li>
            <li>
              <strong>Easy concepts</strong> are reviewed less frequently (longer intervals)
            </li>
            <li>
              <strong>Difficult concepts</strong> are reviewed more often (shorter intervals)
            </li>
            <li>
              Over time, the intervals <strong>automatically adjust</strong> to optimize your retention
            </li>
          </ul>
          <p className="text-sm text-gray-600 italic mt-4">
            The system uses proven algorithms like SM2 and Leitner that are backed by cognitive science research.
          </p>
        </div>
      )
    },
    {
      title: 'Getting Started',
      content: (
        <div className="space-y-4">
          <p>
            To begin using spaced repetition:
          </p>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Create knowledge concepts you want to learn</li>
            <li>Review your first concepts</li>
            <li>Rate your confidence after each review</li>
            <li>Return regularly to review concepts as they become due</li>
          </ol>
          <p className="mt-4">
            Consistency is key! Even 10-15 minutes of daily review can lead to dramatic improvements in retention.
          </p>
        </div>
      )
    },
    {
      title: 'Customize Your Settings',
      content: (
        <div className="space-y-4">
          <p>
            You can customize your spaced repetition experience in the settings:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Algorithm:</strong> Choose between SM2, Leitner, or Custom scheduling
            </li>
            <li>
              <strong>Daily review limit:</strong> Set how many reviews to show per day
            </li>
            <li>
              <strong>Include new concepts:</strong> Decide if new concepts should be mixed with reviews
            </li>
          </ul>
          <p className="mt-4">
            We recommend starting with the default settings and adjusting as you become familiar with the system.
          </p>
        </div>
      )
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = () => {
    onClose();
    // Store in localStorage that the user has completed onboarding
    if (typeof window !== 'undefined') {
      localStorage.setItem('spacedRepetitionOnboardingCompleted', 'true');
    }
  };

  const handleGoToSettings = () => {
    onClose();
    router.push('/knowledge/settings');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={steps[currentStep].title}
      size="lg"
    >
      <div className="py-4">
        {/* Progress indicator */}
        <div className="flex justify-center mb-6">
          <div className="flex space-x-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-8 rounded-full ${
                  index === currentStep
                    ? 'bg-indigo-600'
                    : index < currentStep
                    ? 'bg-indigo-300'
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="min-h-[15rem]" data-testid="onboarding-content">
          {steps[currentStep].content}
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between mt-8">
          <Button
            onClick={handleBack}
            variant="outline"
            disabled={currentStep === 0}
            data-testid="back-button"
          >
            Back
          </Button>
          <div className="space-x-2">
            {currentStep === steps.length - 1 ? (
              <>
                <Button
                  onClick={handleGoToSettings}
                  variant="outline"
                  data-testid="go-to-settings-button"
                >
                  Go to Settings
                </Button>
                <Button onClick={handleFinish} data-testid="finish-button">
                  Get Started
                </Button>
              </>
            ) : (
              <Button onClick={handleNext} data-testid="next-button">
                Next
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}