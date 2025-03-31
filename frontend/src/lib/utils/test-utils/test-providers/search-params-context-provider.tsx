import React from 'react';
import { SearchParamsContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';

export interface SearchParamsContextProviderMockProps {
  searchParams?: Record<string, string>;
  children: React.ReactNode;
}

export const createMockSearchParams = (params: Record<string, string> = {}): URLSearchParams => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    searchParams.set(key, value);
  });
  return searchParams;
};

export const SearchParamsContextProviderMock = ({
  searchParams = {},
  children,
}: SearchParamsContextProviderMockProps): React.ReactNode => {
  const mockedSearchParams = createMockSearchParams(searchParams);

  return (
    <SearchParamsContext.Provider value={mockedSearchParams}>
      {children}
    </SearchParamsContext.Provider>
  );
};