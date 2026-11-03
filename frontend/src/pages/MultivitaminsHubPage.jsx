import React from 'react';
import { Link } from 'react-router-dom';
import Breadcrumbs from '../components/layout/Breadcrumbs';
import Icon from '../components/ui/Icon';
import Button from '../components/ui/Button';
import Accordion from '../components/ui/Accordion';
import SEOHead from '../components/seo/SEOHead';

const COMPARISON_DATA = [
  {
    name: 'Complete Daily Multi',
    target: 'All Adults (Unisex)',
    serving: '1 Tablet Daily',
    count: '60 Tablets (2 Mo.)',
    nutrients: '24 Vitamins + Zinc + Bioavailable Iron',
    price: 2450,
    slug: 'supplivix-complete-daily-multivitamin-60s',
  },
  {
    name: 'Men\'s Active Energy',
    target: 'Active Men',
    serving: '1 Tablet Daily',
    count: '60 Tablets (2 Mo.)',
    nutrients: 'High B-Complex, Magnesium, CoQ10 Support',
    price: 2600,
    slug: 'mens-active-daily-energy-multivitamin',
  },
  {
    name: 'Women\'s Balanced Multi',
    target: 'Adult Women',
    serving: '1 Tablet Daily',
    count: '60 Tablets (2 Mo.)',
    nutrients: 'Folate, Iron, Evening Primrose, Biotin',
    price: 2600,
    slug: 'womens-complete-balanced-multivitamin',
  },
  {
    name: 'Immunity Shield C+Zinc',
    target: 'Seasonal Defense',
    serving: '1 Tablet Daily',
    count: '30 Tablets (1 Mo.)',
    nutrients: 'Vitamin C 1000mg, Zinc 20mg, Elderberry',
    price: 1850,
    slug: 'advanced-vitamin-c-zinc-immunity-shield-30s',
  },
];

const FAQS = [
  {
    id: 'timing',
    title: 'When is the best time of day to take my multivitamin?',
    content:
      'We recommend taking your multivitamin in the morning with breakfast or lunch. Fat-soluble vitamins (A, D, E, and K) absorb most efficiently when consumed with a meal containing healthy dietary fats.',
  },
  {
    id: 'halal',
    title: 'Are Supplivix multivitamins halal and 100% vegetarian?',
    content:
      'Yes. All Supplivix multivitamin tablets and vegetable capsules are certified Halal and formulated without animal by-products or gelatin. Softgels use vegetable-derived cellulose shells.',
  },
  {
    id: 'medication',
    title: 'Can I take these alongside my daily prescription medications?',
    content:
      'While our formulas use bioavailable nutritional dosages, we advise consulting your physician before starting any new dietary supplement, especially if you are taking blood thinners or thyroid medications.',
  },
  {
    id: 'results',
    title: 'How long until I notice improvements in my vitality and skin?',
    content:
      'Nutritional replenishment is progressive. Most customers report noticeable energy and focus improvements within 2 to 3 weeks of daily compliance, with skin barrier and nail improvements typically appearing around 6 to 8 weeks.',
  },
];

