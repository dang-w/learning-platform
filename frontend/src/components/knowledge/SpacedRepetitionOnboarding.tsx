'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/buttons';
import { tokenService } from '@/lib/services/token-service';

interface SpacedRepetitionOnboardingProps {
  onComplete: () => void;
}

export function SpacedRepetitionOnboarding({ onComplete }: SpacedRepetitionOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: 'Welcome to Spaced Repetition',
      description: 'Learn how to effectively manage and retain your AI/ML knowledge using spaced repetition.',
      image: '/images/spaced-repetition-intro.svg',
    },
    {
      title: 'Create Concepts',
      description: 'Start by creating concepts for the topics you want to learn and remember.',
      image: '/images/create-concepts.svg',
    },
    {
      title: 'Review Regularly',
      description: 'Review concepts at optimal intervals to strengthen your memory and understanding.',
      image: '/images/review-concepts.svg',
    },
    {
      title: 'Track Progress',
      description: 'Monitor your learning progress and adjust your review schedule as needed.',
      image: '/images/track-progress.svg',
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      tokenService.setMetadata('spacedRepetitionOnboardingCompleted', true);
      onComplete();
    }
  };

  const handleSkip = () => {
    tokenService.setMetadata('spacedRepetitionOnboardingCompleted', true);
    onComplete();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-gray-900">
                {steps[currentStep].title}
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {steps[currentStep].description}
              </p>
            </div>

            <div className="relative">
              <img
                src={steps[currentStep].image}
                alt={steps[currentStep].title}
                className="w-full h-48 object-contain"
              />
            </div>

            <div className="flex justify-between items-center">
              <Button
                onClick={handleSkip}
                variant="outline"
                className="text-sm"
              >
                Skip Tutorial
              </Button>
              <Button
                onClick={handleNext}
                className="text-sm"
              >
                {currentStep < steps.length - 1 ? 'Next' : 'Get Started'}
              </Button>
            </div>

            <div className="flex justify-center space-x-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 w-2 rounded-full ${
                    index === currentStep ? 'bg-indigo-600' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}