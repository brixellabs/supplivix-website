import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.resolve(__dirname, '../dist');
const BASE_URL = 'https://supplivix.com';

const STATIC_ROUTES = [
  {
    path: '',
    title: 'Supplivix | Bioavailable Multivitamins Pakistan',
    description: 'Pakistan premier wellness store for bioavailable multivitamins and skincare. Nationwide Cash on Delivery with free shipping over Rs. 2,000.',
    schema: {
      '@type': 'WebSite',
      name: 'Supplivix',
      url: BASE_URL,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${BASE_URL}/shop?search={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
    heading: 'Supplivix - Bioavailable Multivitamins & Skincare Pakistan',
    summary: 'Discover bioavailable multivitamin formulations and science-backed skincare engineered for Pakistani wellness demands. 100% Cash on Delivery nationwide.',
  },
  {
    path: 'multivitamins',
    title: 'Multivitamins Hub | Bioavailable Formulas Pakistan',
    description: "Explore Pakistan's premier bioavailable multivitamin formulations. 100% Cash on Delivery, zero credit card required, nationwide delivery.",
    schema: {
      '@type': 'CollectionPage',
      name: 'Multivitamins Hub',
      url: `${BASE_URL}/multivitamins/`,
    },
    heading: 'Bioavailable Multivitamins for Daily Vitality',
    summary: 'Specifically formulated to address documented micronutrient deficiencies across Pakistan. Chelated zinc, active B-complex, and methylfolate with nationwide Cash on Delivery.',
  },
  {
    path: 'shop',
    title: 'Shop Bioavailable Multivitamins & Care | Supplivix',
    description: 'Explore all science-backed multivitamins and skincare formulas. Nationwide Cash on Delivery with free delivery over Rs. 2,000.',
    schema: {
      '@type': 'CollectionPage',
      name: 'Catalog Products',
      url: `${BASE_URL}/shop/`,
    },
    heading: 'Supplivix Wellness Catalog',
    summary: 'Full range of dietary multivitamins and dermatological skincare formulations. Whole PKR pricing with Cash on Delivery nationwide.',
  },
  {
    path: 'about',
    title: 'About Supplivix | Bioavailable Wellness Pakistan',
    description: 'Supplivix was founded in Karachi to eliminate widespread micronutrient deficiencies in Pakistan with certified bioavailable nutrition.',
    schema: {
      '@type': 'AboutPage',
      name: 'About Supplivix',
      url: `${BASE_URL}/about/`,
    },
    heading: 'About Supplivix Labs',
    summary: 'Founded in Karachi to bring premium bioavailable nutrition and evidence-based wellness to every Pakistani home with reliable Cash on Delivery.',
  },
  {
    path: 'contact',
    title: 'Contact Supplivix Care | Nationwide COD Support',
    description: 'Get in touch with Supplivix customer care in Karachi. Phone, WhatsApp, and email support for all Cash on Delivery orders across Pakistan.',
    schema: {
      '@type': 'ContactPage',
      name: 'Contact Supplivix Care',
      url: `${BASE_URL}/contact/`,
    },
    heading: 'Customer Support & Inquiries',
    summary: 'Our dedicated customer care team in Karachi is available Monday through Saturday. Phone: +92 300 0000000 | Email: care@supplivix.pk',
  },
  {
    path: 'privacy-policy',
    title: 'Privacy Policy | Supplivix Pakistan',
    description: 'Learn how Supplivix protects your personal, order, and delivery information across our Cash on Delivery platform in Pakistan.',
    schema: {
      '@type': 'WebPage',
      name: 'Privacy Policy',
      url: `${BASE_URL}/privacy-policy/`,
    },
    heading: 'Official Privacy Policy',
    summary: 'Supplivix respects your privacy and adheres to data minimization principles. We collect delivery and order details solely for courier fulfillment.',
  },
  {
    path: 'terms',
    title: 'Terms of Service | Supplivix Pakistan',
    description: 'Review our official terms and conditions for ordering bioavailable wellness formulations via Cash on Delivery in Pakistan.',
    schema: {
      '@type': 'WebPage',
      name: 'Terms of Service',
      url: `${BASE_URL}/terms/`,
    },
    heading: 'Terms of Service',
    summary: 'Official terms governing storefront access, nationwide Cash on Delivery orders, courier dispatch, and customer accounts in Pakistan.',
  },
  {
    path: 'shipping-policy',
    title: 'Shipping & COD Delivery Policy | Supplivix',
    description: 'Nationwide Cash on Delivery shipping terms across Pakistan. Free shipping on orders over Rs. 2,000; flat Rs. 200 delivery fee below.',
    schema: {
      '@type': 'WebPage',
      name: 'Shipping & Delivery Policy',
      url: `${BASE_URL}/shipping-policy/`,
    },
    heading: 'Nationwide Shipping & COD Policy',
    summary: 'Every order ships via tracked courier across Pakistan with Cash on Delivery. Free shipping unlocked at Rs. 2,000; flat Rs. 200 fee below.',
  },
  {
    path: 'returns-policy',
    title: '7-Day Return Policy & Guarantee | Supplivix',
    description: 'Read our hassle-free 7-day return policy for sealed wellness formulations delivered via Cash on Delivery across Pakistan.',
    schema: {
      '@type': 'WebPage',
      name: 'Return Policy',
      url: `${BASE_URL}/returns-policy/`,
    },
    heading: '7-Day Return Policy & Guarantee',
    summary: 'Unopened, tamper-sealed formulations may be returned within 7 calendar days of courier delivery for a replacement or refund.',
  },
];

function prerender() {
  const baseHtmlPath = path.join(DIST_DIR, 'index.html');
  if (!fs.existsSync(baseHtmlPath)) {
    console.error('Base dist/index.html not found. Run vite build first.');
    process.exit(1);
  }

  const baseHtml = fs.readFileSync(baseHtmlPath, 'utf-8');

  for (const route of STATIC_ROUTES) {
    const canonical = route.path ? `${BASE_URL}/${route.path}/` : `${BASE_URL}/`;
    const targetDir = route.path ? path.join(DIST_DIR, route.path) : DIST_DIR;
    const targetFile = path.join(targetDir, 'index.html');

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const jsonLd = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          name: 'Supplivix',
          url: BASE_URL,
          logo: `${BASE_URL}/assets/logo.png`,
          contactPoint: {
            '@type': 'ContactPoint',
            telephone: '+92-300-0000000',
            contactType: 'customer support',
            areaServed: 'PK',
            availableLanguage: ['English', 'Urdu'],
          },
        },
        route.schema,
      ],
    });

    const metaTags = `
    <title>${route.title}</title>
    <meta name="description" content="${route.description}" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="${canonical}" />
    <meta property="og:title" content="${route.title}" />
    <meta property="og:description" content="${route.description}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:type" content="website" />
    <meta property="og:image" content="${BASE_URL}/assets/logo.png" />
    <meta property="og:site_name" content="Supplivix" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${route.title}" />
    <meta name="twitter:description" content="${route.description}" />
    <meta name="twitter:image" content="${BASE_URL}/assets/logo.png" />
    <script type="application/ld+json">${jsonLd}</script>
`;

    const prerenderedBody = `
    <noscript>
      <div id="prerendered-content" style="padding:24px;max-width:800px;margin:0 auto;font-family:sans-serif;">
        <h1>${route.heading}</h1>
        <p>${route.summary}</p>
        <p><small>Dietary Supplement Notice: These statements have not been evaluated by a regulator. This product is not intended to diagnose, treat, cure, or prevent any disease.</small></p>
      </div>
    </noscript>
`;

    let html = baseHtml.replace(/<title>.*?<\/title>/s, '');
    html = html.replace('</head>', `${metaTags}  </head>`);
    html = html.replace(/<body([^>]*)>/, `<body$1>${prerenderedBody}`);

    fs.writeFileSync(targetFile, html, 'utf-8');
    console.log(`Pre-rendered route: /${route.path} -> ${path.relative(DIST_DIR, targetFile)}`);
  }

  console.log('Static routes pre-rendering complete: full HTML present without JavaScript.');
}

prerender();
