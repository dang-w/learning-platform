import { render, type RenderOptions } from '@testing-library/react';
import { TestProviders, type TestProvidersProps } from './test-providers';

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  providerProps?: Omit<TestProvidersProps, 'children'>
}

export function renderWithProviders(
  ui: React.ReactElement,
  {
    providerProps = {},
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <TestProviders {...providerProps}>{children}</TestProviders>
    ),
    ...renderOptions,
  })
}

// Re-export everything
export * from '@testing-library/react'
export { renderWithProviders as render }