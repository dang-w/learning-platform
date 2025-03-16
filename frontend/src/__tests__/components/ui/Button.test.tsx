import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Button } from '@/components/ui/buttons';

describe('Button Component', () => {
  it('renders correctly with default props', () => {
    render(<Button>Click Me</Button>);

    const button = screen.getByRole('button', { name: /Click Me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-indigo-600');
    expect(button).not.toBeDisabled();
  });

  it('renders with default variant', () => {
    render(<Button variant="default">Default Button</Button>);

    const button = screen.getByRole('button', { name: /Default Button/i });
    expect(button).toHaveClass('bg-indigo-600');
  });

  it('renders with secondary variant', () => {
    render(<Button variant="secondary">Secondary Button</Button>);

    const button = screen.getByRole('button', { name: /Secondary Button/i });
    expect(button).toHaveClass('bg-indigo-100');
  });

  it('renders with destructive variant', () => {
    render(<Button variant="destructive">Destructive Button</Button>);

    const button = screen.getByRole('button', { name: /Destructive Button/i });
    expect(button).toHaveClass('bg-red-600');
  });

  it('renders with outline variant', () => {
    render(<Button variant="outline">Outline Button</Button>);

    const button = screen.getByRole('button', { name: /Outline Button/i });
    expect(button).toHaveClass('border-indigo-200');
  });

  it('renders with ghost variant', () => {
    render(<Button variant="ghost">Ghost Button</Button>);

    const button = screen.getByRole('button', { name: /Ghost Button/i });
    expect(button).toHaveClass('hover:bg-indigo-100');
  });

  it('renders with link variant', () => {
    render(<Button variant="link">Link Button</Button>);

    const button = screen.getByRole('button', { name: /Link Button/i });
    expect(button).toHaveClass('text-indigo-900');
  });

  it('renders with custom className', () => {
    render(<Button className="custom-class">Custom Button</Button>);

    const button = screen.getByRole('button', { name: /Custom Button/i });
    expect(button).toHaveClass('custom-class');
  });

  it('renders as disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled Button</Button>);

    const button = screen.getByRole('button', { name: /Disabled Button/i });
    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled:opacity-50');
  });

  it('renders with loading state', () => {
    render(<Button isLoading>Loading Button</Button>);

    const button = screen.getByRole('button', { name: /Loading Button/i });
    expect(button).toBeDisabled();
    const spinner = button.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('calls onClick handler when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);

    const button = screen.getByRole('button', { name: /Click Me/i });
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick handler when disabled', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick} disabled>Click Me</Button>);

    const button = screen.getByRole('button', { name: /Click Me/i });
    fireEvent.click(button);

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('does not call onClick handler when loading', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick} isLoading>Click Me</Button>);

    const button = screen.getByRole('button', { name: /Click Me/i });
    fireEvent.click(button);

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders with different sizes', () => {
    const { rerender } = render(<Button size="sm">Small Button</Button>);

    let button = screen.getByRole('button', { name: /Small Button/i });
    expect(button).toHaveClass('h-8');

    rerender(<Button size="default">Medium Button</Button>);
    button = screen.getByRole('button', { name: /Medium Button/i });
    expect(button).toHaveClass('h-10');

    rerender(<Button size="lg">Large Button</Button>);
    button = screen.getByRole('button', { name: /Large Button/i });
    expect(button).toHaveClass('h-12');
  });
});