import React from 'react'
import { render } from '@testing-library/react'
import { jest } from '@jest/globals'
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { SearchParamsContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime'
import { PathnameContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime'
import { AuthTestProvider } from './auth-provider'
import type { MockAuthStoreOptions } from '../auth-mocks'

// Mock router implementation
const createMockRouter = (router: RouterMock = {}) => ({
  back: router.back || jest.fn(),
  forward: jest.fn(),
  push: router.push || jest.fn(),
  replace: router.replace || jest.fn(),
  refresh: router.refresh || jest.fn(),
  prefetch: jest.fn(),
  pathname: router.pathname || '/',
  isFallback: false,
})

interface RouterMock {
  push?: jest.Mock
  replace?: jest.Mock
  refresh?: jest.Mock
  back?: jest.Mock
  pathname?: string
  query?: Record<string, string>
}

interface TestProvidersProps {
  children: React.ReactNode
  router?: RouterMock
  searchParams?: Record<string, string>
  authOptions?: MockAuthStoreOptions
}

export const TestProviders: React.FC<TestProvidersProps> = ({
  children,
  router = {},
  searchParams = {},
  authOptions = {}
}) => {
  const mockRouter = React.useMemo(() => createMockRouter(router), [router])
  const mockSearchParams = React.useMemo(
    () => new URLSearchParams(searchParams),
    [searchParams]
  )

  return (
    <AppRouterContext.Provider value={mockRouter}>
      <PathnameContext.Provider value={mockRouter.pathname}>
        <SearchParamsContext.Provider value={mockSearchParams}>
          <AuthTestProvider mockAuthOptions={authOptions}>
            {children}
          </AuthTestProvider>
        </SearchParamsContext.Provider>
      </PathnameContext.Provider>
    </AppRouterContext.Provider>
  )
}

export function renderWithProviders(
  ui: React.ReactElement,
  {
    router = {},
    searchParams = {},
    authOptions = {}
  } = {}
) {
  return render(
    <TestProviders
      router={router}
      searchParams={searchParams}
      authOptions={authOptions}
    >
      {ui}
    </TestProviders>
  )
}