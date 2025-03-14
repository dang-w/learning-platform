import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import QueryProvider from '@/lib/providers/query-provider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock react-query
jest.mock('@tanstack/react-query', () => ({
  QueryClient: jest.fn(() => ({})),
  QueryClientProvider: jest.fn(({ children }) => <div data-testid="query-provider">{children}</div>),
}));

describe('QueryProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a new QueryClient with default options', () => {
    render(
      <QueryProvider>
        <div>Test Content</div>
      </QueryProvider>
    );

    // Check if QueryClient was created with correct options
    expect(QueryClient).toHaveBeenCalledWith({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000, // 1 minute
          retry: 1,
          refetchOnWindowFocus: false,
        },
      },
    });
  });

  it('should render QueryClientProvider with the client and children', () => {
    const { getByTestId, getByText } = render(
      <QueryProvider>
        <div>Test Content</div>
      </QueryProvider>
    );

    // Check if QueryClientProvider was rendered
    const provider = getByTestId('query-provider');
    expect(provider).toBeInTheDocument();

    // Check if children were rendered
    expect(getByText('Test Content')).toBeInTheDocument();

    // Check if QueryClientProvider was called
    expect(QueryClientProvider).toHaveBeenCalled();
  });

  it('should create QueryClient only once per component instance', () => {
    const { rerender } = render(
      <QueryProvider>
        <div>First Render</div>
      </QueryProvider>
    );

    // First render should create a QueryClient
    expect(QueryClient).toHaveBeenCalledTimes(1);

    // Rerender with different children
    rerender(
      <QueryProvider>
        <div>Second Render</div>
      </QueryProvider>
    );

    // Should not create a new QueryClient on rerender
    expect(QueryClient).toHaveBeenCalledTimes(1);
  });
});