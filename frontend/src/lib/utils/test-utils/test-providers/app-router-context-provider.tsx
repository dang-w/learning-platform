import React from 'react';
import { AppRouterContext, AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

export interface AppRouterContextProviderMockProps {
  router?: Partial<AppRouterInstance>;
  children: React.ReactNode;
}

export const createMockRouter = (router?: Partial<AppRouterInstance>): AppRouterInstance => {
  return {
    back: jest.fn(),
    forward: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn().mockResolvedValue(undefined),
    ...router,
  };
};

export const AppRouterContextProviderMock = ({
  router = {},
  children,
}: AppRouterContextProviderMockProps): React.ReactNode => {
  const mockedRouter = createMockRouter(router);

  return (
    <AppRouterContext.Provider value={mockedRouter}>
      {children}
    </AppRouterContext.Provider>
  );
};