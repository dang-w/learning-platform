import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Progress } from '@/components/ui/feedback/progress';

describe('Progress Component', () => {
  it('renders correctly with default props', () => {
    render(<Progress />);

    const progress = screen.getByRole('progressbar');
    expect(progress).toBeInTheDocument();
    expect(progress).toHaveClass('relative h-4 w-full overflow-hidden rounded-full bg-secondary');

    const indicator = progress.querySelector('div');
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveClass('h-full w-full flex-1 bg-primary transition-all');

    // Default value should be 0
    expect(indicator).toHaveStyle('transform: translateX(-100%)');
  });

  it('renders with a specific value', () => {
    render(<Progress value={50} />);

    const progress = screen.getByRole('progressbar');
    const indicator = progress.querySelector('div');

    // Value of 50 should translate to -50%
    expect(indicator).toHaveStyle('transform: translateX(-50%)');
  });

  it('renders with value of 0', () => {
    render(<Progress value={0} />);

    const progress = screen.getByRole('progressbar');
    const indicator = progress.querySelector('div');

    expect(indicator).toHaveStyle('transform: translateX(-100%)');
  });

  it('renders with value of 100', () => {
    render(<Progress value={100} />);

    const progress = screen.getByRole('progressbar');
    const indicator = progress.querySelector('div');

    expect(indicator).toHaveStyle('transform: translateX(-0%)');
  });

  it('applies custom className correctly', () => {
    render(<Progress className="custom-progress" />);

    const progress = screen.getByRole('progressbar');
    expect(progress).toHaveClass('custom-progress');
  });

  it('forwards additional props to the progress element', () => {
    render(<Progress data-testid="test-progress" />);

    const progress = screen.getByTestId('test-progress');
    expect(progress).toBeInTheDocument();
  });
});