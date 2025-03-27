/** @jest-environment jsdom */
import React from 'react';

/**
 * Mock Next.js Link component
 * Renders as a simple anchor tag for testing
 */
export const mockNextLink = () => {
  jest.mock('next/link', () => ({
    __esModule: true,
    default: (props: { href: string; children: React.ReactNode }) => (
      <a {...props}>
        {props.children}
      </a>
    )
  }));
};

/**
 * Mock Next.js Link component with click tracking
 * Useful for testing navigation behavior
 */
export const mockNextLinkWithTracking = () => {
  const clickHistory: string[] = [];

  jest.mock('next/link', () => ({
    __esModule: true,
    default: (props: { href: string; children: React.ReactNode }) => (
      <a
        {...props}
        onClick={(e) => {
          e.preventDefault();
          clickHistory.push(props.href);
        }}
      >
        {props.children}
      </a>
    )
  }));

  return { clickHistory };
};

/**
 * Helper to verify Link clicks
 */
export const verifyLinkClicks = (clickHistory: string[], expectedUrls: string[]) => {
  expect(clickHistory).toEqual(expectedUrls);
};