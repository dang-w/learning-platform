import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/cards/card';

describe('Card Components', () => {
  describe('Card', () => {
    it('renders correctly with default props', () => {
      render(<Card>Card Content</Card>);

      const card = screen.getByText('Card Content');
      expect(card).toBeInTheDocument();
      expect(card.parentElement).toHaveClass('bg-white rounded-lg shadow');
    });

    it('applies custom className correctly', () => {
      render(<Card className="custom-class">Card Content</Card>);

      const card = screen.getByText('Card Content');
      expect(card.parentElement).toHaveClass('custom-class');
    });

    it('forwards additional props to the div element', () => {
      render(<Card data-testid="test-card">Card Content</Card>);

      const card = screen.getByTestId('test-card');
      expect(card).toBeInTheDocument();
    });
  });

  describe('CardHeader', () => {
    it('renders correctly with default props', () => {
      render(<CardHeader>Header Content</CardHeader>);

      const header = screen.getByText('Header Content');
      expect(header).toBeInTheDocument();
      expect(header.parentElement).toHaveClass('px-4 py-5 sm:px-6 border-b border-gray-200');
    });

    it('applies custom className correctly', () => {
      render(<CardHeader className="custom-header">Header Content</CardHeader>);

      const header = screen.getByText('Header Content');
      expect(header.parentElement).toHaveClass('custom-header');
    });
  });

  describe('CardTitle', () => {
    it('renders correctly with default props', () => {
      render(<CardTitle>Card Title</CardTitle>);

      const title = screen.getByText('Card Title');
      expect(title).toBeInTheDocument();
      expect(title).toHaveClass('text-lg font-medium text-gray-900');
    });

    it('applies custom className correctly', () => {
      render(<CardTitle className="custom-title">Card Title</CardTitle>);

      const title = screen.getByText('Card Title');
      expect(title).toHaveClass('custom-title');
    });
  });

  describe('CardDescription', () => {
    it('renders correctly with default props', () => {
      render(<CardDescription>Card Description</CardDescription>);

      const description = screen.getByText('Card Description');
      expect(description).toBeInTheDocument();
      expect(description).toHaveClass('mt-1 text-sm text-gray-500');
    });

    it('applies custom className correctly', () => {
      render(<CardDescription className="custom-description">Card Description</CardDescription>);

      const description = screen.getByText('Card Description');
      expect(description).toHaveClass('custom-description');
    });
  });

  describe('CardContent', () => {
    it('renders correctly with default props', () => {
      render(<CardContent>Content</CardContent>);

      const content = screen.getByText('Content');
      expect(content).toBeInTheDocument();
      expect(content.parentElement).toHaveClass('px-4 py-5 sm:p-6');
    });

    it('applies custom className correctly', () => {
      render(<CardContent className="custom-content">Content</CardContent>);

      const content = screen.getByText('Content');
      expect(content.parentElement).toHaveClass('custom-content');
    });
  });

  describe('CardFooter', () => {
    it('renders correctly with default props', () => {
      render(<CardFooter>Footer Content</CardFooter>);

      const footer = screen.getByText('Footer Content');
      expect(footer).toBeInTheDocument();
      expect(footer.parentElement).toHaveClass('px-4 py-4 sm:px-6 border-t border-gray-200');
    });

    it('applies custom className correctly', () => {
      render(<CardFooter className="custom-footer">Footer Content</CardFooter>);

      const footer = screen.getByText('Footer Content');
      expect(footer.parentElement).toHaveClass('custom-footer');
    });
  });

  describe('Card composition', () => {
    it('renders a complete card with all subcomponents', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Example Card</CardTitle>
            <CardDescription>This is an example card</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Main content goes here</p>
          </CardContent>
          <CardFooter>
            <p>Footer content</p>
          </CardFooter>
        </Card>
      );

      expect(screen.getByText('Example Card')).toBeInTheDocument();
      expect(screen.getByText('This is an example card')).toBeInTheDocument();
      expect(screen.getByText('Main content goes here')).toBeInTheDocument();
      expect(screen.getByText('Footer content')).toBeInTheDocument();
    });
  });
});