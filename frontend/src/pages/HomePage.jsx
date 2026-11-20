import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/ui/Icon';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import ProductIllustration from '../components/ui/ProductIllustration';
import ProductCard from '../components/product/ProductCard';
import Input from '../components/ui/Input';
import SEOHead from '../components/seo/SEOHead';
import CertificatesSection from '../components/common/CertificatesSection';
import CertificatesScrollStrip from '../components/common/CertificatesScrollStrip';
import SaleCountdownTimer from '../components/common/SaleCountdownTimer';
import CategoryFunkyIcon, { getCategoryTheme } from '../components/ui/CategoryFunkyIcon';
import heroSlide1 from '../assets/brand/hero-slide-1.jpg';
import heroSlide2 from '../assets/brand/hero-slide-2.jpg';
import heroSlide3 from '../assets/brand/hero-slide-3.jpg';
import heroSlide4 from '../assets/brand/hero-slide-4.jpg';
import heroSlide5 from '../assets/brand/hero-slide-5.jpg';
import heroSlide6 from '../assets/brand/hero-slide-6.jpg';
import heroSlide7 from '../assets/brand/hero-slide-7.jpg';
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
    thumbnail: '/media/products/supplivix-multivitamin.jpg',
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
    thumbnail: '/media/products/supplivix-immune-shield.jpg',
  },
  {
    id: 3,
    name: 'Radiant Glow Biotin & Collagen Complex',
    slug: 'radiant-glow-biotin-collagen-complex',
    product_type: 'multivitamin',
    category_name: 'Skin Care',
    price: 2750,
    compare_at_price: 3300,
    rating: 4.9,
    reviews_count: 44,
    inventory_count: 60,
    is_featured: true,
    serving_size: '60 Capsules',
    thumbnail: '/media/products/supplivix-skin-glow.jpg',
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
    thumbnail: '/media/products/supplivix-skincare-serum.jpg',
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
    thumbnail: '/media/products/supplivix-bone-joints.jpg',
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
    thumbnail: '/media/products/supplivix-skincare-serum.jpg',
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
    thumbnail: '/media/products/supplivix-daily-vitality.jpg',
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
    thumbnail: '/media/products/supplivix-multivitamin.jpg',
  },
];

const DEFAULT_CATEGORIES = [
  { name: 'Multivitamins', slug: 'multivitamins', icon: 'capsules', path: '/multivitamins' },
  { name: 'Teen Agers', slug: 'teen-agers', icon: 'user', path: '/shop?category=teen-agers' },
  { name: 'Kids', slug: 'kids', icon: 'user', path: '/shop?category=kids' },
  { name: 'Immunity Shield', slug: 'immunity', icon: 'shield', path: '/shop?category=immunity' },
  { name: 'Bone & Joints', slug: 'bones-joints', icon: 'bolt', path: '/shop?category=bones-joints' },
  { name: 'Skin Care', slug: 'skincare', icon: 'flask', path: '/shop?category=skincare' },
  { name: 'Daily Vitality', slug: 'vitality', icon: 'star', path: '/shop?category=vitality' },
  { name: 'Anti-Aging', slug: 'anti-aging', icon: 'award', path: '/shop?category=anti-aging' },
];

const getCategoryIcon = (slug, name = '') => {
  const s = `${slug} ${name}`.toLowerCase();
  if (s.includes('multi')) return 'capsules';
  if (s.includes('immun')) return 'shield';
  if (s.includes('glow') || s.includes('leaf')) return 'leaf';
  if (s.includes('bone') || s.includes('joint') || s.includes('bolt')) return 'bolt';
  if (s.includes('skin') || s.includes('serum')) return 'flask';
  if (s.includes('vital') || s.includes('star')) return 'star';
  if (s.includes('aging') || s.includes('anti-age') || s.includes('youth') || s.includes('wrinkle')) return 'award';
  if (s.includes('teen') || s.includes('child') || s.includes('kid')) return 'user';
  if (s.includes('heart') || s.includes('cardio')) return 'heart';
  return 'tag';
};

