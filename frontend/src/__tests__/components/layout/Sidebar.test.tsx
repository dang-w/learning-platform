import React from 'react';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import Sidebar from '@/components/layout/sidebar';
import { expect } from '@jest/globals';
import { renderWithProviders } from '@/lib/utils/test-utils';
import { usePathname } from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/dashboard'),
  useRouter: jest.fn(() => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }))
}));

// Mock next/link
jest.mock('next/link', () => {
  return function NextLink({ children, href, onClick, 'aria-current': ariaCurrent, className }: {
    children: React.ReactNode;
    href: string;
    onClick?: () => void;
    'aria-current'?: 'page' | 'step' | 'location' | 'date' | 'time' | boolean;
    className?: string;
  }) {
    return (
      <a href={href} onClick={onClick} aria-current={ariaCurrent} className={className}>
        {children}
      </a>
    );
  };
});

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  LayoutDashboard: () => <svg data-testid="icon-dashboard" />,
  BookOpenText: () => <svg data-testid="icon-library" />,
  GraduationCap: () => <svg data-testid="icon-learning-path" />,
  NotebookPen: () => <svg data-testid="icon-notes" />,
  User: () => <svg data-testid="icon-profile" />,
  LogOut: () => <svg data-testid="icon-logout" />,
  Settings: () => <svg data-testid="icon-settings" />,
  Menu: () => <svg data-testid="icon-menu" />,
  X: () => <svg data-testid="icon-close" />,
  ChevronLeft: () => <svg data-testid="icon-chevron-left" />,
  ChevronRight: () => <svg data-testid="icon-chevron-right" />,
}));

