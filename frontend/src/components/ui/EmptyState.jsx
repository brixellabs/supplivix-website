import React from 'react';
import Button from './Button';
import Icon from './Icon';

export default function EmptyState({
  title = 'No items found',
  description = 'Try adjusting your search or filter to find what you are looking for.',
  actionLabel,
  onAction,
  icon = 'capsules',
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 md:p-12 border border-surface-border rounded-lg bg-surface-subtle ${className}`}>
      <div className="w-16 h-16 rounded-full bg-surface-accent border border-surface-border flex items-center justify-center text-ink-muted text-2xl mb-4">
        <Icon name={icon} />
      </div>
      <h3 className="text-lg font-bold text-brand-ink mb-2">{title}</h3>
      <p className="text-sm text-ink-muted max-w-md mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
