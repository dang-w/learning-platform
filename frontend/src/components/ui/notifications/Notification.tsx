import React, { useEffect, useState } from 'react';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

export type NotificationType = 'success' | 'error' | 'info';

interface NotificationProps {
  type: NotificationType;
  message: string;
  isOpen: boolean;
  onClose: () => void;
  autoClose?: boolean;
  duration?: number;
}

export const Notification: React.FC<NotificationProps> = ({
  type,
  message,
  isOpen,
  onClose,
  autoClose = true,
  duration = 5000,
}) => {
  const [isVisible, setIsVisible] = useState(isOpen);

  useEffect(() => {
    setIsVisible(isOpen);

    if (isOpen && autoClose) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Allow animation to complete
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, duration, onClose]);

  if (!isOpen && !isVisible) return null;

  const iconClasses = 'h-6 w-6';

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon className={`${iconClasses} text-green-500`} />;
      case 'error':
        return <XCircleIcon className={`${iconClasses} text-red-500`} />;
      case 'info':
        return <InformationCircleIcon className={`${iconClasses} text-blue-500`} />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getTextColor = () => {
    switch (type) {
      case 'success':
        return 'text-green-800';
      case 'error':
        return 'text-red-800';
      case 'info':
        return 'text-blue-800';
    }
  };

  const dataTestId = `${type}-notification`;

  return (
    <div
      className={`fixed top-4 right-4 flex items-center p-4 rounded-md border shadow-md transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      } ${getBackgroundColor()}`}
      role="alert"
      data-testid={dataTestId}
    >
      <div className="flex items-center">
        <div className="flex-shrink-0">{getIcon()}</div>
        <div className="ml-3">
          <p className={`text-sm font-medium ${getTextColor()}`}>{message}</p>
        </div>
      </div>
      <button
        type="button"
        className={`ml-4 inline-flex flex-shrink-0 ${getTextColor()} hover:opacity-75 focus:outline-none`}
        onClick={() => {
          setIsVisible(false);
          setTimeout(onClose, 300);
        }}
        aria-label="Close"
      >
        <XMarkIcon className="h-5 w-5" />
      </button>
    </div>
  );
};

export default Notification;