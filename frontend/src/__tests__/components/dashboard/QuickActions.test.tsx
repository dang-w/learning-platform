import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { expect } from '@jest/globals';

// Mock next/link
jest.mock('next/link', () => {
  const MockedLink = ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
  MockedLink.displayName = 'MockedLink';
  return MockedLink;
});

describe('QuickActions', () => {
  it('renders the component with correct title', () => {
    render(<QuickActions />);

    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
  });

  it('renders all action items', () => {
    render(<QuickActions />);

    expect(screen.getByText('Add Resource')).toBeInTheDocument();
    expect(screen.getByText('Start Review')).toBeInTheDocument();
    expect(screen.getByText('View Progress')).toBeInTheDocument();
    expect(screen.getByText('Set Goals')).toBeInTheDocument();
  });

  it('renders action descriptions', () => {
    render(<QuickActions />);

    expect(screen.getByText('Add a new learning resource')).toBeInTheDocument();
    expect(screen.getByText('Review your learned concepts')).toBeInTheDocument();
    expect(screen.getByText('Check your learning progress')).toBeInTheDocument();
    expect(screen.getByText('Manage your learning goals')).toBeInTheDocument();
  });

  it('contains the correct links for each action', () => {
    render(<QuickActions />);

    const addResourceLink = screen.getByText('Add Resource').closest('a');
    expect(addResourceLink).toHaveAttribute('href', '/resources/new');

    const startReviewLink = screen.getByText('Start Review').closest('a');
    expect(startReviewLink).toHaveAttribute('href', '/reviews/session');

    const viewProgressLink = screen.getByText('View Progress').closest('a');
    expect(viewProgressLink).toHaveAttribute('href', '/resources');

    const setGoalsLink = screen.getByText('Set Goals').closest('a');
    expect(setGoalsLink).toHaveAttribute('href', '/goals');
  });
});