import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import SEOHead from '../components/seo/SEOHead';

describe('Phase 6: Frontend SEO & AEO (SEOHead Component)', () => {
  beforeEach(() => {
    // Reset head elements before each test
    document.title = '';
    const metaTags = document.querySelectorAll('meta[name="description"], meta[name="robots"], meta[property^="og:"], meta[name^="twitter:"]');
    metaTags.forEach((el) => el.remove());

    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.remove();

    const schema = document.getElementById('supplivix-jsonld-schema');
    if (schema) schema.remove();
  });

  it('sets document title with | Supplivix suffix and sets description', () => {
    render(
      <SEOHead
        title="Multivitamins Hub"
        description="Explore targeted multivitamins formulated for optimal cellular absorption."
      />
    );

    expect(document.title).toBe('Multivitamins Hub | Supplivix');
    const descMeta = document.querySelector('meta[name="description"]');
    expect(descMeta).not.toBeNull();
    expect(descMeta.getAttribute('content')).toBe(
      'Explore targeted multivitamins formulated for optimal cellular absorption.'
    );
  });

  it('sets canonical link and OpenGraph tags correctly', () => {
    render(
      <SEOHead
        title="Daily Multivitamin 60s"
        canonical="/products/daily-multi-60s"
        ogType="product"
        ogImage="/images/multi.jpg"
      />
    );

    const canonical = document.querySelector('link[rel="canonical"]');
    expect(canonical).not.toBeNull();
    expect(canonical.getAttribute('href')).toContain('/products/daily-multi-60s');

    const ogTitle = document.querySelector('meta[property="og:title"]');
    expect(ogTitle.getAttribute('content')).toBe('Daily Multivitamin 60s | Supplivix');

    const ogType = document.querySelector('meta[property="og:type"]');
    expect(ogType.getAttribute('content')).toBe('product');
  });

  it('configures robots meta tag for noindex routes', () => {
    render(
      <SEOHead
        title="Order Lookup"
        noindex={true}
      />
    );

    const robots = document.querySelector('meta[name="robots"]');
    expect(robots).not.toBeNull();
    expect(robots.getAttribute('content')).toBe('noindex, nofollow');
  });

  it('injects JSON-LD schema for search engines and AEO parsers', () => {
    const productSchema = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: 'Supplivix Complete Daily Multivitamin 60s',
      offers: {
        '@type': 'Offer',
        priceCurrency: 'PKR',
        price: '2400',
        availability: 'https://schema.org/InStock',
      },
    };

    render(
      <SEOHead
        title="Complete Daily Multivitamin"
        schema={productSchema}
      />
    );

    const schemaScript = document.getElementById('supplivix-jsonld-schema');
    expect(schemaScript).not.toBeNull();
    expect(schemaScript.getAttribute('type')).toBe('application/ld+json');
    const parsed = JSON.parse(schemaScript.textContent);
    expect(parsed.name).toBe('Supplivix Complete Daily Multivitamin 60s');
    expect(parsed.offers.priceCurrency).toBe('PKR');
  });
});

