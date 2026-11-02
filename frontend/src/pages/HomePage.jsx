import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/ui/Icon';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import ProductIllustration from '../components/ui/ProductIllustration';
import ProductCard from '../components/product/ProductCard';
import Input from '../components/ui/Input';
import SEOHead from '../components/seo/SEOHead';
import { useToast } from '../components/ui/Toast';
import { api } from '../services/api';

const DEFAULT_PRODUCTS = [
  {
    id: 1,
    name: 'Supplivix Complete Daily Multivitamin 60s',
    slug: 'supplivix-complete-daily-multivitamin-60s',
    product_type: 'multivitamin',
    category_name: 'Multivitamins',
    price: 2450,
    compare_at_price: 2900,
    rating: 4.9,
    reviews_count: 52,
    inventory_count: 100,
    is_featured: true,
    serving_size: '60 Tablets',
  },
  {
    id: 2,
    name: 'Advanced Vitamin C + Zinc Immunity Shield 30s',
    slug: 'advanced-vitamin-c-zinc-immunity-shield-30s',
    product_type: 'multivitamin',
    category_name: 'Immunity',
    price: 1850,
    compare_at_price: 2200,
    rating: 4.8,
    reviews_count: 38,
    inventory_count: 85,
    is_featured: true,
    serving_size: '30 Tablets',
  },
  {
    id: 3,
    name: 'Radiant Glow Biotin & Collagen Complex',
    slug: 'radiant-glow-biotin-collagen-complex',
    product_type: 'multivitamin',
    category_name: 'Skin & Glow',
    price: 2750,
    compare_at_price: 3300,
    rating: 4.9,
    reviews_count: 44,
    inventory_count: 60,
    is_featured: true,
    serving_size: '60 Capsules',
  },
  {
    id: 4,
    name: 'Niacinamide 10% + Zinc Clarifying Serum 30ml',
    slug: 'niacinamide-10-zinc-clarifying-serum-30ml',
    product_type: 'skincare',
    category_name: 'Skin Care',
    price: 1650,
    compare_at_price: 1950,
    rating: 4.7,
    reviews_count: 29,
    inventory_count: 45,
    is_featured: false,
    serving_size: '30ml Dropper',
  },
  {
    id: 5,
    name: 'High Potency Vitamin D3 5000 IU + K2',
    slug: 'high-potency-vitamin-d3-5000-iu-k2',
    product_type: 'multivitamin',
    category_name: 'Bone & Joint',
    price: 1950,
    compare_at_price: 2300,
    rating: 4.9,
    reviews_count: 31,
    inventory_count: 70,
    is_featured: true,
    serving_size: '60 Softgels',
  },
  {
    id: 6,
    name: 'Ultra Hydrating Hyaluronic Barrier Cream 50ml',
    slug: 'ultra-hydrating-hyaluronic-barrier-cream-50ml',
    product_type: 'skincare',
    category_name: 'Skin Care',
    price: 1890,
    compare_at_price: 2250,
    rating: 4.8,
    reviews_count: 26,
    inventory_count: 55,
    is_featured: false,
    serving_size: '50ml Jar',
  },
  {
    id: 7,
    name: 'Men\'s Active Daily Energy Multivitamin',
    slug: 'mens-active-daily-energy-multivitamin',
    product_type: 'multivitamin',
    category_name: 'Multivitamins',
    price: 2600,
    compare_at_price: 3100,
    rating: 4.9,
    reviews_count: 35,
    inventory_count: 40,
    is_featured: true,
    serving_size: '60 Tablets',
  },
  {
    id: 8,
    name: 'Women\'s Complete Balanced Multivitamin',
    slug: 'womens-complete-balanced-multivitamin',
    product_type: 'multivitamin',
    category_name: 'Multivitamins',
    price: 2600,
    compare_at_price: 3100,
    rating: 5.0,
    reviews_count: 47,
    inventory_count: 65,
    is_featured: true,
    serving_size: '60 Tablets',
  },
];

