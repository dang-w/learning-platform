import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import HomePage from '@/app/page';
import { expect } from '@jest/globals';
// Mock Next.js Link component
jest.mock('next/link', () => {
  const LinkComponent = ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
  LinkComponent.displayName = 'MockedLink';
  return LinkComponent;
});

describe('HomePage', () => {
  it('renders the homepage correctly', () => {
    render(<HomePage />);

    // Check if the main heading is rendered
    expect(screen.getByRole('heading', { name: /AI\/ML Learning Platform/i })).toBeInTheDocument();

    // Check if the description text is rendered
    expect(screen.getByText(/Track your progress, manage knowledge, and optimize learning/i)).toBeInTheDocument();

    // Check if the sign in link is rendered
    const signInLink = screen.getByRole('link', { name: /Sign in/i });
    expect(signInLink).toBeInTheDocument();
    expect(signInLink).toHaveAttribute('href', '/auth/login');

    // Check if the create account link is rendered
    const createAccountLink = screen.getByRole('link', { name: /Create an account/i });
    expect(createAccountLink).toBeInTheDocument();
    expect(createAccountLink).toHaveAttribute('href', '/auth/register');
  });

  it('has the correct link elements', () => {
    render(<HomePage />);

    // Check if the sign in link exists
    const signInLink = screen.getByRole('link', { name: /Sign in/i });
    expect(signInLink).toBeInTheDocument();

    // Check if the create account link exists
    const createAccountLink = screen.getByRole('link', { name: /Create an account/i });
    expect(createAccountLink).toBeInTheDocument();
  });
});