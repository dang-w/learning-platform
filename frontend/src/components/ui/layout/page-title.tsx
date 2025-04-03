import React from 'react';

interface PageTitleProps {
  title: string;
  subtitle?: string;
  className?: string;
}

export const PageTitle: React.FC<PageTitleProps> = ({ title, subtitle, className }) => {
  return (
    <div className={`mb-6 ${className || ''}`}>
      <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
      {subtitle && (
        <p className="mt-1 text-lg text-gray-600">{subtitle}</p>
      )}
    </div>
  );
};