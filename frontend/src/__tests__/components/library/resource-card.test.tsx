import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ResourceCard } from '../../../components/library/resource-card';
import { Resource } from '@/types/resource'; // Assuming types are correctly path aliased

// Mock data for a basic resource
const mockResource: Resource = {
  id: '1',
  title: 'Test Resource Title',
  url: 'http://example.com',
  type: 'article',
  description: 'This is a test description.',
  difficulty: 'beginner',
  estimated_time: 30,
  topics: ['Testing', 'React'],
  completed: false,
};

// Mock handler functions
const mockToggleComplete = jest.fn();
const mockEditNote = jest.fn();

describe('ResourceCard', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockToggleComplete.mockClear();
    mockEditNote.mockClear();
  });

  it('renders correctly with basic resource data', () => {
    render(
      <ResourceCard
        resource={mockResource}
        onToggleComplete={mockToggleComplete}
        onEditNote={mockEditNote}
      />
    );

    // Check title is rendered and is a link
    const titleLink = screen.getByRole('link', { name: /test resource title/i });
    expect(titleLink).toBeInTheDocument();
    expect(titleLink).toHaveAttribute('href', mockResource.url);

    // Check description
    expect(screen.getByText(mockResource.description!)).toBeInTheDocument();

    // Check type
    expect(screen.getByText(mockResource.type)).toBeInTheDocument();

    // Check difficulty
    expect(screen.getByText(/difficulty: beginner/i)).toBeInTheDocument();

    // Check estimated time
    expect(screen.getByText(/est. time: 30 min/i)).toBeInTheDocument();

    // Check topics
    expect(screen.getByText('Testing')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();

    // Check buttons are present
    expect(screen.getByRole('button', { name: /mark complete/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add note/i })).toBeInTheDocument();
  });

  it('does not render optional fields if they are missing', () => {
    const resourceWithoutOptionals: Resource = {
      ...mockResource,
      description: undefined,
      difficulty: undefined,
      estimated_time: undefined,
      topics: [], // Empty array for topics
    };
    render(
      <ResourceCard
        resource={resourceWithoutOptionals}
        onToggleComplete={mockToggleComplete}
        onEditNote={mockEditNote}
      />
    );

    expect(screen.queryByText(mockResource.description!)).not.toBeInTheDocument();
    expect(screen.queryByText(/difficulty:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/est. time:/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Testing')).not.toBeInTheDocument(); // Check a specific topic isn't there
  });

  it('displays topics correctly', () => {
    render(
        <ResourceCard
          resource={mockResource}
          onToggleComplete={mockToggleComplete}
          onEditNote={mockEditNote}
        />
      );
    const topicElements = screen.getAllByText(/Testing|React/); // Find elements containing either topic text
    expect(topicElements).toHaveLength(2);
    expect(screen.getByText('Testing')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
  });

  it('calls onToggleComplete with correct arguments when Mark Complete button is clicked', () => {
    render(
      <ResourceCard
        resource={mockResource} // completed: false
        onToggleComplete={mockToggleComplete}
        onEditNote={mockEditNote}
      />
    );
    const completeButton = screen.getByRole('button', { name: /mark complete/i });
    fireEvent.click(completeButton);
    expect(mockToggleComplete).toHaveBeenCalledTimes(1);
    expect(mockToggleComplete).toHaveBeenCalledWith(mockResource.id, false, mockResource.type);
  });

  it('calls onToggleComplete with correct arguments when Completed button is clicked', () => {
    const completedResource = { ...mockResource, completed: true };
    render(
      <ResourceCard
        resource={completedResource}
        onToggleComplete={mockToggleComplete}
        onEditNote={mockEditNote}
      />
    );
    const completedButton = screen.getByRole('button', { name: /completed/i });
    fireEvent.click(completedButton);
    expect(mockToggleComplete).toHaveBeenCalledTimes(1);
    expect(mockToggleComplete).toHaveBeenCalledWith(completedResource.id, true, completedResource.type);
  });

  it('calls onEditNote with the resource when Add/Edit Note button is clicked', () => {
    render(
      <ResourceCard
        resource={mockResource}
        onToggleComplete={mockToggleComplete}
        onEditNote={mockEditNote}
      />
    );
    const noteButton = screen.getByRole('button', { name: /add note/i });
    fireEvent.click(noteButton);
    expect(mockEditNote).toHaveBeenCalledTimes(1);
    expect(mockEditNote).toHaveBeenCalledWith(mockResource);
  });

  it('displays completed state correctly', () => {
    const completedResource = {
      ...mockResource,
      completed: true,
      completion_date: new Date().toISOString(),
    };
    render(
      <ResourceCard
        resource={completedResource}
        onToggleComplete={mockToggleComplete}
        onEditNote={mockEditNote}
      />
    );
    expect(screen.getByRole('button', { name: /completed/i })).toBeInTheDocument();
    // Check for visual cue if specific class is used, e.g., background/border
    // const cardElement = screen.getByText(completedResource.title).closest('div[class*="border"]'); // Find parent div with border class
    // expect(cardElement).toHaveClass('bg-green-50'); // Or check specific style
    // expect(cardElement).toHaveClass('border-green-300');

    // Check completion date is displayed
    const expectedDate = new Date(completedResource.completion_date).toLocaleDateString();
    expect(screen.getByText(`Completed on: ${expectedDate}`)).toBeInTheDocument();
  });

  it('displays loading state correctly', () => {
    render(
      <ResourceCard
        resource={mockResource}
        onToggleComplete={mockToggleComplete}
        onEditNote={mockEditNote}
        isLoading={true}
      />
    );
    const completeButton = screen.getByRole('button', { name: /mark complete/i });
    const noteButton = screen.getByRole('button', { name: /add note/i });

    expect(completeButton).toBeDisabled();
    expect(noteButton).toBeDisabled();

    // Check for loading icons (may need more specific selectors if icons change)
    // const loadingIcons = screen.getAllByTestId('loading-icon'); // Assuming icons have data-testid
    // expect(loadingIcons.length).toBeGreaterThan(0);

    // Check for presence of elements with 'animate-spin' class within the buttons
    const buttons = screen.getAllByRole('button');
    const spinningIcons = buttons.map(button => button.querySelector('svg.animate-spin')).filter(Boolean);
    expect(spinningIcons.length).toBeGreaterThan(0);
    // expect(screen.getAllByRole('button').some(button => button.querySelector('svg.animate-spin'))).toBe(true); // Simpler check if just one is needed
  });

  it('displays "Edit Note" when resource has notes', () => {
    const resourceWithNotes = { ...mockResource, notes: 'These are some notes.' };
    render(
      <ResourceCard
        resource={resourceWithNotes}
        onToggleComplete={mockToggleComplete}
        onEditNote={mockEditNote}
      />
    );
    expect(screen.getByRole('button', { name: /edit note/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add note/i })).not.toBeInTheDocument();
  });

  // Add more tests here for interactions, loading state, completed state etc.
});