export default function MultivitaminsHubPage() {
  const hubSchema = [
    {
      '@type': 'CollectionPage',
      name: 'Multivitamins Hub',
      description: 'Discover bioavailable multivitamins formulated for cellular absorption in Pakistan.',
      url: 'https://supplivix.com/multivitamins/',
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: COMPARISON_DATA.map((item, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          name: item.name,
          url: `https://supplivix.com/products/${item.slug}/`,
        })),
      },
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQS.map((faq) => ({
        '@type': 'Question',
        name: faq.title,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.content,
        },
      })),
    },
  ];

  return (
    <div className="bg-white">
      <SEOHead
        title="Multivitamins Hub | Bioavailable Formulas Pakistan"
        description="Discover bioavailable multivitamins formulated for optimal cellular absorption. 100% Cash on Delivery across Pakistan."
        canonical="/multivitamins"
        schema={hubSchema}
      />
      <Breadcrumbs items={[{ label: 'Multivitamins Hub', href: '/multivitamins' }]} />

      {/* Flagship Hero Header */}
      <section className="bg-surface-subtle border-b border-surface-border py-12 md:py-16">
        <div className="max-w-site mx-auto px-4 sm:px-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-brand-lavender text-brand-purple border border-brand-lime px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
              <Icon name="capsules" className="text-xs" />
              <span>Flagship Nutritional Focus</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold uppercase tracking-tight text-brand-ink leading-tight mb-4">
              Bioavailable Multivitamins for Daily Vitality
            </h1>

            {/* AEO 40-60 Word Direct Summary */}
            <div className="mb-6 p-4 bg-white border-l-4 border-brand-green rounded-r-md shadow-sm text-xs md:text-sm text-brand-ink leading-relaxed">
              <strong className="block text-[11px] uppercase tracking-wider text-brand-green mb-1 font-bold">
                Hub Formulation Brief:
              </strong>
              <span>
                Supplivix multivitamins are bioavailable micronutrient formulations engineered for adults to address documented nutritional deficiencies. They support cellular vitality, metabolic energy, and immune resilience with chelated zinc, methylfolate, and active B-complex vitamins. Delivered nationwide across Pakistan via standard Cash on Delivery.
              </span>
            </div>

            <p className="text-sm md:text-base text-ink-muted leading-relaxed mb-6">
              Specifically formulated to address documented micronutrient deficiencies across Pakistan (including Vitamin D3, B12, Zinc, and active Folate). Delivered nationwide with Cash on Delivery (COD).
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs font-bold">
              <div className="flex items-center gap-2 bg-white border border-surface-border px-3 py-2 rounded-sm shadow-sm">
                <Icon name="check" className="text-brand-green" />
                <span>Zero Harsh Fillers</span>
              </div>
              <div className="flex items-center gap-2 bg-white border border-surface-border px-3 py-2 rounded-sm shadow-sm">
                <Icon name="check" className="text-brand-green" />
                <span>Chelated Mineral Absorption</span>
              </div>
              <div className="flex items-center gap-2 bg-white border border-surface-border px-3 py-2 rounded-sm shadow-sm">
                <Icon name="check" className="text-brand-green" />
                <span>Free Shipping over Rs. 2,000</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hub Guides: Choosing Your Category */}
      <section className="py-12 bg-white border-b border-surface-border">
        <div className="max-w-site mx-auto px-4 sm:px-6">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-green">
              Tailored Formulations
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-brand-ink mt-1">
              Choose by Daily Need
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border border-surface-border rounded-lg p-6 bg-surface-subtle shadow-card flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 bg-brand-green text-white rounded-md flex items-center justify-center mb-4">
                  <Icon name="capsules" className="text-xl" />
                </div>
                <h3 className="text-base font-bold uppercase tracking-wide text-brand-ink mb-2">
                  Complete Daily Essentials
                </h3>
                <p className="text-xs text-ink-muted leading-relaxed mb-4">
                  Comprehensive 24-nutrient foundation for everyday stamina, cellular renewal, and cognitive clarity.
                </p>
              </div>
              <Link to="/shop?category=multivitamins">
                <Button variant="outline" size="sm" className="w-full">
                  View Daily Multivitamins
                </Button>
              </Link>
            </div>

            <div className="border border-surface-border rounded-lg p-6 bg-surface-subtle shadow-card flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 bg-brand-purple text-white rounded-md flex items-center justify-center mb-4">
                  <Icon name="shield" className="text-xl" />
                </div>
                <h3 className="text-base font-bold uppercase tracking-wide text-brand-ink mb-2">
                  Immunity & Defense
                </h3>
                <p className="text-xs text-ink-muted leading-relaxed mb-4">
                  High-potency Vitamin C, Vitamin D3, and Zinc Glycinate to reinforce upper respiratory immunity.
                </p>
              </div>
              <Link to="/shop?category=immunity">
                <Button variant="outline" size="sm" className="w-full">
                  View Immunity Range
                </Button>
              </Link>
            </div>

            <div className="border border-surface-border rounded-lg p-6 bg-surface-subtle shadow-card flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 bg-brand-ink text-white rounded-md flex items-center justify-center mb-4">
                  <Icon name="leaf" className="text-xl" />
                </div>
                <h3 className="text-base font-bold uppercase tracking-wide text-brand-ink mb-2">
                  Skin & Keratin Glow
                </h3>
                <p className="text-xs text-ink-muted leading-relaxed mb-4">
                  Biotin, hydrolyzed marine collagen peptides, and Vitamin E to nurture hair density and skin elasticity.
                </p>
              </div>
              <Link to="/shop?category=skin-glow">
                <Button variant="outline" size="sm" className="w-full">
                  View Glow Formulas
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Formula Comparison Table */}
      <section className="py-12 bg-surface-subtle border-b border-surface-border">
        <div className="max-w-site mx-auto px-4 sm:px-6">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-green">
              Side-by-Side Comparison
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-brand-ink mt-1">
              Find Your Ideal Formula
            </h2>
          </div>

          <div className="overflow-x-auto bg-white border border-surface-border rounded-lg shadow-card">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-subtle border-b border-surface-border text-brand-ink uppercase font-bold tracking-wider">
                  <th className="p-4">Formula</th>
                  <th className="p-4">Target User</th>
                  <th className="p-4">Daily Dosage</th>
                  <th className="p-4">Pack Size</th>
                  <th className="p-4">Key Active Nutrients</th>
                  <th className="p-4">Price (COD)</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {COMPARISON_DATA.map((item, idx) => (
                  <tr key={idx} className="hover:bg-surface-subtle transition-colors">
                    <td className="p-4 font-bold text-brand-ink">
                      {item.name}
                    </td>
                    <td className="p-4 text-ink-muted">{item.target}</td>
                    <td className="p-4 text-ink-muted">{item.serving}</td>
                    <td className="p-4 text-ink-muted">{item.count}</td>
                    <td className="p-4 text-ink-muted">{item.nutrients}</td>
                    <td className="p-4 font-bold text-brand-ink">
                      Rs. {item.price.toLocaleString()}
                    </td>
                    <td className="p-4 text-right">
                      <Link to={`/products/${item.slug}`}>
                        <Button variant="primary" size="sm" className="text-xs py-1.5 px-3">
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Multivitamin FAQ Section */}
      <section className="py-12 bg-white border-b border-surface-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-green">
              Frequently Asked Questions
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-brand-ink mt-1">
              Multivitamin Guidance
            </h2>
          </div>

          <Accordion items={FAQS} />

          {/* Mandatory Health Disclaimer */}
          <div className="mt-8 p-4 bg-surface-subtle border border-surface-border rounded-md text-xs text-ink-muted leading-relaxed">
            <span className="font-bold text-brand-ink block mb-1">Health Notice:</span>
            These statements have not been evaluated by a regulator. This product is not intended to diagnose, treat, cure or prevent any disease.
          </div>
        </div>
      </section>
    </div>
  );
}
