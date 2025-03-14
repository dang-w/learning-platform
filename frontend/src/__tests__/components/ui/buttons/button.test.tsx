import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { Button } from '@/components/ui/buttons/button';

describe('Button Component', () => {
  it('renders correctly with default props', () => {
    render(<Button>Click me</Button>);

    const button = screen.getByRole('button', { name: 'Click me' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-indigo-600');
    expect(button).not.toBeDisabled();
  });

  it('renders with different variants', () => {
    const { rerender } = render(<Button variant="destructive">Destructive</Button>);

    let button = screen.getByRole('button', { name: 'Destructive' });
    expect(button).toHaveClass('bg-red-600');

    rerender(<Button variant="outline">Outline</Button>);
    button = screen.getByRole('button', { name: 'Outline' });
    expect(button).toHaveClass('border-indigo-200');

    rerender(<Button variant="secondary">Secondary</Button>);
    button = screen.getByRole('button', { name: 'Secondary' });
    expect(button).toHaveClass('bg-indigo-100');

    rerender(<Button variant="ghost">Ghost</Button>);
    button = screen.getByRole('button', { name: 'Ghost' });
    expect(button).toHaveClass('hover:bg-indigo-100');

    rerender(<Button variant="link">Link</Button>);
    button = screen.getByRole('button', { name: 'Link' });
    expect(button).toHaveClass('text-indigo-900');
  });

  it('renders with different sizes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);

    let button = screen.getByRole('button', { name: 'Small' });
    expect(button).toHaveClass('h-8');

    rerender(<Button size="default">Default</Button>);
    button = screen.getByRole('button', { name: 'Default' });
    expect(button).toHaveClass('h-10');

    rerender(<Button size="lg">Large</Button>);
    button = screen.getByRole('button', { name: 'Large' });
    expect(button).toHaveClass('h-12');

    rerender(<Button size="icon">Icon</Button>);
    button = screen.getByRole('button', { name: 'Icon' });
    expect(button).toHaveClass('h-10 w-10');
  });

  it('renders with full width when specified', () => {
    render(<Button fullWidth={true}>Full Width</Button>);

    const button = screen.getByRole('button', { name: 'Full Width' });
    expect(button).toHaveClass('w-full');
  });

  it('renders in loading state when isLoading is true', () => {
    render(<Button isLoading>Loading</Button>);

    const button = screen.getByRole('button', { name: 'Loading' });
    expect(button).toBeDisabled();

    // Check for the loading spinner
    const spinner = button.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('renders as disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);

    const button = screen.getByRole('button', { name: 'Disabled' });
    expect(button).toBeDisabled();
  });

  it('applies custom className correctly', () => {
    render(<Button className="custom-class">Custom Class</Button>);

    const button = screen.getByRole('button', { name: 'Custom Class' });
    expect(button).toHaveClass('custom-class');
  });

  it('handles click events', async () => {
    const handleClick = jest.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Click me</Button>);

    const button = screen.getByRole('button', { name: 'Click me' });
    await user.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not trigger click when disabled', async () => {
    const handleClick = jest.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick} disabled>Click me</Button>);

    const button = screen.getByRole('button', { name: 'Click me' });
    await user.click(button);

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('does not trigger click when in loading state', async () => {
    const handleClick = jest.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick} isLoading>Click me</Button>);

    const button = screen.getByRole('button', { name: 'Click me' });
    await user.click(button);

    expect(handleClick).not.toHaveBeenCalled();
  });
});