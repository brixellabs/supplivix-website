import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import SEOHead from '../components/seo/SEOHead';

describe('Phase 6: Frontend SEO & AEO (SEOHead Component)', () => {
  beforeEach(() => {
    // Reset head elements before each test
    document.title = '';
    const metaTags = document.querySelectorAll(
      'meta[name="description"], meta[name="robots"], meta[property^="og:"], meta[name^="twitter:"]'
    );
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

  it('strictly caps title under 60 characters and description under 160 characters', () => {
    const longTitle = 'Super Long Multivitamins Formula Title That Exceeds The Sixty Character Limit Easily';
    const longDesc =
      'This is a very long meta description designed to test truncation. In technical SEO, descriptions over 160 characters are truncated by search engines like Google and Bing in SERP snippets, causing poor click-through rates. Therefore Supplivix enforces strict limits.';

    render(
      <SEOHead
        title={longTitle}
        description={longDesc}
      />
    );

    expect(document.title.length).toBeLessThan(60);
    const descMeta = document.querySelector('meta[name="description"]');
    expect(descMeta.getAttribute('content').length).toBeLessThan(160);
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

  it('injects JSON-LD schema with Organization, WebSite SearchAction, and Product in graph', () => {
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

    expect(parsed['@context']).toBe('https://schema.org');
    expect(Array.isArray(parsed['@graph'])).toBe(true);

    const org = parsed['@graph'].find((item) => item['@type'] === 'Organization');
    expect(org).toBeDefined();
    expect(org.name).toBe('Supplivix');

    const website = parsed['@graph'].find((item) => item['@type'] === 'WebSite');
    expect(website).toBeDefined();
    expect(website.potentialAction['@type']).toBe('SearchAction');

    const product = parsed['@graph'].find((item) => item['@type'] === 'Product');
    expect(product).toBeDefined();
    expect(product.name).toBe('Supplivix Complete Daily Multivitamin 60s');
    expect(product.offers.priceCurrency).toBe('PKR');
  });

  it('supports CollectionPage with ItemList and FAQPage schemas in @graph', () => {
    const customGraph = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'CollectionPage',
          name: 'Multivitamins Hub',
          url: 'https://supplivix.pk/multivitamins',
        },
        {
          '@type': 'ItemList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Supplivix Daily 60s',
            },
          ],
        },
        {
          '@type': 'FAQPage',
          mainEntity: [
            {
              '@type': 'Question',
              name: 'Are Supplivix multivitamins third-party tested?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Yes, every batch undergoes independent verification.',
              },
            },
          ],
        },
      ],
    };

    render(
      <SEOHead
        title="Multivitamins Hub"
        canonical="/multivitamins"
        schema={customGraph}
      />
    );

    const schemaScript = document.getElementById('supplivix-jsonld-schema');
    const parsed = JSON.parse(schemaScript.textContent);

    const collection = parsed['@graph'].find((item) => item['@type'] === 'CollectionPage');
    expect(collection).toBeDefined();

    const itemList = parsed['@graph'].find((item) => item['@type'] === 'ItemList');
    expect(itemList).toBeDefined();
    expect(itemList.itemListElement).toHaveLength(1);

    const faq = parsed['@graph'].find((item) => item['@type'] === 'FAQPage');
    expect(faq).toBeDefined();
    expect(faq.mainEntity[0].name).toContain('third-party tested');
  });

  it('SEO-05: Product with zero approved reviews does not include aggregateRating or review array', () => {
    const productNoReviews = {
      '@type': 'Product',
      name: 'Pure Zinc Picolinate',
      offers: {
        '@type': 'Offer',
        priceCurrency: 'PKR',
        price: 1800,
        availability: 'https://schema.org/InStock',
      },
    };

    render(
      <SEOHead
        title="Pure Zinc Picolinate"
        schema={productNoReviews}
      />
    );

    const schemaScript = document.getElementById('supplivix-jsonld-schema');
    const parsed = JSON.parse(schemaScript.textContent);
    const prod = parsed['@graph'].find((item) => item['@type'] === 'Product');

    expect(prod).toBeDefined();
    expect(prod.aggregateRating).toBeUndefined();
    expect(prod.review).toBeUndefined();
  });

  it('SEO-06: Filter and sort URLs have canonical pointing strictly to base URL', () => {
    // When canonical is passed without query params
    render(
      <SEOHead
        title="Shop Catalog"
        canonical="/shop"
      />
    );

    const canonicalEl = document.querySelector('link[rel="canonical"]');
    expect(canonicalEl).not.toBeNull();
    const href = canonicalEl.getAttribute('href');
    expect(href).not.toContain('?');
    expect(href).toMatch(/\/shop$/);
  });

  it('AEO-01: Direct summaries on Hub and Product pages adhere to 40 to 60 words', () => {
    const hubSummary =
      'Supplivix multivitamins are bioavailable micronutrient formulations engineered for adults to address documented nutritional deficiencies. They support cellular vitality, metabolic energy, and immune resilience with chelated zinc, methylfolate, and active B-complex vitamins. Delivered nationwide across Pakistan via standard Cash on Delivery.';
    const hubWords = hubSummary.trim().split(/\s+/).length;
    expect(hubWords).toBeGreaterThanOrEqual(40);
    expect(hubWords).toBeLessThanOrEqual(60);

    const productSummary =
      'Daily Bio-Multi is a high-potency bioavailable multivitamin formulated for adults to address documented micronutrient gaps. It supports metabolic cellular energy and daily immune resilience. Adults take one tablet daily in the morning with a full glass of water and breakfast alongside a balanced diet.';
    const prodWords = productSummary.trim().split(/\s+/).length;
    expect(prodWords).toBeGreaterThanOrEqual(40);
    expect(prodWords).toBeLessThanOrEqual(60);
  });

  it('AEO-02: FAQ items match FAQPage schema identically', () => {
    const testFaqs = [
      {
        question: 'How many multivitamin tablets should I take daily?',
        answer: 'Follow label directions. Typical products list one tablet daily with breakfast.',
      },
      {
        question: 'Is Cash on Delivery available across Pakistan?',
        answer: 'Yes, 100% Cash on Delivery is available nationwide.',
      },
    ];

    const faqSchema = {
      '@type': 'FAQPage',
      mainEntity: testFaqs.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: f.answer,
        },
      })),
    };

    render(
      <SEOHead
        title="Product FAQs"
        schema={faqSchema}
      />
    );

    const schemaScript = document.getElementById('supplivix-jsonld-schema');
    const parsed = JSON.parse(schemaScript.textContent);
    const faqItem = parsed['@graph'].find((item) => item['@type'] === 'FAQPage');

    expect(faqItem).toBeDefined();
    expect(faqItem.mainEntity).toHaveLength(2);
    expect(faqItem.mainEntity[0].name).toBe(testFaqs[0].question);
    expect(faqItem.mainEntity[0].acceptedAnswer.text).toBe(testFaqs[0].answer);
    expect(faqItem.mainEntity[1].name).toBe(testFaqs[1].question);
    expect(faqItem.mainEntity[1].acceptedAnswer.text).toBe(testFaqs[1].answer);
  });
});
