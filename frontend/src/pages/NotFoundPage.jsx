import React from 'react';
import { Link } from 'react-router-dom';
import SEOHead from '../components/seo/SEOHead';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';

export default function NotFoundPage() {
  return (
    <div className="bg-white min-h-[70vh] flex items-center justify-center py-16 px-4">
      <SEOHead title="404 Page Not Found" noindex={true} />

      <div className="max-w-md w-full text-center bg-surface-subtle border border-surface-border rounded-lg p-8 sm:p-10 shadow-card">
        <div className="w-16 h-16 bg-surface-accent border border-surface-border text-brand-green rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon name="capsules" className="text-2xl" />
        </div>

        <span className="text-xs font-bold uppercase tracking-widest text-brand-green mb-1 block">
          Error 404
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-brand-ink mb-2">
          Page Not Found
        </h1>
        <p className="text-xs sm:text-sm text-ink-muted leading-relaxed mb-6">
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/">
            <Button variant="primary" size="md" className="w-full sm:w-auto px-6">
              Return Home
            </Button>
          </Link>
          <Link to="/multivitamins">
            <Button variant="outline" size="md" className="w-full sm:w-auto px-6">
              Shop Multivitamins
            </Button>
          </Link>
        </div>

        <div className="mt-6 pt-6 border-t border-surface-border text-xs text-ink-muted">
          Looking for a recent order?{' '}
          <Link to="/track" className="font-bold text-brand-ink hover:text-brand-green underline">
            Track your order
          </Link>
        </div>
      </div>
    </div>
  );
}
