import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { Input } from '@/components/ui/forms/input';

describe('Input Component', () => {
  it('renders correctly with default props', () => {
    render(<Input placeholder="Enter text" />);

    const input = screen.getByPlaceholderText('Enter text');
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass('border-gray-300');
    expect(input).not.toHaveClass('border-red-300');
  });

  it('renders with error state when error prop is true', () => {
    render(<Input placeholder="Enter text" error={true} />);

    const input = screen.getByPlaceholderText('Enter text');
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass('border-red-300');
    expect(input).not.toHaveClass('border-gray-300');
  });

  it('applies custom className correctly', () => {
    render(<Input placeholder="Enter text" className="custom-class" />);

    const input = screen.getByPlaceholderText('Enter text');
    expect(input).toHaveClass('custom-class');
  });

  it('handles user input correctly', async () => {
    const user = userEvent.setup();
    render(<Input placeholder="Enter text" />);

    const input = screen.getByPlaceholderText('Enter text') as HTMLInputElement;
    await user.type(input, 'Hello, world!');

    expect(input.value).toBe('Hello, world!');
  });

  it('forwards additional props to the input element', () => {
    render(
      <Input
        placeholder="Enter text"
        data-testid="test-input"
        maxLength={10}
        readOnly
      />
    );

    const input = screen.getByPlaceholderText('Enter text');
    expect(input).toHaveAttribute('data-testid', 'test-input');
    expect(input).toHaveAttribute('maxLength', '10');
    expect(input).toHaveAttribute('readOnly');
  });
});