import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import SEOHead from '../../components/seo/SEOHead';
import Breadcrumbs from '../../components/layout/Breadcrumbs';

const POLICY_NAV_LINKS = [
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Terms and Conditions', href: '/terms' },
  { label: 'Shipping & COD', href: '/shipping-policy' },
];

export default function PolicyLayout({ title, description, canonical, lastUpdated, sections = [], children }) {
  const location = useLocation();
  const metaDesc =
    description ||
    `Official ${title.toLowerCase()} for Supplivix Pakistan. Transparent multivitamins, skincare, and nationwide Cash on Delivery policies.`;

  return (
    <div className="min-h-screen bg-white text-brand-ink flex flex-col justify-between">
      <SEOHead
        title={`${title} | Supplivix`}
        description={metaDesc}
        canonical={canonical}
      />

      {/* Breadcrumb Navigation */}
      <Breadcrumbs items={[{ label: title, href: canonical }]} />

      {/* Policy Navigation Tabs Bar */}
      <div className="bg-surface-subtle border-b border-surface-border">
        <div className="max-w-site mx-auto px-4 sm:px-6">
          <nav className="flex items-center space-x-1 sm:space-x-3 overflow-x-auto py-2.5 text-xs font-semibold scrollbar-none" aria-label="Policy Sub-navigation">
            {POLICY_NAV_LINKS.map((link) => {
              const isActive = location.pathname === link.href || canonical === link.href;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`px-3 py-1.5 rounded-sm whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-brand-ink text-white font-bold shadow-solid-sm'
                      : 'text-ink-muted hover:text-brand-ink hover:bg-white'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-site mx-auto px-4 sm:px-6 py-8 sm:py-12 w-full flex-1">
        {/* Header Block */}
        <div className="mb-8 pb-6 border-b border-surface-border">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold uppercase tracking-tight text-brand-ink">
            {title}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted mt-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-sm bg-surface-subtle border border-surface-border font-medium text-brand-ink">
              Last Updated: {lastUpdated}
            </span>
            <span>Official Pakistan E-Commerce & COD Guidelines</span>
          </div>
        </div>

        {/* Content & Sidebar Grid */}
        <div className={`grid grid-cols-1 ${sections.length > 0 ? 'lg:grid-cols-12 gap-8 lg:gap-10' : 'max-w-4xl'}`}>
          {/* Table of Contents sidebar */}
          {sections.length > 0 && (
            <aside className="lg:col-span-4 order-2 lg:order-1">
              <div className="sticky top-28 bg-surface-subtle border border-surface-border rounded-lg p-5 shadow-sm">
                <h2 className="text-xs font-bold uppercase tracking-wider text-brand-ink mb-3 pb-2 border-b border-surface-border flex items-center justify-between">
                  <span>Table of Contents</span>
                  <span className="text-[10px] text-ink-muted font-normal lowercase">{sections.length} topics</span>
                </h2>
                <ul className="space-y-2 text-xs">
                  {sections.map((sec) => (
                    <li key={sec.id}>
                      <a
                        href={`#${sec.id}`}
                        className="text-ink-muted hover:text-brand-green hover:underline block leading-relaxed transition-colors py-0.5"
                      >
                        {sec.title}
                      </a>
                    </li>
                  ))}
                </ul>

                <div className="mt-5 pt-4 border-t border-surface-border text-xs text-ink-muted">
                  <span className="block font-semibold text-brand-ink mb-1">Need assistance?</span>
                  <p className="leading-snug">
                    Our Faisalabad care team is available Mon-Sat via WhatsApp at{' '}
                    <a
                      href="https://wa.me/923025222405"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-green font-semibold hover:underline"
                    >
                      0302-5222405
                    </a>.
                  </p>
                </div>
              </div>
            </aside>
          )}

          {/* Article Text */}
          <article className={sections.length > 0 ? 'lg:col-span-8 order-1 lg:order-2' : 'w-full'}>
            <div className="space-y-6 text-sm text-ink-muted leading-relaxed">
              {children}
            </div>
          </article>
        </div>
      </main>

      {/* Fallback footer for isolated test render */}
      <footer className="border-t border-surface-border bg-surface-subtle py-6">
        <div className="max-w-site mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-ink-muted gap-4">
          <div>
            © 2026 Supplivix. Beauty & Wellness Vitamins. Cash on Delivery across Pakistan.
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold text-brand-ink">
            <Link to="/privacy-policy" className="hover:text-brand-green">Privacy</Link>
            <Link to="/terms" className="hover:text-brand-green">Terms</Link>
            <Link to="/shipping-policy" className="hover:text-brand-green">Shipping</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
