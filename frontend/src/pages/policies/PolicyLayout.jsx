import React from 'react';
import { Link } from 'react-router-dom';
import Badge from '../../components/ui/Badge';
import SEOHead from '../../components/seo/SEOHead';
import logoImg from '../../assets/brand/logo.png';

export default function PolicyLayout({ title, description, canonical, lastUpdated, sections = [], children }) {
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
      {/* Policy Header */}
      <header className="border-b border-surface-border bg-white sticky top-0 z-30">
        <div className="max-w-site mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/" aria-label="Supplivix Home">
            <img
              src={logoImg}
              alt="Supplivix"
              width="160"
              height="40"
              className="h-9 sm:h-10 w-auto object-contain"
            />
          </Link>
          <nav className="flex items-center gap-4 text-xs font-semibold">
            <Link to="/privacy-policy" className="hover:text-brand-green">Privacy</Link>
            <Link to="/terms" className="hover:text-brand-green">Terms</Link>
            <Link to="/shipping-policy" className="hover:text-brand-green">Shipping & COD</Link>
            <Link to="/returns-policy" className="hover:text-brand-green">Returns</Link>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-site mx-auto px-4 sm:px-6 py-10 w-full flex-1">
        <div className="mb-8">
          <Badge variant="pill" className="mb-2">Official Policy</Badge>
          <h1 className="text-3xl md:text-4xl font-bold uppercase tracking-tight text-brand-ink">
            {title}
          </h1>
          <p className="text-xs text-ink-muted mt-2">
            Last Updated: {lastUpdated}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Table of Contents sidebar */}
          {sections.length > 0 && (
            <aside className="md:col-span-1">
              <div className="sticky top-24 bg-surface-subtle border border-surface-border rounded-md p-4 shadow-sm">
                <h2 className="text-xs font-bold uppercase tracking-wider text-brand-ink mb-3">
                  Table of Contents
                </h2>
                <ul className="space-y-2 text-xs">
                  {sections.map((sec) => (
                    <li key={sec.id}>
                      <a
                        href={`#${sec.id}`}
                        className="text-ink-muted hover:text-brand-green hover:underline block leading-snug"
                      >
                        {sec.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          )}

          {/* Article Text */}
          <article className={sections.length > 0 ? 'md:col-span-3 prose prose-sm max-w-none' : 'max-w-none'}>
            <div className="space-y-8 text-sm text-ink-muted leading-relaxed">
              {children}
            </div>
          </article>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-surface-border bg-surface-subtle py-8">
        <div className="max-w-site mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-ink-muted gap-4">
          <div>
            © 2026 Supplivix. Beauty & Wellness Vitamins. Cash on Delivery across Pakistan.
          </div>
          <div className="flex items-center gap-4 text-sm text-brand-ink">
            <Link to="/privacy-policy" className="hover:text-brand-green">Privacy</Link>
            <Link to="/terms" className="hover:text-brand-green">Terms</Link>
            <Link to="/shipping-policy" className="hover:text-brand-green">Shipping</Link>
            <Link to="/returns-policy" className="hover:text-brand-green">Returns</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
