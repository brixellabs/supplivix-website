import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';

export default function ServerErrorPage({ onRetry }) {
  return (
    <div className="bg-white min-h-[70vh] flex items-center justify-center py-16 px-4">
      <meta name="robots" content="noindex" />

      <div className="max-w-md w-full text-center bg-surface-subtle border border-surface-border rounded-lg p-8 sm:p-10 shadow-card">
        <div className="w-16 h-16 bg-red-50 border border-red-200 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon name="exclamation" className="text-2xl" />
        </div>

        <span className="text-xs font-bold uppercase tracking-widest text-red-600 mb-1 block">
          Error 500
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-brand-ink mb-2">
          System Error
        </h1>
        <p className="text-xs sm:text-sm text-ink-muted leading-relaxed mb-6">
          We encountered an unexpected technical issue. Our systems have logged this event and our team has been notified.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {onRetry && (
            <Button variant="primary" size="md" onClick={onRetry} className="w-full sm:w-auto px-6">
              Try Again
            </Button>
          )}
          <Link to="/">
            <Button variant="outline" size="md" className="w-full sm:w-auto px-6">
              Return Home
            </Button>
          </Link>
        </div>

        <div className="mt-6 pt-6 border-t border-surface-border text-xs text-ink-muted">
          Need immediate assistance?{' '}
          <a
            href="https://wa.me/923025222405"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-brand-green hover:underline inline-flex items-center gap-1"
          >
            <Icon name="whatsapp" />
            <span>Chat on WhatsApp (0302-5222405)</span>
          </a>
        </div>
      </div>
    </div>
  );
}
