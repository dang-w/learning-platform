import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Spinner } from '@/components/ui/feedback/spinner';

describe('Spinner Component', () => {
  it('renders correctly with default props', () => {
    render(<Spinner />);

    const spinner = screen.getByRole('status', { hidden: true });
    expect(spinner).toBeInTheDocument();

    const spinnerElement = spinner.querySelector('.animate-spin');
    expect(spinnerElement).toBeInTheDocument();
    expect(spinnerElement).toHaveClass('h-6 w-6'); // Default size is 'md'
  });

  it('renders with small size', () => {
    render(<Spinner size="sm" />);

    const spinner = screen.getByRole('status', { hidden: true });
    const spinnerElement = spinner.querySelector('.animate-spin');
    expect(spinnerElement).toHaveClass('h-4 w-4');
  });

  it('renders with medium size', () => {
    render(<Spinner size="md" />);

    const spinner = screen.getByRole('status', { hidden: true });
    const spinnerElement = spinner.querySelector('.animate-spin');
    expect(spinnerElement).toHaveClass('h-6 w-6');
  });

  it('renders with large size', () => {
    render(<Spinner size="lg" />);

    const spinner = screen.getByRole('status', { hidden: true });
    const spinnerElement = spinner.querySelector('.animate-spin');
    expect(spinnerElement).toHaveClass('h-8 w-8');
  });

  it('applies custom className correctly', () => {
    render(<Spinner className="custom-spinner" />);

    const spinner = screen.getByRole('status', { hidden: true });
    expect(spinner).toHaveClass('custom-spinner');
  });

  it('has the correct border styling', () => {
    render(<Spinner />);

    const spinner = screen.getByRole('status', { hidden: true });
    const spinnerElement = spinner.querySelector('.animate-spin');
    expect(spinnerElement).toHaveClass('border-2 border-gray-300 border-t-blue-600');
  });
});