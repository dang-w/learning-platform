import React from 'react';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import LibraryPage from '../../app/library/page'; // Assuming default export
import { Resource } from '@/types/resource';

// Mock the FilterSidebar and ResourceCard to simplify page testing
// We've already tested these components individually
jest.mock('@/components/library/filter-sidebar', () => ({
  FilterSidebar: jest.fn(({
    searchTerm,
    onSearchChange,
    selectedFilters,
    onFilterChange,
    availableTopics,
    isOpen,
    onClose
  }) => (
    <div data-testid="filter-sidebar">
      <input
        data-testid="search-input"
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search resources..."
      />
      {/* Simple mock checkboxes for testing filter changes */}
      <div>Topics: {availableTopics.join(', ')}</div>
      <button data-testid="filter-topic-react" onClick={() => onFilterChange({ topics: selectedFilters.topics?.includes('react') ? [] : ['react'] })}>Toggle React Topic</button>
      <button data-testid="filter-type-article" onClick={() => onFilterChange({ types: selectedFilters.types?.includes('article') ? [] : ['article'] })}>Toggle Article Type</button>
      <button data-testid="filter-difficulty-beginner" onClick={() => onFilterChange({ difficulty: selectedFilters.difficulty?.includes('beginner') ? [] : ['beginner'] })}>Toggle Beginner Difficulty</button>
      {isOpen && <button data-testid="sidebar-close-button" onClick={onClose}>Close Sidebar</button>}
    </div>
  )),
}));

jest.mock('@/components/library/resource-card', () => ({
  ResourceCard: jest.fn(({ resource, onToggleComplete, onEditNote, isLoading }) => (
    <div data-testid={`resource-card-${resource.id}`}>
      <h3>{resource.title}</h3>
      <button data-testid={`complete-button-${resource.id}`} onClick={() => onToggleComplete(resource.id, !!resource.completed, resource.type)} disabled={isLoading}>
        {resource.completed ? 'Completed' : 'Mark Complete'}
      </button>
      <button data-testid={`note-button-${resource.id}`} onClick={() => onEditNote(resource)} disabled={isLoading}>
        {resource.notes ? 'Edit Note' : 'Add Note'}
      </button>
      {isLoading && <span>Card Loading...</span>}
    </div>
  )),
}));

// Mock timers for debounce
jest.useFakeTimers();

// Mock data
const mockTopics = ['react', 'typescript', 'testing'];
const mockCentralResourcesPage1: Resource[] = [
  { id: 'c1', title: 'Central Resource 1', url: '#', type: 'article', topics: ['react'], completed: false },
  { id: 'c2', title: 'Central Resource 2', url: '#', type: 'video', topics: ['typescript'], completed: true, completion_date: '2023-01-01T00:00:00Z' },
];
const mockCentralResourcesPage2: Resource[] = [
  { id: 'c3', title: 'Central Resource 3', url: '#', type: 'course', topics: ['react', 'testing'], completed: false },
];
const mockUserResources: Resource[] = [
  { id: 'u1', title: 'User Resource 1', url: '#', type: 'book', topics: ['testing'], completed: false, notes: 'My notes' },
];

// Helper to create mock fetch response
const mockFetchResponse = (body: unknown, headers?: HeadersInit, ok = true, status = 200) => {
  const responseHeaders = new Headers({
    'Content-Type': 'application/json',
    ...headers,
  });
  return Promise.resolve({
    ok,
    status,
    headers: responseHeaders,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)), // Added for potential error handling
  } as Response);
};

const mockFetchError = (status = 500, statusText = 'Internal Server Error') => {
  return Promise.resolve({
    ok: false,
    status,
    statusText,
    headers: new Headers(),
    json: () => Promise.reject(new Error(statusText)), // Mock API error response if needed
    text: () => Promise.resolve(statusText),
  } as Response);
};


