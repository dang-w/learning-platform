import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Sidebar from '@/components/layout/sidebar';
import { expect } from '@jest/globals';
import { usePathname } from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn().mockReturnValue('/dashboard'),
}));

// Mock next/link
jest.mock('next/link', () => {
  return function NextLink({ children, href, onClick, 'aria-current': ariaCurrent }: {
    children: React.ReactNode;
    href: string;
    onClick?: () => void;
    'aria-current'?: 'page' | 'step' | 'location' | 'date' | 'time' | boolean;
  }) {
    return (
      <a href={href} onClick={onClick} aria-current={ariaCurrent}>
        {children}
      </a>
    );
  };
});

// Mock heroicons
jest.mock('@heroicons/react/24/outline', () => ({
  HomeIcon: () => <div data-testid="home-icon" />,
  BookOpenIcon: () => <div data-testid="book-icon" />,
  AcademicCapIcon: () => <div data-testid="academic-icon" />,
  ChartBarIcon: () => <div data-testid="chart-icon" />,
  Bars3Icon: () => <div data-testid="bars-icon" />,
  XMarkIcon: () => <div data-testid="x-icon" />,
  LightBulbIcon: () => <div data-testid="lightbulb-icon" />,
  DocumentTextIcon: () => <div data-testid="document-icon" />,
}));

describe('Sidebar', () => {
  it('renders the sidebar with navigation items', () => {
    render(<Sidebar />);

    // Check that the title is rendered
    expect(screen.getAllByText('AI/ML Learning')[0]).toBeInTheDocument();

    // Check that all navigation items are rendered
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Resources')).toBeInTheDocument();
    expect(screen.getByText('Learning Path')).toBeInTheDocument();
    expect(screen.getByText('Knowledge')).toBeInTheDocument();
    expect(screen.getByText('Notes')).toBeInTheDocument();
    expect(screen.getByText('Progress')).toBeInTheDocument();
  });

  it('renders the mobile menu button', () => {
    render(<Sidebar />);

    // Check that the mobile menu button is rendered
    const mobileMenuButton = screen.getByRole('button', { name: /open sidebar/i });
    expect(mobileMenuButton).toBeInTheDocument();
  });

  it('opens the mobile menu when the button is clicked', () => {
    render(<Sidebar />);

    // Initially, the mobile menu should be closed
    expect(screen.queryByRole('button', { name: /close sidebar/i })).not.toBeInTheDocument();

    // Click the mobile menu button
    fireEvent.click(screen.getByRole('button', { name: /open sidebar/i }));

    // Now the mobile menu should be open
    expect(screen.getByRole('button', { name: /close sidebar/i })).toBeInTheDocument();
  });

  it('closes the mobile menu when the close button is clicked', () => {
    render(<Sidebar />);

    // Open the mobile menu
    fireEvent.click(screen.getByRole('button', { name: /open sidebar/i }));

    // Click the close button
    fireEvent.click(screen.getByRole('button', { name: /close sidebar/i }));

    // The mobile menu should be closed
    expect(screen.queryByRole('button', { name: /close sidebar/i })).not.toBeInTheDocument();
  });

  it('closes the mobile menu when a navigation item is clicked', () => {
    render(<Sidebar />);

    // Open the mobile menu
    fireEvent.click(screen.getByRole('button', { name: /open sidebar/i }));

    // Click a navigation item
    fireEvent.click(screen.getAllByText('Dashboard')[0]);

    // The mobile menu should be closed
    expect(screen.queryByRole('button', { name: /close sidebar/i })).not.toBeInTheDocument();
  });

  it('applies active styles to the current route', () => {
    // Mock the pathname to '/dashboard'
    (usePathname as jest.Mock).mockReturnValue('/dashboard');

    render(<Sidebar />);

    // Find all navigation links
    const navLinks = screen.getAllByRole('link');

    // Find the Dashboard link and check for active class or aria attributes
    const dashboardLink = navLinks.find(link => link.textContent?.includes('Dashboard'));
    expect(dashboardLink).toHaveAttribute('aria-current', 'page');

    // Change the pathname to '/resources' to test another route
    (usePathname as jest.Mock).mockReturnValue('/resources');

    // Re-render with the new pathname
    render(<Sidebar />);

    // Find the Resources link and check for active class
    const resourcesLinks = screen.getAllByText('Resources');
    const activeResourceLink = resourcesLinks.find(el =>
      el.closest('a')?.getAttribute('aria-current') === 'page'
    );
    expect(activeResourceLink).toBeInTheDocument();
  });
});