const HELP_TOPICS = [
  { label: 'Hair Fall & Thinning', filter: 'hair' },
  { label: 'Skin Brightening & Glow', filter: 'glow' },
  { label: 'Low Energy & Fatigue', filter: 'energy' },
  { label: 'Immunity & Seasonal Defense', filter: 'immunity' },
  { label: 'Joint Stiffness & Mobility', filter: 'joints' },
  { label: 'Dark Spots & Pigmentation', filter: 'spots' },
];

const HERO_SLIDES = [
  {
    id: 1,
    image: heroSlide1,
    alt: 'Supplivix Summer Glow-on with Glutathione',
    link: '/shop?category=skincare',
  },
  {
    id: 2,
    image: heroSlide2,
    alt: 'Supplivix 6000mg Marine Collagen Powder',
    link: '/shop?category=anti-aging',
  },
  {
    id: 3,
    image: heroSlide3,
    alt: 'Supplivix 100% Bioavailable Daily Vitality Multivitamin',
    link: '/multivitamins',
  },
  {
    id: 4,
    image: heroSlide4,
    alt: 'Supplivix Strong Bones Active Life Calcium D3',
    link: '/shop?category=bones-joints',
  },
  {
    id: 5,
    image: heroSlide5,
    alt: 'Supplivix Immunity Power Daily Shield Vitamin C',
    link: '/shop?category=immunity',
  },
  {
    id: 6,
    image: heroSlide6,
    alt: 'Supplivix Thicker Hair Radiant Glow Biotin',
    link: '/shop?category=skincare',
  },
  {
    id: 7,
    image: heroSlide7,
    alt: 'Supplivix Yummy Multi Gummies Made Healthy',
    link: '/shop?category=kids',
  },
];

