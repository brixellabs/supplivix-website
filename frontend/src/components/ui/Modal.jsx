import React, { useEffect } from 'react';
import Button from './Button';
import Icon from './Icon';

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  confirmLabel = 'Confirm',
  onConfirm,
  isDestructive = false,
  loading = false,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Solid black backdrop, NO blur */}
      <div
        className="fixed inset-0 bg-black/60 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Solid modal container */}
      <div className="relative z-10 w-full max-w-lg bg-surface-card border border-surface-border rounded-lg shadow-hover p-6 sm:p-8">
        <div className="flex items-center justify-between pb-4 border-b border-surface-border">
          <h3 id="modal-title" className="text-lg font-bold text-brand-ink">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="text-ink-muted hover:text-brand-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green rounded-sm p-1"
          >
            <Icon name="close" className="text-base" />
          </button>
        </div>

        <div className="py-4 text-sm text-ink-muted leading-relaxed">
          {children}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-border">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          {onConfirm && (
            <Button
              variant={isDestructive ? 'danger' : 'primary'}
              size="sm"
              onClick={onConfirm}
              loading={loading}
            >
              {confirmLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
