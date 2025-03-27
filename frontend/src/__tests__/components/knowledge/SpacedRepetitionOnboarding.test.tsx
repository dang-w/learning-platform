import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SpacedRepetitionOnboarding } from '@/components/knowledge/SpacedRepetitionOnboarding';
import { useRouter } from 'next/navigation';
import { expect } from '@jest/globals';
import { tokenService } from '@/lib/services/token-service';

// Mock the useRouter hook
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}));

// Mock tokenService
jest.mock('@/lib/services/token-service', () => ({
  tokenService: {
    getMetadata: jest.fn(),
    setMetadata: jest.fn(),
  }
}));

describe('SpacedRepetitionOnboarding', () => {
  const mockOnComplete = jest.fn();
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush
    });
  });

  it('renders the initial step correctly', () => {
    render(
      <SpacedRepetitionOnboarding
        onComplete={mockOnComplete}
      />
    );

    // Check for welcome title
    expect(screen.getByText('Welcome to Spaced Repetition')).toBeInTheDocument();

    // Check for first step content
    expect(screen.getByText(/Learn how to effectively manage/)).toBeInTheDocument();

    // Check for navigation buttons
    expect(screen.getByText('Next')).toBeInTheDocument();
    expect(screen.getByText('Skip Tutorial')).toBeInTheDocument();
  });

  it('navigates through steps when Next is clicked', () => {
    render(
      <SpacedRepetitionOnboarding
        onComplete={mockOnComplete}
      />
    );

    // Initial step
    expect(screen.getByText('Welcome to Spaced Repetition')).toBeInTheDocument();

    // Click Next
    fireEvent.click(screen.getByText('Next'));

    // Second step
    expect(screen.getByText('Create Concepts')).toBeInTheDocument();

    // Click Next again
    fireEvent.click(screen.getByText('Next'));

    // Third step
    expect(screen.getByText('Review Regularly')).toBeInTheDocument();

    // Click Next again
    fireEvent.click(screen.getByText('Next'));

    // Final step
    expect(screen.getByText('Track Progress')).toBeInTheDocument();
    expect(screen.getByText('Get Started')).toBeInTheDocument();
  });

  it('completes onboarding when Get Started is clicked', () => {
    render(
      <SpacedRepetitionOnboarding
        onComplete={mockOnComplete}
      />
    );

    // Go to final step
    fireEvent.click(screen.getByText('Next')); // Step 2
    fireEvent.click(screen.getByText('Next')); // Step 3
    fireEvent.click(screen.getByText('Next')); // Step 4 (final)

    // Click Get Started button
    fireEvent.click(screen.getByText('Get Started'));

    // onComplete should be called
    expect(mockOnComplete).toHaveBeenCalled();

    // Check tokenService was updated
    expect(tokenService.setMetadata).toHaveBeenCalledWith(
      'spacedRepetitionOnboardingCompleted',
      true
    );
  });

  it('completes onboarding when Skip Tutorial is clicked', () => {
    render(
      <SpacedRepetitionOnboarding
        onComplete={mockOnComplete}
      />
    );

    // Click Skip Tutorial button
    fireEvent.click(screen.getByText('Skip Tutorial'));

    // onComplete should be called
    expect(mockOnComplete).toHaveBeenCalled();

    // Check tokenService was updated
    expect(tokenService.setMetadata).toHaveBeenCalledWith(
      'spacedRepetitionOnboardingCompleted',
      true
    );
  });
});