import React from 'react';
import { render, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FilterSidebar } from '../../../components/library/filter-sidebar';
import { Filters } from '@/types/resource';

// Mock data and handlers
const mockAvailableTopics = ['react', 'typescript', 'fastapi', 'python'];
const mockSelectedFilters: Filters = {
  topics: ['react'],
  types: ['article', 'video'],
  difficulty: ['intermediate'],
};
const mockOnSearchChange = jest.fn();
const mockOnFilterChange = jest.fn();
const mockOnClose = jest.fn();

describe('FilterSidebar', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockOnSearchChange.mockClear();
    mockOnFilterChange.mockClear();
    mockOnClose.mockClear();
  });

  const renderSidebar = (props: Partial<React.ComponentProps<typeof FilterSidebar>> = {}) => {
    const defaultProps: React.ComponentProps<typeof FilterSidebar> = {
      searchTerm: '',
      onSearchChange: mockOnSearchChange,
      availableTopics: mockAvailableTopics,
      selectedFilters: mockSelectedFilters,
      onFilterChange: mockOnFilterChange,
      isOpen: true, // Keep default as true for easier mobile/transition testing
      onClose: mockOnClose,
      ...props,
    };
    // Wrap in a container for scoped querying
    return render(
      <div data-testid="sidebar-container">
        <FilterSidebar {...defaultProps} />
      </div>
    );
  };

  it('renders search input and filter sections', () => {
    const { getByTestId } = renderSidebar();
    const sidebarContainer = getByTestId('sidebar-container');

    // Query within the container for search
    expect(within(sidebarContainer).getAllByPlaceholderText(/search resources/i).length).toBeGreaterThan(0);

    // Check section headers (use getAllByRole and check length)
    expect(within(sidebarContainer).getAllByRole('heading', { name: /topics/i }).length).toBeGreaterThan(0);
    expect(within(sidebarContainer).getAllByRole('heading', { name: /resource type/i }).length).toBeGreaterThan(0);
    expect(within(sidebarContainer).getAllByRole('heading', { name: /difficulty/i }).length).toBeGreaterThan(0);

    // Check a few filter options (use getAllByLabelText and check length > 0)
    expect(within(sidebarContainer).getAllByLabelText(/react/i).length).toBeGreaterThan(0);
    expect(within(sidebarContainer).getAllByLabelText(/article/i).length).toBeGreaterThan(0);
    expect(within(sidebarContainer).getAllByLabelText(/intermediate/i).length).toBeGreaterThan(0);
  });

  it('calls onSearchChange when search input changes', () => {
    const { getByTestId } = renderSidebar({ searchTerm: 'initial' });
    const sidebarContainer = getByTestId('sidebar-container');
    // Target the first input instance (assuming mobile/visible one comes first)
    const searchInput = within(sidebarContainer).getAllByPlaceholderText(/search resources/i)[0];
    fireEvent.change(searchInput, { target: { value: 'new term' } });
    expect(mockOnSearchChange).toHaveBeenCalledTimes(1);
    expect(mockOnSearchChange).toHaveBeenCalledWith('new term');
  });

  it('renders checkboxes with correct initial state based on selectedFilters', () => {
    const { getByTestId } = renderSidebar(); // Uses mockSelectedFilters
    const sidebarContainer = getByTestId('sidebar-container');

    // Query within the container, targeting the first instance
    expect(within(sidebarContainer).getAllByLabelText(/react/i)[0]).toBeChecked();
    expect(within(sidebarContainer).getAllByLabelText(/typescript/i)[0]).not.toBeChecked();
    expect(within(sidebarContainer).getAllByLabelText(/article/i)[0]).toBeChecked();
    expect(within(sidebarContainer).getAllByLabelText(/video/i)[0]).toBeChecked();
    expect(within(sidebarContainer).getAllByLabelText(/book/i)[0]).not.toBeChecked();
    expect(within(sidebarContainer).getAllByLabelText(/intermediate/i)[0]).toBeChecked();
    expect(within(sidebarContainer).getAllByLabelText(/beginner/i)[0]).not.toBeChecked();
  });

  it('calls onFilterChange with updated topics when a topic checkbox is clicked', () => {
    const { getByTestId, rerender } = renderSidebar(); // Initial: topics: ['react']
    const sidebarContainer = getByTestId('sidebar-container');

    // Click an unselected topic (first instance)
    const tsCheckbox = within(sidebarContainer).getAllByLabelText(/typescript/i)[0];
    fireEvent.click(tsCheckbox);
    expect(mockOnFilterChange).toHaveBeenCalledTimes(1);
    expect(mockOnFilterChange).toHaveBeenCalledWith({ topics: ['react', 'typescript'] });

    mockOnFilterChange.mockClear(); // Clear mock for next interaction

    // Rerender with updated props to simulate parent update for the uncheck test
    const updatedProps = {
      searchTerm: '',
      onSearchChange: mockOnSearchChange,
      availableTopics: mockAvailableTopics,
      selectedFilters: { ...mockSelectedFilters, topics: ['react', 'typescript'] },
      onFilterChange: mockOnFilterChange,
      isOpen: true,
      onClose: mockOnClose,
    };
    rerender(
      <div data-testid="sidebar-container">
        <FilterSidebar {...updatedProps} />
      </div>
    );

    // Click a selected topic (uncheck - first instance)
    const reactCheckboxAgain = within(sidebarContainer).getAllByLabelText(/react/i)[0];
    fireEvent.click(reactCheckboxAgain);
    expect(mockOnFilterChange).toHaveBeenCalledTimes(1);
    expect(mockOnFilterChange).toHaveBeenCalledWith({ topics: ['typescript'] });
  });

  it('calls onFilterChange with updated types when a type checkbox is clicked', () => {
    const { getByTestId, rerender } = renderSidebar(); // Initial: types: ['article', 'video']
    const sidebarContainer = getByTestId('sidebar-container');

    // Click an unselected type (first instance)
    const bookCheckbox = within(sidebarContainer).getAllByLabelText(/book/i)[0];
    fireEvent.click(bookCheckbox);
    expect(mockOnFilterChange).toHaveBeenCalledTimes(1);
    expect(mockOnFilterChange).toHaveBeenCalledWith({ types: ['article', 'video', 'book'] });

    mockOnFilterChange.mockClear();

    // Rerender with updated props
    const updatedProps = {
      searchTerm: '',
      onSearchChange: mockOnSearchChange,
      availableTopics: mockAvailableTopics,
      selectedFilters: { ...mockSelectedFilters, types: ['article', 'video', 'book'] },
      onFilterChange: mockOnFilterChange,
      isOpen: true,
      onClose: mockOnClose,
    };
    rerender(
      <div data-testid="sidebar-container">
        <FilterSidebar {...updatedProps} />
      </div>
    );

    // Click a selected type (uncheck - first instance)
    const articleCheckbox = within(sidebarContainer).getAllByLabelText(/article/i)[0];
    fireEvent.click(articleCheckbox);
    expect(mockOnFilterChange).toHaveBeenCalledTimes(1);
    expect(mockOnFilterChange).toHaveBeenCalledWith({ types: ['video', 'book'] });
  });

  it('calls onFilterChange with updated difficulty when a difficulty checkbox is clicked', () => {
    const { getByTestId, rerender } = renderSidebar(); // Initial: difficulty: ['intermediate']
    const sidebarContainer = getByTestId('sidebar-container');

    // Click an unselected difficulty (first instance)
    const beginnerCheckbox = within(sidebarContainer).getAllByLabelText(/beginner/i)[0];
    fireEvent.click(beginnerCheckbox);
    expect(mockOnFilterChange).toHaveBeenCalledTimes(1);
    expect(mockOnFilterChange).toHaveBeenCalledWith({ difficulty: ['intermediate', 'beginner'] });

    mockOnFilterChange.mockClear();

    // Rerender with updated props
    const updatedProps = {
      searchTerm: '',
      onSearchChange: mockOnSearchChange,
      availableTopics: mockAvailableTopics,
      selectedFilters: { ...mockSelectedFilters, difficulty: ['intermediate', 'beginner'] },
      onFilterChange: mockOnFilterChange,
      isOpen: true,
      onClose: mockOnClose,
    };
    rerender(
      <div data-testid="sidebar-container">
        <FilterSidebar {...updatedProps} />
      </div>
    );

    // Click a selected difficulty (uncheck - first instance)
    const intermediateCheckbox = within(sidebarContainer).getAllByLabelText(/intermediate/i)[0];
    fireEvent.click(intermediateCheckbox);
    expect(mockOnFilterChange).toHaveBeenCalledTimes(1);
    expect(mockOnFilterChange).toHaveBeenCalledWith({ difficulty: ['beginner'] });
  });

  it('calls onClose when close button is clicked (mobile view assumed)', () => {
    const { getByTestId } = renderSidebar({ isOpen: true });
    const sidebarContainer = getByTestId('sidebar-container');

    // Close button should only exist once (in the mobile/transitioning sidebar)
    const closeButton = within(sidebarContainer).getByRole('button', { name: /close filters/i });
    expect(closeButton).toBeInTheDocument();

    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});