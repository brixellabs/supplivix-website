import { useEffect } from 'react';

/**
 * SEOHead: Lightweight client-side meta and structured data injector for SPA.
 * Manages document.title (under 60 chars), meta description (under 160 chars),
 * canonical URL, OpenGraph tags, Twitter Card tags, robots indexing,
 * and Schema.org JSON-LD scripts for SEO & AEO (Phase 6).
 */
export default function SEOHead({
  title,
  description,
  canonical,
  ogImage = '/src/assets/brand/logo.png',
  ogType = 'website',
  noindex = false,
  schema = null,
  alternateLanguages = null,
}) {
  useEffect(() => {
    // 1. Title (strictly under 60 characters)
    let rawTitle = title
      ? title.includes('Supplivix')
        ? title
        : `${title} | Supplivix`
      : 'Supplivix | Bioavailable Multivitamins Pakistan';
    const formattedTitle = rawTitle.slice(0, 59);
    document.title = formattedTitle;

    // Helper to find or create a meta tag
    const setMetaTag = (attribute, attrValue, content) => {
      if (!content) return;
      let el = document.querySelector(`meta[${attribute}="${attrValue}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attribute, attrValue);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // 2. Standard Meta Description (strictly under 160 characters)
    const defaultDesc =
      'Supplivix is Pakistan premier wellness store for bioavailable multivitamins and skincare. 100% Cash on Delivery with free delivery over Rs. 2,000.';
    const finalDesc = (description || defaultDesc).slice(0, 158);
    setMetaTag('name', 'description', finalDesc);

    // 3. Robots
    setMetaTag('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');

    // 4. Canonical Link
    const baseSiteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://supplivix.com';
    const finalCanonical = canonical
      ? canonical.startsWith('http')
        ? canonical
        : `${baseSiteUrl}${canonical.startsWith('/') ? '' : '/'}${canonical}`
      : typeof window !== 'undefined'
      ? window.location.href.split('?')[0]
      : `${baseSiteUrl}/`;

    let canonicalEl = document.querySelector('link[rel="canonical"]');
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute('href', finalCanonical);

    // 4b. Alternate hreflang tags for multilingual SEO
    const existingAlternates = document.querySelectorAll('link[rel="alternate"][hreflang]');
    existingAlternates.forEach((el) => el.remove());

    if (Array.isArray(alternateLanguages) && alternateLanguages.length > 0) {
      alternateLanguages.forEach(({ hreflang, href }) => {
        if (!hreflang || !href) return;
        const linkEl = document.createElement('link');
        linkEl.setAttribute('rel', 'alternate');
        linkEl.setAttribute('hreflang', hreflang);
        const finalHref = href.startsWith('http') ? href : `${baseSiteUrl}${href.startsWith('/') ? '' : '/'}${href}`;
        linkEl.setAttribute('href', finalHref);
        document.head.appendChild(linkEl);
      });
    }

    // 5. OpenGraph
    setMetaTag('property', 'og:title', formattedTitle);
    setMetaTag('property', 'og:description', finalDesc);
    setMetaTag('property', 'og:type', ogType);
    setMetaTag('property', 'og:url', finalCanonical);
    setMetaTag(
      'property',
      'og:image',
      ogImage.startsWith('http') ? ogImage : `${baseSiteUrl}${ogImage}`
    );
    setMetaTag('property', 'og:site_name', 'Supplivix');

    // 6. Twitter Card
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', formattedTitle);
    setMetaTag('name', 'twitter:description', finalDesc);
    setMetaTag(
      'name',
      'twitter:image',
      ogImage.startsWith('http') ? ogImage : `${baseSiteUrl}${ogImage}`
    );

    // 7. Structured Data (JSON-LD) for AEO & Rich Snippets
    let scriptEl = document.getElementById('supplivix-jsonld-schema');
    if (schema) {
      if (!scriptEl) {
        scriptEl = document.createElement('script');
        scriptEl.id = 'supplivix-jsonld-schema';
        scriptEl.type = 'application/ld+json';
        document.head.appendChild(scriptEl);
      }

      const defaultOrg = {
        '@type': 'Organization',
        name: 'Supplivix',
        url: 'https://supplivix.com',
        logo: 'https://supplivix.com/assets/logo.png',
        sameAs: [
          'https://www.instagram.com/supp.livix?utm_source=qr&xtok=YWhramgxNjNqOGI2',
          'https://wa.me/923025222405',
        ],
        contactPoint: {
          '@type': 'ContactPoint',
          telephone: '+92-302-5222405',
          contactType: 'customer support',
          areaServed: 'PK',
          availableLanguage: ['English', 'Urdu'],
        },
      };

      const defaultWebSite = {
        '@type': 'WebSite',
        name: 'Supplivix',
        url: 'https://supplivix.com',
        potentialAction: {
          '@type': 'SearchAction',
          target: 'https://supplivix.com/shop?search={search_term_string}',
          'query-input': 'required name=search_term_string',
        },
      };

      let finalJsonLd;
      if (schema['@graph']) {
        finalJsonLd = schema;
      } else {
        const items = Array.isArray(schema) ? schema : [schema];
        finalJsonLd = {
          '@context': 'https://schema.org',
          '@graph': [defaultOrg, defaultWebSite, ...items],
        };
      }

      scriptEl.textContent = JSON.stringify(finalJsonLd);
    } else if (scriptEl) {
      scriptEl.remove();
    }
  }, [title, description, canonical, ogImage, ogType, noindex, schema, JSON.stringify(alternateLanguages)]);

  return null;
}
