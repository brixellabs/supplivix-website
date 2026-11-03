import { useEffect } from 'react';

/**
 * SEOHead: Lightweight client-side meta and structured data injector for SPA.
 * Manages document.title, canonical link, OpenGraph tags, Twitter Card tags,
 * robots indexing, and Schema.org JSON-LD scripts for SEO & AEO (Phase 6).
 */
export default function SEOHead({
  title,
  description,
  canonical,
  ogImage = '/src/assets/brand/logo.png',
  ogType = 'website',
  noindex = false,
  schema = null,
}) {
  useEffect(() => {
    // 1. Title
    const formattedTitle = title
      ? `${title} | Supplivix`
      : 'Supplivix | Bioavailable Multivitamins & Skincare Pakistan';
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

    // 2. Standard Meta
    const defaultDesc =
      'Supplivix is Pakistan premier wellness platform for bioavailable multivitamins and skincare with Cash on Delivery nationwide.';
    const finalDesc = description || defaultDesc;
    setMetaTag('name', 'description', finalDesc);

    // 3. Robots
    setMetaTag('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');

    // 4. Canonical Link
    const baseSiteUrl = window.location.origin;
    const finalCanonical = canonical
      ? canonical.startsWith('http')
        ? canonical
        : `${baseSiteUrl}${canonical.startsWith('/') ? '' : '/'}${canonical}`
      : window.location.href.split('?')[0];

    let canonicalEl = document.querySelector('link[rel="canonical"]');
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute('href', finalCanonical);

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
      scriptEl.textContent = JSON.stringify(schema);
    } else if (scriptEl) {
      scriptEl.remove();
    }
  }, [title, description, canonical, ogImage, ogType, noindex, schema]);

  return null;
}

