import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Badge } from '@/components/ui/data-display/badge';

describe('Badge Component', () => {
  it('renders correctly with default props', () => {
    render(<Badge>Default Badge</Badge>);

    const badge = screen.getByText('Default Badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-indigo-100 text-indigo-800');
    expect(badge).toHaveClass('text-xs');
  });

  it('renders with different variants', () => {
    const { rerender } = render(<Badge variant="default">Default</Badge>);

    let badge = screen.getByText('Default');
    expect(badge).toHaveClass('bg-indigo-100 text-indigo-800');

    rerender(<Badge variant="primary">Primary</Badge>);
    badge = screen.getByText('Primary');
    expect(badge).toHaveClass('bg-indigo-100 text-indigo-800');

    rerender(<Badge variant="secondary">Secondary</Badge>);
    badge = screen.getByText('Secondary');
    expect(badge).toHaveClass('bg-gray-100 text-gray-800');

    rerender(<Badge variant="success">Success</Badge>);
    badge = screen.getByText('Success');
    expect(badge).toHaveClass('bg-green-100 text-green-800');

    rerender(<Badge variant="danger">Danger</Badge>);
    badge = screen.getByText('Danger');
    expect(badge).toHaveClass('bg-red-100 text-red-800');

    rerender(<Badge variant="warning">Warning</Badge>);
    badge = screen.getByText('Warning');
    expect(badge).toHaveClass('bg-yellow-100 text-yellow-800');

    rerender(<Badge variant="info">Info</Badge>);
    badge = screen.getByText('Info');
    expect(badge).toHaveClass('bg-blue-100 text-blue-800');
  });

  it('renders with different sizes', () => {
    const { rerender } = render(<Badge size="default">Default Size</Badge>);

    let badge = screen.getByText('Default Size');
    expect(badge).toHaveClass('text-xs');

    rerender(<Badge size="sm">Small</Badge>);
    badge = screen.getByText('Small');
    expect(badge).toHaveClass('text-xs');

    rerender(<Badge size="lg">Large</Badge>);
    badge = screen.getByText('Large');
    expect(badge).toHaveClass('text-sm');
  });

  it('applies custom className correctly', () => {
    render(<Badge className="custom-badge">Custom Badge</Badge>);

    const badge = screen.getByText('Custom Badge');
    expect(badge).toHaveClass('custom-badge');
  });

  it('forwards additional props to the span element', () => {
    render(<Badge data-testid="test-badge">Test Badge</Badge>);

    const badge = screen.getByTestId('test-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Test Badge');
  });
});