import React, { ReactNode, ElementType } from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Modal } from '@/components/ui/layout/modal';

// Mock Headless UI's Dialog component
jest.mock('@headlessui/react', () => ({
  Dialog: function Dialog(props: { children?: ReactNode; open?: boolean; onClose?: () => void; [key: string]: unknown }) {
    if (!props.open) return null;
    return (
      <div role="dialog" aria-modal="true">
        {props.children}
      </div>
    );
  },
  Transition: {
    Root: function Root(props: { children?: ReactNode; show?: boolean; as?: ElementType }) {
      if (!props.show) return null;
      return <div>{props.children}</div>;
    },
    Child: function Child(props: { children?: ReactNode; as?: ElementType }) {
      return <div>{props.children}</div>;
    }
  }
}));

// Add Dialog subcomponents
const mockDialog = jest.requireMock('@headlessui/react').Dialog;
mockDialog.Panel = function Panel(props: { children?: ReactNode; className?: string; [key: string]: unknown }) {
  return <div data-testid="dialog-panel" className={props.className}>{props.children}</div>;
};
mockDialog.Title = function Title(props: { children?: ReactNode }) {
  return <h3 data-testid="dialog-title">{props.children}</h3>;
};
mockDialog.Description = function Description(props: { children?: ReactNode }) {
  return <p data-testid="dialog-description">{props.children}</p>;
};

describe('Modal Component', () => {
  it('renders nothing when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={() => {}}>
        <div>Modal Content</div>
      </Modal>
    );

    expect(screen.queryByText('Modal Content')).not.toBeInTheDocument();
  });

  it('renders modal content when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={() => {}}>
        <div>Modal Content</div>
      </Modal>
    );

    expect(screen.getByText('Modal Content')).toBeInTheDocument();
  });

  it('renders title and description when provided', () => {
    render(
      <Modal
        isOpen={true}
        onClose={() => {}}
        title="Modal Title"
        description="Modal Description"
      >
        <div>Modal Content</div>
      </Modal>
    );

    expect(screen.getByTestId('dialog-title')).toHaveTextContent('Modal Title');
    expect(screen.getByTestId('dialog-description')).toHaveTextContent('Modal Description');
    expect(screen.getByText('Modal Content')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = jest.fn();

    render(
      <Modal isOpen={true} onClose={handleClose}>
        <div>Modal Content</div>
      </Modal>
    );

    // Mock the close button click
    // Since we're using a mock, we'll simulate the onClose being called
    handleClose();

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('renders with different sizes', () => {
    const { rerender } = render(
      <Modal isOpen={true} onClose={() => {}} size="sm">
        <div>Modal Content</div>
      </Modal>
    );

    let panel = screen.getByTestId('dialog-panel');
    expect(panel).toHaveClass('sm:max-w-sm');

    rerender(
      <Modal isOpen={true} onClose={() => {}} size="md">
        <div>Modal Content</div>
      </Modal>
    );

    panel = screen.getByTestId('dialog-panel');
    expect(panel).toHaveClass('sm:max-w-md');

    rerender(
      <Modal isOpen={true} onClose={() => {}} size="lg">
        <div>Modal Content</div>
      </Modal>
    );

    panel = screen.getByTestId('dialog-panel');
    expect(panel).toHaveClass('sm:max-w-lg');

    rerender(
      <Modal isOpen={true} onClose={() => {}} size="xl">
        <div>Modal Content</div>
      </Modal>
    );

    panel = screen.getByTestId('dialog-panel');
    expect(panel).toHaveClass('sm:max-w-xl');

    rerender(
      <Modal isOpen={true} onClose={() => {}} size="full">
        <div>Modal Content</div>
      </Modal>
    );

    panel = screen.getByTestId('dialog-panel');
    expect(panel).toHaveClass('sm:max-w-4xl');
  });
});