describe('LibraryPage', () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    // Reset mocks and fetch spy before each test
    fetchSpy = jest.spyOn(global, 'fetch');

    // Default mock implementation for fetch
    fetchSpy.mockImplementation((url): Promise<Response> => {
      const urlString = url.toString();
      if (urlString.includes('/api/resources/topics')) {
        return mockFetchResponse(mockTopics);
      }
      if (urlString.includes('/api/resources/library')) {
        const urlParams = new URLSearchParams(urlString.split('?')[1]);
        const page = parseInt(urlParams.get('page') || '1', 10);
        const data = page === 1 ? mockCentralResourcesPage1 : mockCentralResourcesPage2;
        return mockFetchResponse(data, { 'X-Total-Pages': '2' });
      }
      if (urlString.includes('/api/resources/user')) {
        return mockFetchResponse(mockUserResources, { 'X-Total-Pages': '1' });
      }
      // Mock successful PATCH/PUT by default
       if (urlString.startsWith('/api/resources/library/') ||
           urlString.includes('/complete') ||
           urlString.match(/\/api\/resources\/(article|video|book|course|tool|documentation|other)\/[^/]+\/?$/)) { // Match PUT for user notes
           return mockFetchResponse({ success: true }); // Generic success for actions
       }

      console.warn(`Unhandled fetch request in test: ${urlString}`);
      return mockFetchError(404, 'Not Found');
    });
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    jest.clearAllTimers();
  });

  it('renders loading state initially, fetches topics and initial central resources', async () => {
    const { container } = render(<LibraryPage />); // Get container for querySelectorAll

    // Check for initial loading state (divs with animate-pulse)
    expect(screen.queryAllByRole('status').length).toBe(0); // Ensure role=status isn't found
    // Use querySelectorAll as a more direct way to find by class
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);

    // Wait for topics and initial resources to load
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith('/api/resources/topics');
      expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('/api/resources/library?page=1&limit='));
    });

    // Check that loading state is removed and resources are displayed
    await waitFor(() => {
      expect(container.querySelectorAll('.animate-pulse').length).toBe(0);
      expect(screen.getByTestId('resource-card-c1')).toBeInTheDocument();
      expect(screen.getByTestId('resource-card-c2')).toBeInTheDocument();
    });

    // Check that FilterSidebar received the topics
    expect(screen.getByTestId('filter-sidebar')).toHaveTextContent(/Topics: react, typescript, testing/i);
  });

  it('switches to user resources view and fetches user data', async () => {
    const { container } = render(<LibraryPage />); // Get container

    // Wait for initial central load
    await waitFor(() => {
      expect(screen.getByTestId('resource-card-c1')).toBeInTheDocument();
    });

    // Find and click the 'My Resources' button
    const userViewButton = screen.getByRole('button', { name: /my resources/i });
    fireEvent.click(userViewButton);

    // Check for loading state during switch (animate-pulse)
    await waitFor(() => {
        expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    });

    // Wait for fetch to be called for user resources
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('/api/resources/user?page=1&limit='));
    });

    // Check that loading state is removed and user resources are displayed
    await waitFor(() => {
        expect(container.querySelectorAll('.animate-pulse').length).toBe(0);
        expect(screen.getByTestId('resource-card-u1')).toBeInTheDocument();
      // Ensure central resources are gone
      expect(screen.queryByTestId('resource-card-c1')).not.toBeInTheDocument();
    });

    // Switch back to Central Library
    const centralViewButton = screen.getByRole('button', { name: /central library/i });
    fireEvent.click(centralViewButton);

    // Wait for fetch to be called for central resources again
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('/api/resources/library?page=1&limit='));
    });

    // Check central resources are displayed again
    await waitFor(() => {
      expect(screen.getByTestId('resource-card-c1')).toBeInTheDocument();
      expect(screen.queryByTestId('resource-card-u1')).not.toBeInTheDocument();
    });
  });

  it('fetches resources with search term after debounce', async () => {
    render(<LibraryPage />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('resource-card-c1')).toBeInTheDocument();
    });

    // Clear the initial fetch calls for easier assertion later
    fetchSpy.mockClear();

    // Find the mocked search input and simulate typing
    const searchInput = screen.getByTestId('search-input');
    fireEvent.change(searchInput, { target: { value: 'testing' } });

    // Assert fetch hasn't been called yet due to debounce
    expect(fetchSpy).not.toHaveBeenCalled();

    // --- Start: Fix for Search Test Fetch Mock ---
    // Set up the mock *before* advancing timers so it applies to the upcoming fetch
    fetchSpy.mockImplementation((url): Promise<Response> => {
         const urlString = url.toString();
         if (urlString.includes('/api/resources/library') && urlString.includes('search=testing')) {
             // Return the specific resource expected for this search
             return mockFetchResponse([
                  { id: 'c3', title: 'Central Resource 3', url: '#', type: 'course', topics: ['react', 'testing'], completed: false }
             ], { 'X-Total-Pages': '1' });
         }
         // Fallback for other calls (e.g., topics if somehow re-fetched)
         if (urlString.includes('/api/resources/topics')) {
           return mockFetchResponse(mockTopics);
         }
         console.warn(`Unhandled fetch in search test mock: ${urlString}`);
         // Return empty array if library is called without the expected search term
         if (urlString.includes('/api/resources/library')) {
            return mockFetchResponse([], { 'X-Total-Pages': '0' });
         }
         return mockFetchError(404, 'Not Found');
     });
    // --- End: Fix for Search Test Fetch Mock ---

    // Advance timers past the debounce delay (DEBOUNCE_DELAY is 500ms in component)
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Assert fetch was called with the search term and page reset
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/resources/library?search=testing&page=1&limit=')
      );
    });

    // Update mock to return filtered data for the *next* call triggered by state update
    fetchSpy.mockImplementation((url): Promise<Response> => {
         const urlString = url.toString();
         if (urlString.includes('/api/resources/library') && urlString.includes('search=testing')) {
             return mockFetchResponse([
                  { id: 'c3', title: 'Central Resource 3', url: '#', type: 'course', topics: ['react', 'testing'], completed: false }
             ], { 'X-Total-Pages': '1' });
         }
         // Keep original mocks for other potential calls like topics
         if (urlString.includes('/api/resources/topics')) {
           return mockFetchResponse(mockTopics);
         }
         // Default empty/error for others in this specific test scope
         console.warn(`Unhandled fetch in search test (after search): ${urlString}`);
         return mockFetchResponse([], { 'X-Total-Pages': '0' });
     });

    // Re-trigger search
    fireEvent.change(searchInput, { target: { value: 'testing' } });
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Check that only the filtered resource is displayed after state update triggers re-render and fetch
    await waitFor(() => {
        expect(screen.getByTestId('resource-card-c3')).toBeInTheDocument();
        expect(screen.queryByTestId('resource-card-c1')).not.toBeInTheDocument();
    });
  });

  it('fetches resources with selected filters', async () => {
    render(<LibraryPage />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('resource-card-c1')).toBeInTheDocument();
    });

    fetchSpy.mockClear();

    // Simulate clicking the 'React' topic filter button (using the mock sidebar)
    const topicButton = screen.getByTestId('filter-topic-react');
    fireEvent.click(topicButton);

    // Assert fetch was called immediately with the topic filter and page reset
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/resources/library?topic=react&page=1&limit=10')
      );
    });

    fetchSpy.mockClear();

    // Simulate clicking the 'Article' type filter button
    const typeButton = screen.getByTestId('filter-type-article');
    fireEvent.click(typeButton);

    // Assert fetch was called with both filters (assuming filters are additive)
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      // Note: The order of params might vary, stringContaining is safer
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('topic=react')
      );
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('type=article')
      );
       expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('page=1')
      );
    });

     // Optionally: Test unchecking a filter
     fetchSpy.mockClear();
     // Click React topic again to uncheck
     fireEvent.click(topicButton);
     await waitFor(() => {
       expect(fetchSpy).toHaveBeenCalledTimes(1);
       // Should only have type filter now
       expect(fetchSpy).toHaveBeenCalledWith(
         expect.stringContaining('/api/resources/library?type=article&page=1&limit=')
       );
       expect(fetchSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('topic=react')
       );
     });
  });

  it('handles pagination correctly', async () => {
    render(<LibraryPage />);

    // Wait for initial load (page 1)
    await waitFor(() => {
      expect(screen.getByTestId('resource-card-c1')).toBeInTheDocument();
      expect(screen.getByTestId('resource-card-c2')).toBeInTheDocument();
    });

    // Check initial pagination state (assuming buttons have these names/roles)
    const nextButton = screen.getByRole('button', { name: /next/i });
    const prevButton = screen.getByRole('button', { name: /previous/i });
    expect(prevButton).toBeDisabled();
    expect(nextButton).toBeEnabled();

    fetchSpy.mockClear();

    // Click Next
    fireEvent.click(nextButton);

    // Assert fetch was called for page 2
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/resources/library?page=2&limit=')
      );
    });

    // Check that page 2 data is displayed
    await waitFor(() => {
      expect(screen.getByTestId('resource-card-c3')).toBeInTheDocument();
      expect(screen.queryByTestId('resource-card-c1')).not.toBeInTheDocument(); // Ensure page 1 data is gone
    });

    // Check updated pagination state (page 2 of 2 based on mock)
    // Re-find buttons as component might re-render
    const nextButtonPage2 = screen.getByRole('button', { name: /next/i });
    const prevButtonPage2 = screen.getByRole('button', { name: /previous/i });
    expect(prevButtonPage2).toBeEnabled();
    expect(nextButtonPage2).toBeDisabled(); // We are on the last page (2)

    fetchSpy.mockClear();

    // Click Previous
    fireEvent.click(prevButtonPage2);

    // Assert fetch was called for page 1
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/resources/library?page=1&limit=')
      );
    });

    // Check that page 1 data is displayed again
    await waitFor(() => {
      expect(screen.getByTestId('resource-card-c1')).toBeInTheDocument();
      expect(screen.getByTestId('resource-card-c2')).toBeInTheDocument();
      expect(screen.queryByTestId('resource-card-c3')).not.toBeInTheDocument();
    });

    // Check pagination state is back to initial
    const nextButtonPage1 = screen.getByRole('button', { name: /next/i });
    const prevButtonPage1 = screen.getByRole('button', { name: /previous/i });
    expect(prevButtonPage1).toBeDisabled();
    expect(nextButtonPage1).toBeEnabled();
  });

  it('handles marking a central resource as complete', async () => {
    render(<LibraryPage />);
    // Wait for initial central load
    await waitFor(() => {
      expect(screen.getByTestId('resource-card-c1')).toBeInTheDocument();
    });

    fetchSpy.mockClear();

    // Find the "Mark Complete" button for the first resource
    const completeButton = screen.getByTestId('complete-button-c1');
    expect(completeButton).toHaveTextContent(/mark complete/i);

    // Click the button
    fireEvent.click(completeButton);

    // Assert PATCH request was made correctly
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/resources/library/c1/status',
        expect.objectContaining({
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completed: true }),
        })
      );
    });

    // Assert UI update (button text changes)
    // Note: This assumes the mock fetch resolves successfully and the UI updates
    await waitFor(() => {
      // Re-find the button as it might have re-rendered
      const updatedButton = screen.getByTestId('complete-button-c1');
      expect(updatedButton).toHaveTextContent(/completed/i);
      // Also check if the mock card component displayed loading state if applicable
      // expect(within(screen.getByTestId('resource-card-c1')).queryByText(/card loading/i)).not.toBeInTheDocument();
    });
  });

  it('handles opening note editor, editing, and saving note for a user resource', async () => {
    fetchSpy.mockImplementation(async (url, options) => {
      const urlString = url.toString();
      const method = options?.method?.toUpperCase() || 'GET';
      console.log(`[TEST DEBUG] Fetching: ${method} ${urlString}`);

      // Initial central fetch - CORRECTED condition
      if (urlString.includes('/api/resources/library') && method === 'GET') {
        console.log('[TEST DEBUG] Mocking library resource fetch');
        return mockFetchResponse(mockCentralResourcesPage1, { 'X-Total-Pages': '1' });
      }
      // User resource fetch (occurs *after* button click)
      if (urlString.includes('/api/resources/user') && method === 'GET') {
        console.log('[TEST DEBUG] Mocking user resource fetch');
        return mockFetchResponse(mockUserResources, { 'X-Total-Pages': '1' });
      }
      // PUT request for saving the note
      if (urlString.includes('/api/resources/book/u1') && method === 'PUT') {
        console.log('[TEST DEBUG] Mocking PUT request for user resource u1');
        const body = JSON.parse(options?.body as string);
        expect(body).toEqual({ notes: 'Updated Note Content' });
        // Return the updated resource or just success
        return mockFetchResponse({ ...mockUserResources[0], notes: 'Updated Note Content' });
      }
      console.error(`[TEST DEBUG] Unhandled fetch: ${method} ${urlString}`);
      return mockFetchError(404, `Unhandled request: ${urlString}`);
    });

    render(<LibraryPage />);
    // Wait for initial central resources
    await waitFor(() => expect(screen.getByTestId('resource-card-c1')).toBeInTheDocument());

    // Switch to user view
    fireEvent.click(screen.getByRole('button', { name: /my resources/i }));

    // Wait for user resource to load (fetch mock will handle the /api/resources/user call now)
    await waitFor(() => {
      expect(screen.getByTestId('resource-card-u1')).toBeInTheDocument();
    });

    // Find and click the note button (should be "Edit Note" initially)
    const noteButton = screen.getByTestId('note-button-u1');
    expect(noteButton).toHaveTextContent(/edit note/i);
    fireEvent.click(noteButton);

    // Check if modal appears using its title
    await waitFor(() => {
      expect(screen.getByText(/Edit Note for: User Resource 1/i)).toBeInTheDocument();
    });

    // Find the textarea and simulate typing
    const noteTextarea = screen.getByPlaceholderText("Enter your notes here...");
    expect(noteTextarea).toHaveValue('My notes'); // Check initial value
    fireEvent.change(noteTextarea, { target: { value: 'Updated Note Content' } });
    expect(noteTextarea).toHaveValue('Updated Note Content');

    fetchSpy.mockClear(); // Clear previous fetch calls

    // Find and click the Save button within the modal
    const saveButton = screen.getByRole('button', { name: /save note/i });
    fireEvent.click(saveButton);

    // Assert PUT request was made correctly for user resource
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/resources/book/u1', // Note: type 'book' is from mock data
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          // Body should contain the entire resource with the updated note
          body: JSON.stringify({ ...mockUserResources[0], notes: 'Updated Note Content' }),
        })
      );
    });

    // Assert modal closes
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /edit notes/i })).not.toBeInTheDocument();
    });

    // Optionally: Check if the note button text on the card reflects the change (might need to re-find)
    // This depends on whether the parent component updates the resource data passed to the card
    // await waitFor(() => {
    //   const updatedNoteButton = screen.getByTestId('note-button-u1');
    //   expect(updatedNoteButton).toHaveTextContent(/edit note/i); // Still edit, but confirms re-render potentially
    // });
  });

  it('displays an error message when fetching resources fails', async () => {
    // Override fetch mock to simulate an error for the library fetch
    fetchSpy.mockImplementation((url): Promise<Response> => {
      const urlString = url.toString();
      if (urlString.includes('/api/resources/topics')) {
        return mockFetchResponse(mockTopics); // Topics fetch succeeds
      }
      if (urlString.includes('/api/resources/library')) {
        return mockFetchError(500, 'Internal Server Error'); // Simulate library fetch failure
      }
      // Fallback for other potential calls
      console.warn(`Unhandled fetch request in error test: ${urlString}`);
      return mockFetchError(404, 'Not Found');
    });

    const { container } = render(<LibraryPage />);

    // Check for loading state initially (animate-pulse)
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);

    // Wait for the fetch to fail and error message to appear
    await waitFor(() => {
      // Check for the specific error message div using data-testid
      const errorElement = screen.getByTestId('fetch-error-message');
      expect(errorElement).toBeInTheDocument();
      expect(errorElement).toHaveTextContent(/failed to fetch resources: internal server error/i);
    });

    // Ensure loading state is removed and no resources are rendered
    expect(container.querySelectorAll('.animate-pulse').length).toBe(0);
    expect(screen.queryByTestId('resource-card-c1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('resource-card-u1')).not.toBeInTheDocument();
  });

  it('displays an error message when marking complete fails', async () => {
    render(<LibraryPage />);
    // Wait for initial central load
    await waitFor(() => {
      expect(screen.getByTestId('resource-card-c1')).toBeInTheDocument();
    });

    // Mock the specific PATCH call to fail
    fetchSpy.mockImplementation((url): Promise<Response> => {
      const urlString = url.toString();
      if (urlString === '/api/resources/library/c1/status') {
        return mockFetchError(500, 'Update Failed'); // Specific failure for this action
      }
      // Handle other calls normally for setup
       if (urlString.includes('/api/resources/topics')) {
           return mockFetchResponse(mockTopics);
       }
       if (urlString.includes('/api/resources/library')) {
         // Return page 1 data for initial load
         return mockFetchResponse(mockCentralResourcesPage1, { 'X-Total-Pages': '2' });
       }
      // Default success for other actions if any were triggered unexpectedly
      if (urlString.startsWith('/api/resources/library/') || urlString.includes('/complete') || urlString.match(/\/api\/resources\/\w+\/[^/]+\/?$/)) {
          return mockFetchResponse({ success: true });
      }
      console.warn(`Unhandled fetch request in mark complete error test: ${urlString}`);
      return mockFetchError(404, 'Not Found');
    });

    // Find and click the button
    const completeButton = screen.getByTestId('complete-button-c1');
    fireEvent.click(completeButton);

    // Wait for the error message to appear (within alert)
    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(within(alert).getByText(/failed to update resource status: update failed/i)).toBeInTheDocument();
    });

    // Ensure the button text hasn't changed (or reverted)
    const buttonAfterError = screen.getByTestId('complete-button-c1');
    expect(buttonAfterError).toHaveTextContent(/mark complete/i);
    expect(buttonAfterError).toBeEnabled(); // Should be re-enabled after loading state
  });

  it('displays an error message when saving note fails and keeps modal open', async () => {
     fetchSpy.mockImplementation(async (url, options) => {
       const urlString = url.toString();
       const method = options?.method?.toUpperCase() || 'GET';
       console.log(`[TEST DEBUG] Fetching: ${method} ${urlString}`);

       // Initial central fetch - CORRECTED condition
       if (urlString.includes('/api/resources/library') && method === 'GET') {
         console.log('[TEST DEBUG] Mocking library resource fetch');
         return mockFetchResponse(mockCentralResourcesPage1, { 'X-Total-Pages': '1' });
       }
       // User resource fetch (occurs *after* button click)
       if (urlString.includes('/api/resources/user') && method === 'GET') {
         console.log('[TEST DEBUG] Mocking user resource fetch');
         return mockFetchResponse(mockUserResources, { 'X-Total-Pages': '1' });
       }
       // PUT request for saving the note (mocked to fail)
       if (urlString.includes('/api/resources/book/u1') && method === 'PUT') {
         console.log('[TEST DEBUG] Mocking PUT request failure for u1');
         return mockFetchError(500, 'Failed to save note');
       }
       console.error(`[TEST DEBUG] Unhandled fetch: ${method} ${urlString}`);
       return mockFetchError(404, `Unhandled request: ${urlString}`);
     });

     render(<LibraryPage />);
     // Wait for initial central resources
     await waitFor(() => expect(screen.getByTestId('resource-card-c1')).toBeInTheDocument());

     // Switch to user view first
     fireEvent.click(screen.getByRole('button', { name: /my resources/i }));
     // Wait for user resource to load (fetch mock will handle the /api/resources/user call now)
     await waitFor(() => { expect(screen.getByTestId('resource-card-u1')).toBeInTheDocument(); });

     // Open the modal
     fireEvent.click(screen.getByTestId('note-button-u1'));
     await waitFor(() => {
        expect(screen.getByText(/Edit Note for: User Resource 1/i)).toBeInTheDocument();
     });

     // Edit the note
     const noteTextarea = screen.getByPlaceholderText("Enter your notes here...");
     fireEvent.change(noteTextarea, { target: { value: 'Attempted update' } });

     // Click save
     fireEvent.click(screen.getByRole('button', { name: /save note/i }));

     // Wait for the error message (within alert)
     await waitFor(() => {
       const alert = screen.getByRole('alert');
       expect(within(alert).getByText(/Failed to save note: Failed to save note/i)).toBeInTheDocument();
     });

     // Assert modal is still open
     expect(screen.getByText(/Edit Note for: User Resource 1/i)).toBeInTheDocument();

     // Assert textarea still has the attempted value
     expect(screen.getByPlaceholderText("Enter your notes here...")).toHaveValue('Attempted update');
   });

  // TODO removed as tests are added

});