import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SpacedRepetitionOnboarding } from '@/components/knowledge/SpacedRepetitionOnboarding';
import { useRouter } from 'next/navigation';
import { expect } from '@jest/globals';

// Mock the useRouter hook
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    })
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('SpacedRepetitionOnboarding', () => {
  const mockOnClose = jest.fn();
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
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    // Check for welcome title
    expect(screen.getByText('Welcome to Spaced Repetition')).toBeInTheDocument();

    // Check for first step content
    expect(screen.getByText(/Spaced repetition is a powerful learning technique/)).toBeInTheDocument();

    // Check for navigation buttons
    expect(screen.getByTestId('next-button')).toBeInTheDocument();
    expect(screen.getByTestId('back-button')).toBeDisabled();
  });

  it('navigates through steps when Next is clicked', () => {
    render(
      <SpacedRepetitionOnboarding
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    // Initial step
    expect(screen.getByText('Welcome to Spaced Repetition')).toBeInTheDocument();

    // Click Next
    fireEvent.click(screen.getByTestId('next-button'));

    // Second step
    expect(screen.getByText('How It Works')).toBeInTheDocument();
    expect(screen.getByText(/Rate your confidence/)).toBeInTheDocument();

    // Back button should now be enabled
    expect(screen.getByTestId('back-button')).not.toBeDisabled();

    // Click Next again
    fireEvent.click(screen.getByTestId('next-button'));

    // Third step
    expect(screen.getByText('Getting Started')).toBeInTheDocument();

    // Click Next again
    fireEvent.click(screen.getByTestId('next-button'));

    // Final step
    expect(screen.getByText('Customize Your Settings')).toBeInTheDocument();
    expect(screen.getByTestId('finish-button')).toBeInTheDocument();
    expect(screen.getByTestId('go-to-settings-button')).toBeInTheDocument();
  });

  it('navigates back to previous steps when Back is clicked', () => {
    render(
      <SpacedRepetitionOnboarding
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    // Go to second step
    fireEvent.click(screen.getByTestId('next-button'));
    expect(screen.getByText('How It Works')).toBeInTheDocument();

    // Go back to first step
    fireEvent.click(screen.getByTestId('back-button'));
    expect(screen.getByText('Welcome to Spaced Repetition')).toBeInTheDocument();

    // Back button should be disabled on first step
    expect(screen.getByTestId('back-button')).toBeDisabled();
  });

  it('closes the modal and saves completion status when Finish is clicked', () => {
    render(
      <SpacedRepetitionOnboarding
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    // Go to final step
    fireEvent.click(screen.getByTestId('next-button')); // Step 2
    fireEvent.click(screen.getByTestId('next-button')); // Step 3
    fireEvent.click(screen.getByTestId('next-button')); // Step 4 (final)

    // Click Finish button
    fireEvent.click(screen.getByTestId('finish-button'));

    // Modal should be closed
    expect(mockOnClose).toHaveBeenCalled();

    // Check localStorage was updated
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'spacedRepetitionOnboardingCompleted',
      'true'
    );
  });

  it('navigates to settings when Settings button is clicked', () => {
    render(
      <SpacedRepetitionOnboarding
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    // Go to final step
    fireEvent.click(screen.getByTestId('next-button')); // Step 2
    fireEvent.click(screen.getByTestId('next-button')); // Step 3
    fireEvent.click(screen.getByTestId('next-button')); // Step 4 (final)

    // Click Go to Settings button
    fireEvent.click(screen.getByTestId('go-to-settings-button'));

    // Modal should be closed
    expect(mockOnClose).toHaveBeenCalled();

    // Router should navigate to settings
    expect(mockPush).toHaveBeenCalledWith('/knowledge/settings');
  });
});