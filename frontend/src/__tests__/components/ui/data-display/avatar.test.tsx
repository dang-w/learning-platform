import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Avatar } from '@/components/ui/data-display/avatar';

describe('Avatar Component', () => {
  it('renders correctly with default props', () => {
    render(<Avatar />);

    const avatar = screen.getByRole('img', { hidden: true });
    expect(avatar).toBeInTheDocument();
    expect(avatar.parentElement).toHaveClass('h-10 w-10'); // Default size is 'md'

    // Should render the fallback SVG when no src or initials are provided
    const svg = avatar.parentElement?.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders with image when src is provided', () => {
    render(<Avatar src="https://example.com/avatar.jpg" alt="User Avatar" />);

    const img = screen.getByAltText('User Avatar');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    expect(img).toHaveClass('h-full w-full object-cover');
  });

  it('renders with initials when provided', () => {
    render(<Avatar initials="JD" />);

    const initials = screen.getByText('JD');
    expect(initials).toBeInTheDocument();
    expect(initials).toHaveClass('text-gray-600 font-medium');
  });

  it('truncates initials to 2 characters and uppercases them', () => {
    render(<Avatar initials="john doe" />);

    const initials = screen.getByText('JO');
    expect(initials).toBeInTheDocument();
  });

  it('renders with different sizes', () => {
    const { rerender } = render(<Avatar size="xs" />);

    let avatar = screen.getByRole('img', { hidden: true });
    expect(avatar.parentElement).toHaveClass('h-6 w-6');

    rerender(<Avatar size="sm" />);
    avatar = screen.getByRole('img', { hidden: true });
    expect(avatar.parentElement).toHaveClass('h-8 w-8');

    rerender(<Avatar size="md" />);
    avatar = screen.getByRole('img', { hidden: true });
    expect(avatar.parentElement).toHaveClass('h-10 w-10');

    rerender(<Avatar size="lg" />);
    avatar = screen.getByRole('img', { hidden: true });
    expect(avatar.parentElement).toHaveClass('h-12 w-12');

    rerender(<Avatar size="xl" />);
    avatar = screen.getByRole('img', { hidden: true });
    expect(avatar.parentElement).toHaveClass('h-16 w-16');
  });

  it('applies custom className correctly', () => {
    render(<Avatar className="custom-avatar" />);

    const avatar = screen.getByRole('img', { hidden: true });
    expect(avatar.parentElement).toHaveClass('custom-avatar');
  });

  it('prioritizes src over initials', () => {
    render(<Avatar src="https://example.com/avatar.jpg" initials="JD" alt="User Avatar" />);

    const img = screen.getByAltText('User Avatar');
    expect(img).toBeInTheDocument();
    expect(screen.queryByText('JD')).not.toBeInTheDocument();
  });

  it('forwards additional props to the div element', () => {
    render(<Avatar data-testid="test-avatar" />);

    const avatar = screen.getByTestId('test-avatar');
    expect(avatar).toBeInTheDocument();
  });
});