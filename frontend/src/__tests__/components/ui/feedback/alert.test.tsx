import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Alert } from '@/components/ui/feedback/alert';

describe('Alert Component', () => {
  it('renders correctly with default props', () => {
    render(<Alert>Alert message</Alert>);

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('Alert message');
    expect(alert).toHaveClass('bg-blue-50 text-blue-800 border-blue-200');
  });

  it('renders with info variant', () => {
    render(<Alert variant="info">Info alert</Alert>);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('bg-blue-50 text-blue-800 border-blue-200');
  });

  it('renders with success variant', () => {
    render(<Alert variant="success">Success alert</Alert>);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('bg-green-50 text-green-800 border-green-200');
  });

  it('renders with warning variant', () => {
    render(<Alert variant="warning">Warning alert</Alert>);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('bg-yellow-50 text-yellow-800 border-yellow-200');
  });

  it('renders with error variant', () => {
    render(<Alert variant="error">Error alert</Alert>);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('bg-red-50 text-red-800 border-red-200');
  });

  it('applies custom className correctly', () => {
    render(<Alert className="custom-alert">Alert with custom class</Alert>);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('custom-alert');
  });

  it('renders children correctly', () => {
    render(
      <Alert>
        <h4>Alert Title</h4>
        <p>Alert description</p>
      </Alert>
    );

    expect(screen.getByText('Alert Title')).toBeInTheDocument();
    expect(screen.getByText('Alert description')).toBeInTheDocument();
  });
});