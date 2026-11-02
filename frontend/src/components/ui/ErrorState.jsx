import React from 'react';
import Button from './Button';
import Icon from './Icon';

export default function ErrorState({
  title = 'Something went wrong',
  description = 'We encountered an error loading this content. Please try again.',
  onRetry,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 md:p-12 border border-status-error/30 rounded-lg bg-surface-subtle ${className}`} role="alert">
      <div className="w-14 h-14 rounded-full bg-red-50 border border-status-error/20 flex items-center justify-center text-status-error text-2xl mb-4">
        <Icon name="exclamation" />
      </div>
      <h3 className="text-lg font-bold text-brand-ink mb-2">{title}</h3>
      <p className="text-sm text-ink-muted max-w-md mb-6">{description}</p>
      {onRetry && (
        <Button variant="primary" size="sm" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
}