export default function HomePage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('bestsellers');
  const [bestsellers, setBestsellers] = useState(DEFAULT_PRODUCTS);
  const [newArrivals, setNewArrivals] = useState(DEFAULT_PRODUCTS);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterHoneypot, setNewsletterHoneypot] = useState('');
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const [shippingThreshold, setShippingThreshold] = useState(2000);
  const [activeSaleEvent, setActiveSaleEvent] = useState(null);
  const [dealsEnabled, setDealsEnabled] = useState(true);
  const [bundleOffers, setBundleOffers] = useState(null);
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);
  const [isHeroHovered, setIsHeroHovered] = useState(false);

  // Auto-advance hero slides every 5 seconds (5000ms), paused on user hover, resets on slide change
  useEffect(() => {
    if (isHeroHovered) return;
    const timer = setInterval(() => {
      setHeroSlideIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [isHeroHovered, heroSlideIndex]);
  const [deal1, setDeal1] = useState({
    badge: 'Special Bundle',
    title: 'Complete Daily Glow Duo',
    desc: 'Pair our daily multivitamin with pure clarifying serum for comprehensive internal nutrition and external skin radiance.',
    price: '3499',
    originalPrice: '4350',
    buttonText: 'Shop The Duo',
    link: '/shop?bundle=glow-duo',
  });
  const [deal2, setDeal2] = useState({
    badge: 'Family Pack',
    title: '3-Month Wellness Supply',
    desc: 'Ensure daily vitamin consistency with our bulk family package. Includes free nationwide COD shipping.',
    highlight: 'Free Nationwide Delivery',
    buttonText: 'View Family Pack',
    link: '/multivitamins',
  });

  useEffect(() => {
    let active = true;
    api.getPublicSettings?.()
      .then((res) => {
        if (!active) return;
        const val = Number(res?.free_shipping_threshold || res?.data?.free_shipping_threshold);
        if (val > 0) setShippingThreshold(val);

        if (res?.deals_enabled !== undefined) {
          setDealsEnabled(Boolean(res.deals_enabled));
        }
        if (res?.deal_banner_1_title) {
          setDeal1({
            badge: res.deal_banner_1_badge || 'Special Bundle',
            title: res.deal_banner_1_title,
            desc: res.deal_banner_1_desc || '',
            price: res.deal_banner_1_price || '3499',
            originalPrice: res.deal_banner_1_original_price || '4350',
            buttonText: res.deal_banner_1_button_text || 'Shop The Duo',
            link: res.deal_banner_1_link || '/shop?bundle=glow-duo',
          });
        }
        if (res?.deal_banner_2_title) {
          setDeal2({
            badge: res.deal_banner_2_badge || 'Family Pack',
            title: res.deal_banner_2_title,
            desc: res.deal_banner_2_desc || '',
            highlight: res.deal_banner_2_highlight || 'Free Nationwide Delivery',
            buttonText: res.deal_banner_2_button_text || 'View Family Pack',
            link: res.deal_banner_2_link || '/multivitamins',
          });
        }
      })
      .catch(() => {});

    api.getOffers?.()
      .then((res) => {
        if (!active) return;
        const list = Array.isArray(res) ? res : (res?.results || []);
        const activeOnly = list.filter((o) => o.is_active !== false);
        setBundleOffers(activeOnly);
      })
      .catch(() => {
        if (!active) return;
        setBundleOffers([]);
      });

    api.getActiveSaleEvent?.()
      .then((res) => {
        if (!active) return;
        if (res?.has_active_event && res?.event) {
          setActiveSaleEvent(res.event);
        } else {
          setActiveSaleEvent(null);
        }
      })
      .catch(() => {});

    return () => { active = false; };
  }, []);

  useEffect(() => {
    // Load live categories
    api.getCategories()
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.results || []);
        if (list.length > 0) {
          const flat = [];
          const seen = new Set();
          const addC = (c) => {
            if (!c || !c.slug || seen.has(c.slug)) return;
            seen.add(c.slug);
            flat.push({
              name: c.name,
              slug: c.slug,
              icon: getCategoryIcon(c.slug, c.name),
              path: c.slug === 'multivitamins' ? '/multivitamins' : `/shop?category=${c.slug}`,
            });
          };
          for (const item of list) {
            addC(item);
            if (item.children && Array.isArray(item.children)) {
              for (const child of item.children) addC(child);
            }
          }
          if (flat.length > 0) setCategories(flat);
        }
      })
      .catch(() => {});

    // Load live bestsellers and new arrivals from catalog
    api.getProducts({ page_size: 8 })
      .then((data) => {
        if (data && data.results && data.results.length > 0) {
          setBestsellers(data.results.slice(0, 8));
        }
      })
      .catch(() => {
        // Retain fallback items
      });

    api.getProducts({ ordering: '-created_at', page_size: 8 })
      .then((data) => {
        if (data && data.results && data.results.length > 0) {
          setNewArrivals(data.results.slice(0, 8));
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
      ? bestsellers.slice(0, 8)
      : newArrivals.slice(0, 8);

  const activeBundles =
    bundleOffers !== null
      ? bundleOffers
      : [
          {
            id: 'default-1',
            badge: deal1.badge,
            title: deal1.title,
            description: deal1.desc,
            price: Number(deal1.price || 0),
            original_price: Number(deal1.originalPrice || 0) || null,
            highlight: '',
            button_text: deal1.buttonText,
            link: deal1.link,
          },
          {
            id: 'default-2',
            badge: deal2.badge,
            title: deal2.title,
            description: deal2.desc,
            price: 0,
            original_price: null,
            highlight: deal2.highlight,
            button_text: deal2.buttonText,
            link: deal2.link,
          },
        ];

  return (
    <div className="bg-white">
      <SEOHead title="Bioavailable Multivitamins & Skincare Pakistan" description="Pakistan's premier multivitamins and science-backed skincare formulations. Crafted for maximum bioavailability with Cash on Delivery nationwide." canonical="/" />
      {/* 1. Hero Section: Full-Width Responsive Funky Graphic Carousel (No HTML Text Overlay) */}
      <section
        aria-label="Promotional Hero Banners"
        className="relative overflow-hidden bg-surface-subtle border-b border-surface-border select-none"
        onMouseEnter={() => setIsHeroHovered(true)}
        onMouseLeave={() => setIsHeroHovered(false)}
      >
        <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] md:aspect-[2.35/1] max-h-[580px] min-h-[200px]">
          {HERO_SLIDES.map((slide, idx) => (
            <Link
              key={slide.id}
              to={slide.link}
              className={`absolute inset-0 w-full h-full block transition-opacity duration-700 ease-in-out ${
                idx === heroSlideIndex
                  ? 'opacity-100 z-10 pointer-events-auto'
                  : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              <img
                src={slide.image}
                alt={slide.alt}
                className="w-full h-full object-cover object-center"
                loading={idx === 0 ? 'eager' : 'lazy'}
              />
            </Link>
          ))}

          {/* Left Arrow (Nutrifactor Style) */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setHeroSlideIndex((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
            }}
            className="absolute left-2 sm:left-4 md:left-6 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-full bg-white/85 hover:bg-white text-brand-ink shadow-md flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer focus:outline-none"
            aria-label="Previous promotional slide"
          >
            <Icon name="chevron-right" className="rotate-180 text-xs sm:text-sm" />
          </button>

          {/* Right Arrow (Nutrifactor Style) */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setHeroSlideIndex((prev) => (prev + 1) % HERO_SLIDES.length);
            }}
            className="absolute right-2 sm:right-4 md:right-6 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-full bg-white/85 hover:bg-white text-brand-ink shadow-md flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer focus:outline-none"
            aria-label="Next promotional slide"
          >
            <Icon name="chevron-right" className="text-xs sm:text-sm" />
          </button>

          {/* Pagination Indicators (Centered at bottom) */}
          <div className="absolute bottom-2.5 sm:bottom-4 md:bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 sm:gap-2 bg-black/30 backdrop-blur-xs px-3 py-1.5 rounded-full">
            {HERO_SLIDES.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setHeroSlideIndex(idx);
                }}
                className={`rounded-full transition-all duration-300 ${
                  idx === heroSlideIndex
                    ? 'w-6 sm:w-7 h-2 sm:h-2.5 bg-brand-green'
                    : 'w-2 sm:w-2.5 h-2 sm:h-2.5 bg-white/80 hover:bg-white'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 1b. Circular Quality & Regulatory Accreditations Scrolling Strip (Directly Below Hero Section) */}
      <CertificatesScrollStrip />

      {/* Seasonal / Occasion Active Sale Event Banner */}
      {activeSaleEvent && (
        <section className="bg-red-700 text-white border-y border-red-800 py-6 sm:py-8 shadow-inner relative overflow-hidden">
          <div className="max-w-site mx-auto px-4 sm:px-6 relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 text-left">
              <span className="bg-white text-red-700 font-extrabold text-xs uppercase tracking-widest px-3 py-1.5 rounded shadow-sm flex-shrink-0">
                {activeSaleEvent.badge_text || 'Seasonal Sale'}
              </span>
              <div>
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white mb-1">
                  {activeSaleEvent.name}
                </h2>
                <p className="text-xs sm:text-sm text-red-100 max-w-xl line-clamp-2">
                  {activeSaleEvent.description || 'Special seasonal campaign prices applied across our formulations. Free nationwide delivery on qualifying orders.'}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 flex-shrink-0">
              {activeSaleEvent.show_countdown && activeSaleEvent.end_at && (
                <SaleCountdownTimer
                  targetDate={activeSaleEvent.end_at}
                  onExpire={() => setActiveSaleEvent(null)}
                  badgeText="Ends In"
                />
              )}
              <Link to={activeSaleEvent.slug ? `/sale/${activeSaleEvent.slug}` : '/shop'}>
                <Button variant="secondary" size="md" className="bg-white text-red-700 hover:bg-red-50 border-white font-bold uppercase tracking-wider text-xs px-6 py-2.5">
                  Shop The Sale
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

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
                <p className="text-[11px] text-ink-muted">On orders above Rs. {shippingThreshold.toLocaleString()}</p>
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
                <Icon name="leaf" className="text-lg" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-brand-ink">100% Halal Certified</h3>
                <p className="text-[11px] text-ink-muted">Zero porcine gelatin &amp; pure</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Brand Value Proposition Banner */}
      <section className="bg-brand-ink text-white py-10 sm:py-14 border-b border-surface-border">
        <div className="max-w-site mx-auto px-4 sm:px-6 text-center">
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-brand-lavender block mb-2">
            Quality • Trust • Wellness
          </span>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold uppercase tracking-tight text-white mb-3">
            Your Beauty. Your Wellness. Our Commitment.
          </h2>
          <p className="text-xs sm:text-sm md:text-base text-[#e2dfd2] max-w-2xl mx-auto leading-relaxed font-medium mb-6">
            We believe that true beauty begins with wellness, and quality should always come first.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link to="/about">
              <Button variant="outline" size="sm" className="bg-transparent border-white text-white hover:bg-white hover:text-brand-ink">
                About Our Commitment
              </Button>
            </Link>
            <Link to="/faq">
              <Button variant="primary" size="sm" className="bg-brand-green border-brand-green text-white hover:opacity-95">
                New Customer FAQs
              </Button>
            </Link>
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

          <div className="flex flex-wrap justify-center gap-3 sm:gap-4 md:gap-5">
            {categories.map((cat, idx) => {
              const theme = getCategoryTheme(cat.slug, cat.name);
              return (
                <Link
                  key={cat.slug || idx}
                  to={cat.path}
                  className="w-[calc(50%-8px)] sm:w-[calc(33.333%-12px)] md:w-[calc(25%-14px)] lg:w-[calc(20%-14px)] xl:flex-1 xl:min-w-[115px] xl:max-w-[135px] flex-shrink-0 bg-white hover:bg-surface-subtle border border-surface-border rounded-2xl p-3.5 sm:p-4 text-center flex flex-col items-center justify-between transition-all duration-300 hover:shadow-card hover:-translate-y-1.5 group cursor-pointer"
                >
                  {/* Funky Color Badge / Block with Playful Outline Illustration (Nutrifactor Style) */}
                  <div
                    className={`w-full max-w-[96px] h-16 sm:h-20 rounded-2xl flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-105 shadow-sm ${theme.bg} ${theme.hoverBg} border ${theme.border}`}
                  >
                    <CategoryFunkyIcon slug={cat.slug} name={cat.name} className="w-10 h-10 sm:w-12 sm:h-12" />
                  </div>

                  <h3 className="text-[11px] sm:text-xs font-bold text-brand-ink uppercase tracking-tight group-hover:text-brand-green transition-colors leading-tight">
                    {cat.name}
                  </h3>
                </Link>
              );
            })}
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

      {/* 5. Promotional Deals & Banners (Controlled by Admin: Shows only if dealsEnabled is true) */}
      {dealsEnabled && activeBundles.length > 0 && (
        <section className="py-12 md:py-16 bg-white border-b border-surface-border">
          <div className="max-w-site mx-auto px-4 sm:px-6">
            <div
              className={
                activeBundles.length === 1
                  ? 'max-w-xl mx-auto'
                  : activeBundles.length === 2
                  ? 'grid grid-cols-1 md:grid-cols-2 gap-6'
                  : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              }
            >
              {activeBundles.map((deal, idx) => {
                const isGreenStyle = idx % 2 === 1 || Boolean(deal.highlight);
                return (
                  <div
                    key={deal.id || idx}
                    className={`border rounded-lg p-8 flex flex-col justify-between shadow-card relative overflow-hidden ${
                      isGreenStyle
                        ? 'border-brand-green/30 bg-green-50/50'
                        : 'border-surface-border bg-surface-subtle'
                    }`}
                  >
                    <div className="max-w-md">
                      {deal.badge && (
                        <Badge variant={isGreenStyle ? 'pill' : 'sale'} className="mb-3">
                          {deal.badge}
                        </Badge>
                      )}
                      <h3 className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-brand-ink mb-2">
                        {deal.title}
                      </h3>
                      {deal.description && (
                        <p className="text-xs text-ink-muted leading-relaxed mb-6">
                          {deal.description}
                        </p>
                      )}
                      {deal.price > 0 && (
                        <div className="text-lg font-bold text-brand-ink mb-4">
                          Rs. {Number(deal.price).toLocaleString()}{' '}
                          {deal.original_price && Number(deal.original_price) > Number(deal.price) && (
                            <span className="text-xs text-ink-muted line-through font-normal ml-2">
                              Rs. {Number(deal.original_price).toLocaleString()}
                            </span>
                          )}
                        </div>
                      )}
                      {deal.highlight && (
                        <div className="text-lg font-bold text-brand-green mb-4">
                          {deal.highlight}
                        </div>
                      )}
                    </div>
                    <div>
                      <Link to={deal.link || '/shop'}>
                        <Button variant="primary" size="sm" className="h-[40px] px-6">
                          {deal.button_text || 'Shop The Deal'}
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

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

      {/* 7. Why Supplivix: More Than Beauty. More Than Wellness. (4 Feature Columns) */}
      <section className="py-12 md:py-16 bg-white border-b border-surface-border">
        <div className="max-w-site mx-auto px-4 sm:px-6">
          <div className="text-center max-w-xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-green block mb-1">
              More Than Beauty. More Than Wellness.
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-brand-ink">
              WHY SUPPLIVIX?
            </h2>
            <p className="text-xs sm:text-sm text-ink-muted mt-2">
              Every formula, test, and package is shaped by our commitment to quality, product integrity, and lasting customer relationships.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="border border-surface-border p-6 rounded-md bg-surface-subtle shadow-card text-center hover:shadow-hover transition-shadow">
              <div className="w-12 h-12 mx-auto rounded-full bg-brand-green text-white flex items-center justify-center mb-4">
                <Icon name="flask" className="text-lg" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-brand-ink mb-2">
                Thoughtful Formulations
              </h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Carefully considered product formulations.
              </p>
            </div>

            <div className="border border-surface-border p-6 rounded-md bg-surface-subtle shadow-card text-center hover:shadow-hover transition-shadow">
              <div className="w-12 h-12 mx-auto rounded-full bg-brand-green text-white flex items-center justify-center mb-4">
                <Icon name="shield" className="text-lg" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-brand-ink mb-2">
                Quality Focus
              </h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                A commitment to quality and product integrity.
              </p>
            </div>

            <div className="border border-surface-border p-6 rounded-md bg-surface-subtle shadow-card text-center hover:shadow-hover transition-shadow">
              <div className="w-12 h-12 mx-auto rounded-full bg-brand-green text-white flex items-center justify-center mb-4">
                <Icon name="star" className="text-lg" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-brand-ink mb-2">
                Premium Experience
              </h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Premium products and presentation.
              </p>
            </div>

            <div className="border border-surface-border p-6 rounded-md bg-surface-subtle shadow-card text-center hover:shadow-hover transition-shadow">
              <div className="w-12 h-12 mx-auto rounded-full bg-brand-green text-white flex items-center justify-center mb-4">
                <Icon name="heart" className="text-lg" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-brand-ink mb-2">
                Customer First
              </h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Building lasting customer relationships.
              </p>
            </div>
          </div>

          <div className="mt-10 text-center">
            <div className="inline-flex flex-col sm:flex-row items-center gap-3 px-6 py-3 bg-surface-subtle border border-surface-border rounded-lg shadow-sm">
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-brand-ink">
                Choose Quality. Choose SUPPLIVIX.
              </span>
              <Link to="/shop">
                <Button variant="primary" size="sm" className="px-5">
                  Explore Products
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 7b. Quality & Regulatory Accreditations / Certificates */}
      <CertificatesSection bg="white" />

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