describe('Sidebar', () => {
  it('renders the sidebar with navigation items', () => {
    renderWithProviders(<Sidebar />);

    // Check that the title is rendered
    expect(screen.getAllByText('AI/ML Learning')[0]).toBeInTheDocument();

    // Check that all navigation items are rendered
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Library')).toBeInTheDocument();
    expect(screen.getByText('Learning Path')).toBeInTheDocument();
    expect(screen.getByText('Knowledge')).toBeInTheDocument();
    expect(screen.getByText('Notes')).toBeInTheDocument();
    expect(screen.getByText('Progress')).toBeInTheDocument();

    // Check for navigation items (desktop and mobile)
    expect(screen.getByRole('link', { name: /Dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Library/i })).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Learning Path/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Knowledge/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Notes/i })).toBeInTheDocument();
  });

  it('renders the mobile menu button', () => {
    renderWithProviders(<Sidebar />);

    // Check that the mobile menu button is rendered
    const mobileMenuButton = screen.getByRole('button', { name: /open sidebar/i });
    expect(mobileMenuButton).toBeInTheDocument();
  });

  it('opens the mobile menu when the button is clicked', async () => {
    renderWithProviders(<Sidebar />);

    // Initially, the mobile menu should be closed
    expect(screen.queryByText('close sidebar')).not.toBeInTheDocument();

    // Click the mobile menu button
    const menuButton = screen.getByTestId('open-sidebar');
    fireEvent.click(menuButton);

    // Wait for the mobile menu content to appear
    await waitFor(() => {
      // Check for a specific element only visible in the mobile menu, like the close button
      const mobileMenu = screen.getByTestId('mobile-menu-content'); // Add a testId to the mobile menu div
      expect(within(mobileMenu).getByTestId('close-sidebar')).toBeInTheDocument();
      // Or check for navigation items again if they are rendered differently in mobile
      expect(
        within(mobileMenu).getByRole('link', { name: /Library/i })
      ).toBeInTheDocument(); // Assuming links are present in mobile too
    });
  });

  it('closes the mobile menu when the close button is clicked', async () => {
    renderWithProviders(<Sidebar />);

    // Open the mobile menu
    const menuButton = screen.getByTestId('open-sidebar');
    fireEvent.click(menuButton);

    // Wait for the close button to appear
    await waitFor(() => {
      expect(screen.getByTestId('close-sidebar')).toBeInTheDocument();
    });

    // Find and click the close button
    const closeButton = screen.getByTestId('close-sidebar');
    expect(closeButton).toBeInTheDocument();
    if (closeButton) {
      fireEvent.click(closeButton);
    }

    // Wait for the mobile menu to disappear (e.g., close button is gone)
    await waitFor(() => {
      expect(screen.queryByTestId('close-sidebar')).not.toBeInTheDocument();
    });
  });

  it('closes the mobile menu when a navigation item is clicked', async () => {
    renderWithProviders(<Sidebar />);

    // Open the mobile menu
    const menuButton = screen.getByTestId('open-sidebar');
    fireEvent.click(menuButton);

    // Wait for the mobile menu to appear
    await waitFor(() => {
      expect(screen.getByTestId('close-sidebar')).toBeInTheDocument();
    });

    // Find and click a navigation link (e.g., library) within the mobile menu
    const mobileMenu = screen.getByTestId('mobile-menu-content'); // Use the testId again
    const libraryLink = within(mobileMenu).getByRole('link', { name: /Library/i });
    fireEvent.click(libraryLink);

    // Wait for the mobile menu to disappear
    await waitFor(() => {
      expect(screen.queryByTestId('close-sidebar')).not.toBeInTheDocument();
    });
  });

  it('applies active styles to the current route', () => {
    (usePathname as jest.Mock).mockReturnValue('/learning-path');
    renderWithProviders(<Sidebar />);

    const desktopNav = screen.getByTestId('desktop-nav');

    const activeLink = within(desktopNav).getByRole('link', { name: /Learning Path/i });
    const inactiveLink = within(desktopNav).getByRole('link', { name: /Dashboard/i });

    expect(activeLink).toBeDefined();
    expect(inactiveLink).toBeDefined();

    // Updated class check - adjust if needed based on actual implementation
    expect(activeLink).toHaveClass('bg-indigo-50');
    expect(activeLink).toHaveClass('text-indigo-600');

    expect(inactiveLink).not.toHaveClass('bg-indigo-50');
    expect(inactiveLink).not.toHaveClass('text-indigo-600');

    // Check aria-current attribute
    expect(activeLink).toHaveAttribute('aria-current', 'page');
    expect(inactiveLink).not.toHaveAttribute('aria-current');
  });

  it('applies active styles to the current route in mobile menu', async () => {
    (usePathname as jest.Mock).mockReturnValue('/library');
    renderWithProviders(<Sidebar />);

    // Open the mobile menu
    const menuButton = screen.getByTestId('open-sidebar');
    fireEvent.click(menuButton);

    // Wait for the mobile menu content to appear
    const mobileMenu = await screen.findByTestId('mobile-menu-content');

    // Check styles within the mobile menu
    const activeLink = within(mobileMenu).getByRole('link', { name: /Library/i });
    const inactiveLink = within(mobileMenu).getByRole('link', { name: /Dashboard/i });

    expect(activeLink).toBeDefined();
    expect(inactiveLink).toBeDefined();

    // Check classes
    expect(activeLink).toHaveClass('bg-indigo-50');
    expect(activeLink).toHaveClass('text-indigo-600');
    expect(inactiveLink).not.toHaveClass('bg-indigo-50');
    expect(inactiveLink).not.toHaveClass('text-indigo-600');

    // Check aria-current attribute
    expect(activeLink).toHaveAttribute('aria-current', 'page');
    expect(inactiveLink).not.toHaveAttribute('aria-current');
  });

  it('closes the mobile menu when the backdrop is clicked', async () => {
    renderWithProviders(<Sidebar />);

    // Open the mobile menu
    const menuButton = screen.getByTestId('open-sidebar');
    fireEvent.click(menuButton);

    // Wait for the mobile menu to appear and find the backdrop
    const backdrop = await screen.findByTestId('mobile-menu-backdrop');
    expect(screen.getByTestId('close-sidebar')).toBeInTheDocument(); // Ensure menu is open

    // Click the backdrop
    fireEvent.click(backdrop);

    // Wait for the mobile menu to disappear
    await waitFor(() => {
      expect(screen.queryByTestId('close-sidebar')).not.toBeInTheDocument();
    });
  });
});