const CATEGORIES = [
  { name: 'Multivitamins', icon: 'capsules', count: '14 Products', path: '/multivitamins', featured: true },
  { name: 'Skin & Glow', icon: 'leaf', count: '8 Products', path: '/shop?category=skin-glow' },
  { name: 'Immunity Shield', icon: 'shield', count: '6 Products', path: '/shop?category=immunity' },
  { name: 'Bone & Joints', icon: 'bolt', count: '5 Products', path: '/shop?category=bones-joints' },
  { name: 'Skin Care', icon: 'flask', count: '9 Products', path: '/shop?category=skincare' },
  { name: 'Hair & Nails', icon: 'star', count: '6 Products', path: '/shop?category=hair-nails' },
];

const HELP_TOPICS = [
  { label: 'Hair Fall & Thinning', filter: 'hair' },
  { label: 'Skin Brightening & Glow', filter: 'glow' },
  { label: 'Low Energy & Fatigue', filter: 'energy' },
  { label: 'Immunity & Seasonal Defense', filter: 'immunity' },
  { label: 'Joint Stiffness & Mobility', filter: 'joints' },
  { label: 'Dark Spots & Pigmentation', filter: 'spots' },
];

export default function HomePage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('bestsellers');
  const [products, setProducts] = useState(DEFAULT_PRODUCTS);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterHoneypot, setNewsletterHoneypot] = useState('');
  const [newsletterLoading, setNewsletterLoading] = useState(false);

  useEffect(() => {
    // Attempt to load from live catalog
    api.getProducts({ page_size: 8 })
      .then((data) => {
        if (data && data.results && data.results.length > 0) {
          setProducts(data.results);
        }
      })
      .catch(() => {
        // Retain fallback items
      });
  }, []);

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    if (!newsletterEmail || !newsletterEmail.includes('@')) {
      showToast('Please enter a valid email address.', 'error');
      return;
    }
    setNewsletterLoading(true);
    try {
      await api.joinWaitlist(newsletterEmail, newsletterHoneypot);
      showToast('Thank you for subscribing! Check your inbox soon.');
      setNewsletterEmail('');
    } catch {
      showToast('Unable to subscribe. Please try again.', 'error');
    } finally {
      setNewsletterLoading(false);
    }
  };

  const filteredProducts =
    activeTab === 'bestsellers'
      ? products.slice(0, 8)
      : [...products].reverse().slice(0, 8);

  return (
    <div className="bg-white">
      <SEOHead title="Bioavailable Multivitamins & Skincare Pakistan" description="Pakistan's premier multivitamins and science-backed skincare formulations. Crafted for maximum bioavailability with Cash on Delivery nationwide." canonical="/" />
      {/* 1. Hero Section: Multivitamins Focus */}
      <section className="bg-surface-subtle border-b border-surface-border py-12 md:py-16">
        <div className="max-w-site mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Hero Column */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 bg-brand-lavender text-brand-purple border border-brand-lime px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                <Icon name="capsules" className="text-xs" />
                <span>Multivitamins Collection</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold uppercase tracking-tight text-brand-ink leading-[1.15] mb-4">
                Daily vitamins for a <span className="text-brand-green">healthier, glowing</span> you
              </h1>
              <p className="text-sm md:text-base text-ink-muted max-w-xl leading-relaxed mb-8">
                Pakistan's premier multivitamins and science-backed skincare formulations. Crafted for maximum bioavailability with Cash on Delivery nationwide.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-4 mb-8">
                <Link to="/multivitamins">
                  <Button variant="primary" size="lg" className="h-[48px] px-7">
                    Shop Multivitamins
                  </Button>
                </Link>
                <Link to="/shop">
                  <Button variant="outline" size="lg" className="h-[48px] px-7">
                    Explore All Products
                  </Button>
                </Link>
              </div>

              {/* Quality Badges */}
              <div className="flex flex-wrap items-center gap-5 pt-6 border-t border-surface-border text-xs font-semibold text-ink-muted">
                <div className="flex items-center gap-1.5">
                  <Icon name="check" className="text-brand-green" />
                  <span>Bioavailable Minerals</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Icon name="check" className="text-brand-green" />
                  <span>Zero Harmful Binders</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Icon name="check" className="text-brand-green" />
                  <span>Cash on Delivery</span>
                </div>
              </div>
            </div>

            {/* Right Hero Column: Trio of Visual Bottles */}
            <div className="lg:col-span-5 flex items-center justify-center">
              <div className="bg-white border border-surface-border rounded-xl p-8 shadow-card w-full max-w-md relative">
                <div className="text-center mb-6">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-brand-green">
                    Daily Essentials Trio
                  </span>
                  <h2 className="text-lg font-bold text-brand-ink">
                    Core Multivitamins Series
                  </h2>
                </div>

                <div className="grid grid-cols-3 gap-2 items-end justify-center py-4">
                  <div className="flex flex-col items-center">
                    <ProductIllustration type="bottle" accentColor="#016a38" label="Daily 60s" size="sm" />
                    <span className="text-[10px] font-bold text-brand-ink mt-2 text-center">Complete Multi</span>
                  </div>
                  <div className="flex flex-col items-center -translate-y-2">
                    <ProductIllustration type="bottle" accentColor="#7a2fd0" label="Immunity" size="md" />
                    <span className="text-[10px] font-bold text-brand-green mt-2 text-center">Vitamin C+Zinc</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <ProductIllustration type="bottle" accentColor="#b497ed" label="Glow" size="sm" />
                    <span className="text-[10px] font-bold text-brand-ink mt-2 text-center">Biotin Glow</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-surface-border flex items-center justify-between text-xs">
                  <div>
                    <span className="text-ink-muted block text-[11px]">Bundle Offer</span>
                    <span className="font-bold text-brand-ink text-sm">Rs. 6,200</span>
                  </div>
                  <Link to="/multivitamins">
                    <Button variant="outline" size="sm" className="text-xs py-1.5 px-3">
                      View Formula
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Trust Strip (4 Solid Cards, WCAG AA Contrast, No Glassmorphism) */}
      <section className="border-b border-surface-border bg-white py-8">
        <div className="max-w-site mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="border border-surface-border bg-surface-subtle p-4 rounded-md flex items-center gap-3.5 shadow-sm">
              <div className="w-10 h-10 rounded-sm bg-white border border-surface-border flex items-center justify-center flex-shrink-0 text-brand-green">
                <Icon name="cod" className="text-lg" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-brand-ink">Cash on Delivery</h3>
                <p className="text-[11px] text-ink-muted">Verify & pay at your door</p>
              </div>
            </div>

            <div className="border border-surface-border bg-surface-subtle p-4 rounded-md flex items-center gap-3.5 shadow-sm">
              <div className="w-10 h-10 rounded-sm bg-white border border-surface-border flex items-center justify-center flex-shrink-0 text-brand-green">
                <Icon name="truck" className="text-lg" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-brand-ink">Free Delivery</h3>
                <p className="text-[11px] text-ink-muted">On orders above Rs. 2,000</p>
              </div>
            </div>

            <div className="border border-surface-border bg-surface-subtle p-4 rounded-md flex items-center gap-3.5 shadow-sm">
              <div className="w-10 h-10 rounded-sm bg-white border border-surface-border flex items-center justify-center flex-shrink-0 text-brand-green">
                <Icon name="shield" className="text-lg" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-brand-ink">100% Authentic</h3>
                <p className="text-[11px] text-ink-muted">Lab-tested bioavailable purity</p>
              </div>
            </div>

            <div className="border border-surface-border bg-surface-subtle p-4 rounded-md flex items-center gap-3.5 shadow-sm">
              <div className="w-10 h-10 rounded-sm bg-white border border-surface-border flex items-center justify-center flex-shrink-0 text-brand-green">
                <Icon name="returns" className="text-lg" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-brand-ink">7-Day Return</h3>
                <p className="text-[11px] text-ink-muted">Fast & easy exchanges</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Natural Choice Category Grid */}
      <section className="py-12 md:py-16 bg-white border-b border-surface-border">
        <div className="max-w-site mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-brand-green">
                Tailored Formulations
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-brand-ink">
                The Natural Choice
              </h2>
            </div>
            <Link to="/shop" className="text-xs font-bold uppercase tracking-wider text-brand-green hover:underline flex items-center gap-1">
              <span>View All Categories</span>
              <Icon name="arrow-right" className="text-xs" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {CATEGORIES.map((cat, idx) => (
              <Link
                key={idx}
                to={cat.path}
                className={`border rounded-md p-5 text-center flex flex-col items-center justify-between transition-all duration-200 hover:shadow-hover hover:-translate-y-0.5 ${
                  cat.featured
                    ? 'border-brand-green bg-green-50/40'
                    : 'border-surface-border bg-surface-subtle hover:bg-white'
                }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                  cat.featured ? 'bg-brand-green text-white' : 'bg-white border border-surface-border text-brand-ink'
                }`}>
                  <Icon name={cat.icon} className="text-lg" />
                </div>
                <h3 className="text-xs font-bold text-brand-ink uppercase tracking-wide mb-1">
                  {cat.name}
                </h3>
                <span className="text-[10px] text-ink-muted font-medium">
                  {cat.count}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Trending Now (Tabs: Best Sellers / New Arrivals) */}
      <section className="py-12 md:py-16 bg-surface-subtle border-b border-surface-border">
        <div className="max-w-site mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-brand-green">
                Customer Favorites
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-brand-ink">
                Trending Now
              </h2>
            </div>

            {/* Switchable Tabs */}
            <div className="inline-flex p-1 bg-white border border-surface-border rounded-md shadow-sm self-start md:self-auto">
              <button
                type="button"
                onClick={() => setActiveTab('bestsellers')}
                className={`px-4 py-1.5 rounded-sm text-xs font-bold uppercase tracking-wider transition-colors ${
                  activeTab === 'bestsellers'
                    ? 'bg-brand-ink text-white'
                    : 'text-ink-muted hover:text-brand-ink'
                }`}
              >
                Best Sellers
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('new')}
                className={`px-4 py-1.5 rounded-sm text-xs font-bold uppercase tracking-wider transition-colors ${
                  activeTab === 'new'
                    ? 'bg-brand-ink text-white'
                    : 'text-ink-muted hover:text-brand-ink'
                }`}
              >
                New Arrivals
              </button>
            </div>
          </div>

          {/* Product Grid (Responsive: 1-2 cols mobile, 3 tablet, 4 desktop) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filteredProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link to="/shop">
              <Button variant="outline" size="md" className="px-8">
                Explore Full Catalog
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 5. Promotional Banners (Solid Cards, No Glassmorphism) */}
      <section className="py-12 md:py-16 bg-white border-b border-surface-border">
        <div className="max-w-site mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Banner 1 */}
            <div className="border border-surface-border rounded-lg p-8 bg-surface-subtle flex flex-col justify-between shadow-card relative overflow-hidden">
              <div className="max-w-md">
                <Badge variant="sale" className="mb-3">Special Bundle</Badge>
                <h3 className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-brand-ink mb-2">
                  Complete Daily Glow Duo
                </h3>
                <p className="text-xs text-ink-muted leading-relaxed mb-6">
                  Pair our daily multivitamin with pure clarifying serum for comprehensive internal nutrition and external skin radiance.
                </p>
                <div className="text-lg font-bold text-brand-ink mb-4">
                  Rs. 3,499 <span className="text-xs text-ink-muted line-through font-normal">Rs. 4,350</span>
                </div>
              </div>
              <div>
                <Link to="/shop?bundle=glow-duo">
                  <Button variant="primary" size="sm" className="h-[40px] px-6">
                    Shop The Duo
                  </Button>
                </Link>
              </div>
            </div>

            {/* Banner 2 */}
            <div className="border border-brand-green/30 rounded-lg p-8 bg-green-50/50 flex flex-col justify-between shadow-card relative overflow-hidden">
              <div className="max-w-md">
                <Badge variant="pill" className="mb-3">Family Pack</Badge>
                <h3 className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-brand-ink mb-2">
                  3-Month Wellness Supply
                </h3>
                <p className="text-xs text-ink-muted leading-relaxed mb-6">
                  Ensure daily vitamin consistency with our bulk family package. Includes free nationwide COD shipping.
                </p>
                <div className="text-lg font-bold text-brand-green mb-4">
                  Free Nationwide Delivery
                </div>
              </div>
              <div>
                <Link to="/multivitamins">
                  <Button variant="primary" size="sm" className="h-[40px] px-6">
                    View Family Pack
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Help Topics Chips */}
      <section className="py-12 bg-surface-subtle border-b border-surface-border">
        <div className="max-w-site mx-auto px-4 sm:px-6 text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-green mb-2 block">
            Targeted Support
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-brand-ink mb-3">
            What are you looking to support today?
          </h2>
          <p className="text-xs text-ink-muted max-w-md mx-auto mb-8">
            Filter our catalog directly by your specific health and skin wellness priority.
          </p>

          <div className="flex flex-wrap justify-center gap-3 max-w-2xl mx-auto">
            {HELP_TOPICS.map((topic, idx) => (
              <Link
                key={idx}
                to={`/shop?support=${topic.filter}`}
                className="bg-white border border-surface-border hover:border-brand-green px-4 py-2.5 rounded-full text-xs font-semibold text-brand-ink hover:text-brand-green shadow-sm transition-all"
              >
                {topic.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Why Supplivix (4 Feature Columns) */}
      <section className="py-12 md:py-16 bg-white border-b border-surface-border">
        <div className="max-w-site mx-auto px-4 sm:px-6">
          <div className="text-center max-w-xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-green">
              The Supplivix Difference
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-brand-ink mt-1">
              Why Choose Supplivix
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="border border-surface-border p-6 rounded-md bg-surface-subtle shadow-card text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-brand-green text-white flex items-center justify-center mb-4">
                <Icon name="capsules" className="text-lg" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-brand-ink mb-2">
                Bioavailable Formula
              </h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Selected mineral forms (like zinc glycinate and methylfolate) that your body absorbs easily and gently.
              </p>
            </div>

            <div className="border border-surface-border p-6 rounded-md bg-surface-subtle shadow-card text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-brand-green text-white flex items-center justify-center mb-4">
                <Icon name="shield" className="text-lg" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-brand-ink mb-2">
                Pure & Tested
              </h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Strict purity standards. Zero unnecessary chemical binders, zero banned ingredients, verified potency.
              </p>
            </div>

            <div className="border border-surface-border p-6 rounded-md bg-surface-subtle shadow-card text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-brand-green text-white flex items-center justify-center mb-4">
                <Icon name="cod" className="text-lg" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-brand-ink mb-2">
                Cash on Delivery
              </h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Enjoy safe, risk-free shopping across Pakistan. Pay cash to the courier only upon physical delivery.
              </p>
            </div>

            <div className="border border-surface-border p-6 rounded-md bg-surface-subtle shadow-card text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-brand-green text-white flex items-center justify-center mb-4">
                <Icon name="whatsapp" className="text-lg" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-brand-ink mb-2">
                WhatsApp Support
              </h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Need guidance on supplement timing or dosage? Reach out directly to our customer care team anytime.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Newsletter Section (Honeypot, Validation, WCAG Compliant) */}
      <section className="py-12 bg-surface-subtle">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <div className="bg-white border border-surface-border p-8 rounded-lg shadow-card">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-green mb-2 block">
              Stay Informed
            </span>
            <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-brand-ink mb-2">
              Subscribe to Supplivix Wellness
            </h2>
            <p className="text-xs text-ink-muted leading-relaxed mb-6">
              Get weekly evidence-based wellness tips, multivitamin guides, and first access to seasonal offers.
            </p>

            <form onSubmit={handleNewsletterSubmit} className="max-w-md mx-auto" noValidate>
              <input
                type="text"
                name="company_website"
                value={newsletterHoneypot}
                onChange={(e) => setNewsletterHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                className="hidden"
                aria-hidden="true"
              />
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <Input
                    name="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    required
                    aria-label="Email address for wellness updates"
                  />
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  loading={newsletterLoading}
                  className="h-[42px] px-6 sm:self-start"
                >
                  Subscribe
                </Button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
