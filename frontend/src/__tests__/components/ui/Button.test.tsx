import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Button } from '@/components/ui/Button';

describe('Button Component', () => {
  it('renders correctly with default props', () => {
    render(<Button>Click Me</Button>);

    const button = screen.getByRole('button', { name: /Click Me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-blue-600');
    expect(button).not.toBeDisabled();
  });

  it('renders with primary variant', () => {
    render(<Button variant="primary">Primary Button</Button>);

    const button = screen.getByRole('button', { name: /Primary Button/i });
    expect(button).toHaveClass('bg-blue-600');
  });

  it('renders with secondary variant', () => {
    render(<Button variant="secondary">Secondary Button</Button>);

    const button = screen.getByRole('button', { name: /Secondary Button/i });
    expect(button).toHaveClass('bg-gray-500');
  });

  it('renders with success variant', () => {
    render(<Button variant="success">Success Button</Button>);

    const button = screen.getByRole('button', { name: /Success Button/i });
    expect(button).toHaveClass('bg-green-600');
  });

  it('renders with danger variant', () => {
    render(<Button variant="danger">Danger Button</Button>);

    const button = screen.getByRole('button', { name: /Danger Button/i });
    expect(button).toHaveClass('bg-red-600');
  });

  it('renders with warning variant', () => {
    render(<Button variant="warning">Warning Button</Button>);

    const button = screen.getByRole('button', { name: /Warning Button/i });
    expect(button).toHaveClass('bg-yellow-500');
  });

  it('renders with info variant', () => {
    render(<Button variant="info">Info Button</Button>);

    const button = screen.getByRole('button', { name: /Info Button/i });
    expect(button).toHaveClass('bg-blue-400');
  });

  it('renders with light variant', () => {
    render(<Button variant="light">Light Button</Button>);

    const button = screen.getByRole('button', { name: /Light Button/i });
    expect(button).toHaveClass('bg-gray-100');
  });

  it('renders with dark variant', () => {
    render(<Button variant="dark">Dark Button</Button>);

    const button = screen.getByRole('button', { name: /Dark Button/i });
    expect(button).toHaveClass('bg-gray-800');
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
    expect(button).toHaveClass('opacity-50 cursor-not-allowed');
  });

  it('renders with loading state', () => {
    render(<Button isLoading>Loading Button</Button>);

    const button = screen.getByRole('button', { name: /Loading Button/i });
    expect(button).toBeDisabled();
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
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
    expect(button).toHaveClass('text-sm py-1 px-2');

    rerender(<Button size="md">Medium Button</Button>);
    button = screen.getByRole('button', { name: /Medium Button/i });
    expect(button).toHaveClass('text-base py-2 px-4');

    rerender(<Button size="lg">Large Button</Button>);
    button = screen.getByRole('button', { name: /Large Button/i });
    expect(button).toHaveClass('text-lg py-3 px-6');
  });
});