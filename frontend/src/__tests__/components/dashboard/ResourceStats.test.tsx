import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ResourceStats } from '@/components/dashboard/ResourceStats';
import { expect, jest, describe, it, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { renderWithProviders } from '@/lib/utils/test-utils';
import { ResourceStats as ResourceStatsType } from '@/types/resource';
import { useResourceStore } from '@/lib/store/resource-store';
import resourcesApi from '@/lib/api/resources';

// Mock the API module - needed for spyOn to work correctly with module functions
// jest.mock('@/lib/api/resources'); // Let's try spyOn first without mocking the whole module

// Define mock stats structure matching ResourceStatsType
const mockStatsData: ResourceStatsType = {
  total_resources: 10,
  total_completed: 5,
  total_in_progress: 5,
  completion_percentage: 50,
  articles: { completed: 1, in_progress: 1, total: 2, completion_percentage: 50 },
  videos: { completed: 1, in_progress: 1, total: 2, completion_percentage: 50 },
  courses: { completed: 1, in_progress: 1, total: 2, completion_percentage: 50 },
  books: { completed: 1, in_progress: 1, total: 2, completion_percentage: 50 },
  documentation: { completed: 1, in_progress: 0, total: 1, completion_percentage: 100 },
  tool: { completed: 0, in_progress: 1, total: 1, completion_percentage: 0 },
  other: { completed: 0, in_progress: 0, total: 0, completion_percentage: 0 },
  by_topic: { 'TypeScript': { total: 3, completed: 2 }, 'React': { total: 7, completed: 3 } },
  by_difficulty: {
    'beginner': { total: 4, completed: 2 },
    'intermediate': { total: 4, completed: 2 },
    'advanced': { total: 2, completed: 1 },
    'expert': { total: 0, completed: 0 },
  },
  recent_completions: [
    { id: '1', title: 'Intro to TS', type: 'article', url: 'http://example.com/ts', completed: true },
  ],
};

// Define empty stats matching the structure
const emptyStats: ResourceStatsType = {
  total_resources: 0,
  total_completed: 0,
  total_in_progress: 0,
  completion_percentage: 0,
  articles: { completed: 0, in_progress: 0, total: 0, completion_percentage: 0 },
  videos: { completed: 0, in_progress: 0, total: 0, completion_percentage: 0 },
  courses: { completed: 0, in_progress: 0, total: 0, completion_percentage: 0 },
  books: { completed: 0, in_progress: 0, total: 0, completion_percentage: 0 },
  documentation: { completed: 0, in_progress: 0, total: 0, completion_percentage: 0 },
  tool: { completed: 0, in_progress: 0, total: 0, completion_percentage: 0 },
  other: { completed: 0, in_progress: 0, total: 0, completion_percentage: 0 },
  by_topic: {},
  by_difficulty: {
      'beginner': { total: 0, completed: 0 },
      'intermediate': { total: 0, completed: 0 },
      'advanced': { total: 0, completed: 0 },
      'expert': { total: 0, completed: 0 },
  },
  recent_completions: [],
};

// Define a spy variable
let getStatisticsSpy: jest.SpiedFunction<typeof resourcesApi.getResourceStatistics>;

// Store original canvas context getter
let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;

describe('ResourceStats', () => {

  // Mock canvas context before all tests in this suite
  beforeAll(() => {
    originalGetContext = HTMLCanvasElement.prototype.getContext;
    // Provide a more specific mock implementation for the '2d' context
    HTMLCanvasElement.prototype.getContext = jest.fn((contextId: string) => {
        if (contextId === '2d') {
            return {
                fillRect: jest.fn(),
                clearRect: jest.fn(),
                getImageData: jest.fn(() => ({ data: [] })),
                putImageData: jest.fn(),
                createImageData: jest.fn(() => ({ data: [] })),
                setTransform: jest.fn(),
                drawImage: jest.fn(),
                save: jest.fn(),
                fillText: jest.fn(),
                restore: jest.fn(),
                beginPath: jest.fn(),
                moveTo: jest.fn(),
                lineTo: jest.fn(),
                closePath: jest.fn(),
                stroke: jest.fn(),
                translate: jest.fn(),
                scale: jest.fn(),
                rotate: jest.fn(),
                arc: jest.fn(),
                fill: jest.fn(),
                measureText: jest.fn(() => ({ width: 0 })),
                transform: jest.fn(),
                rect: jest.fn(),
                clip: jest.fn(),
                canvas: {} as HTMLCanvasElement,
            } as unknown as CanvasRenderingContext2D;
        }
        return null; // Return null for other context types
    }) as typeof originalGetContext; // Cast to the original method's type
  });

  // Restore original context after all tests
  afterAll(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
  });

  beforeEach(() => {
    // Reset mocks and store state before each test
    jest.clearAllMocks();
    useResourceStore.getState().reset();
    // Spy on the method of the default imported object
    getStatisticsSpy = jest.spyOn(resourcesApi, 'getResourceStatistics');
  });

  afterEach(() => {
      // Restore original implementation after each test
      getStatisticsSpy.mockRestore();
  });


  it('renders resource statistics correctly when data is loaded', async () => {
    // Mock the API call to resolve successfully with data
    getStatisticsSpy.mockResolvedValueOnce(mockStatsData);

    // Get container from render result
    const { container } = renderWithProviders(<ResourceStats />);

    // Wait for the component to finish loading and display the title
    await waitFor(() => {
      expect(screen.getByText('Resources Overview')).toBeInTheDocument();
    });

    // Check if the API mock was called
    expect(getStatisticsSpy).toHaveBeenCalledTimes(1);

    // Assertions check for values provided by the mocked store
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument(); // statistics.total_resources
    expect(screen.getByText('Completed')).toBeInTheDocument();
    // Use function matcher for Completed '5'
    expect(screen.getByText((content, element) => element?.tagName.toLowerCase() === 'p' && content === '5' && element.previousElementSibling?.textContent === 'Completed')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    // Use text content matching for the 'In Progress' value
    expect(screen.getByText((content, element) => element?.tagName.toLowerCase() === 'p' && content === '5' && element.previousElementSibling?.textContent === 'In Progress')).toBeInTheDocument(); // statistics.total_in_progress

    // Check if the canvas element is rendered using querySelector
    expect(container.querySelector('canvas')).toBeInTheDocument();
  });

  it('handles loading state', () => {
    // Directly set the loading state in the store for this specific test
    // No API mock needed here as we're testing the synchronous loading state render
    useResourceStore.setState({ isLoading: true });

    renderWithProviders(<ResourceStats />);

    // Check for loading element (Spinner often uses role="status")
    expect(screen.getByRole('status')).toBeInTheDocument();

    // Ensure title and stats are not rendered
    expect(screen.queryByText('Resources Overview')).not.toBeInTheDocument();
    expect(screen.queryByText('Total')).not.toBeInTheDocument();
  });

  it('handles empty data correctly', async () => {
     // Mock the API call to resolve successfully with empty data
     getStatisticsSpy.mockResolvedValueOnce(emptyStats);

    // Get container from render result
    const { container } = renderWithProviders(<ResourceStats />);

    // Wait for the component to finish loading and display the title
    await waitFor(() => {
      expect(screen.getByText('Resources Overview')).toBeInTheDocument();
    });

    // Check if the API mock was called
    expect(getStatisticsSpy).toHaveBeenCalledTimes(1);

    expect(screen.getByText('Total')).toBeInTheDocument();
    // Use getAllByText for '0' as it appears multiple times
    const zeroElements = screen.getAllByText('0');
    expect(zeroElements.length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    // Check if the canvas element is rendered using querySelector
    expect(container.querySelector('canvas')).toBeInTheDocument();
  });

  it('handles API errors', async () => {
     const apiError = 'Failed to fetch statistics';
     // Mock the API call to reject with an error
     getStatisticsSpy.mockRejectedValueOnce(new Error(apiError));

    renderWithProviders(<ResourceStats />);

    // Wait for the error message to appear (state update is async)
    await waitFor(() => {
        // The store's catch block should set the error message
        expect(screen.getByText(apiError)).toBeInTheDocument();
    });

     // Check if the API mock was called
     expect(getStatisticsSpy).toHaveBeenCalledTimes(1);

    // Check that the error alert component is used (optional, but good practice)
    expect(screen.getByRole('alert')).toBeInTheDocument();

    // Ensure title and stats are not rendered
    expect(screen.queryByText('Resources Overview')).not.toBeInTheDocument();
    expect(screen.queryByText('Total')).not.toBeInTheDocument();
  });

  it('displays no statistics message when API returns null', async () => {
    // Mock the API call to resolve successfully with undefined
    // Cast undefined to ResourceStatsType via unknown for the mock's type
    getStatisticsSpy.mockResolvedValueOnce(undefined as unknown as ResourceStatsType);

    renderWithProviders(<ResourceStats />);

    // Wait directly for the expected alert text to appear
    await waitFor(() => {
      expect(screen.getByText('No statistics available.')).toBeInTheDocument();
    });

    // Check if the API mock was called
    expect(getStatisticsSpy).toHaveBeenCalledTimes(1);

    // Ensure title and main card content are not rendered
    expect(screen.queryByText('Resources Overview')).not.toBeInTheDocument();
    expect(screen.queryByText('Total')).not.toBeInTheDocument();
  });

  it('calculates in-progress count correctly when not provided', async () => {
    // Mock data without total_in_progress
    const statsWithoutInProgress: Omit<ResourceStatsType, 'total_in_progress'> & { total_in_progress?: number } = {
      ...mockStatsData, // Use existing data as base
    };
    delete statsWithoutInProgress.total_in_progress; // Remove the property

    // Mock the API call to resolve successfully with modified data
    getStatisticsSpy.mockResolvedValueOnce(statsWithoutInProgress as ResourceStatsType);

    const { container } = renderWithProviders(<ResourceStats />);

    // Wait for the component to finish loading and display the title
    await waitFor(() => {
      expect(screen.getByText('Resources Overview')).toBeInTheDocument();
    });

    // Check if the API mock was called
    expect(getStatisticsSpy).toHaveBeenCalledTimes(1);

    // Assertions check for values, specifically the calculated In Progress
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument(); // stats.total_resources
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText((content, element) => element?.tagName.toLowerCase() === 'p' && content === '5' && element.previousElementSibling?.textContent === 'Completed')).toBeInTheDocument(); // stats.total_completed
    expect(screen.getByText('In Progress')).toBeInTheDocument();

    // Verify the calculated value (10 - 5 = 5)
    const expectedInProgress = statsWithoutInProgress.total_resources - statsWithoutInProgress.total_completed;
    expect(screen.getByText((content, element) => element?.tagName.toLowerCase() === 'p' && content === String(expectedInProgress) && element.previousElementSibling?.textContent === 'In Progress')).toBeInTheDocument();

    // Check if the canvas element is rendered
    expect(container.querySelector('canvas')).toBeInTheDocument();
  });

  // Removed the 'does not fetch if user is not authenticated' test
  // because ResourceStats component itself doesn't check auth.
  // Auth check happens higher up (e.g., in dashboard/page.tsx enabling queries,
  // or potentially within the fetchStatistics implementation itself, which is mocked here).
});