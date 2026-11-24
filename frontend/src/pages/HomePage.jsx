import React, { useState, useEffect, useRef } from 'react';
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
import heroSlide1Webp from '../assets/brand/hero-slide-1.webp';
import heroSlide2Webp from '../assets/brand/hero-slide-2.webp';
import heroSlide3Webp from '../assets/brand/hero-slide-3.webp';
import heroSlide4Webp from '../assets/brand/hero-slide-4.webp';
import heroSlide5Webp from '../assets/brand/hero-slide-5.webp';
import heroSlide6Webp from '../assets/brand/hero-slide-6.webp';
import heroSlide7Webp from '../assets/brand/hero-slide-7.webp';
import { useToast } from '../components/ui/Toast';
import { api } from '../services/api';

const DEFAULT_PRODUCTS = [
  {
    id: 1,
    name: 'Daily Balance Multivitamin 60s',
    slug: 'daily-balance-multivitamin-60s',
    product_type: 'multivitamin',
    category_name: 'Multivitamins',
    price: 2450,
    compare_at_price: 2900,
    rating: 4.8,
    reviews_count: 6,
    inventory_count: 119,
    is_featured: true,
    serving_size: '60 Tablets',
    thumbnail: '/media/products/clean-multivitamin.jpg',
  },
  {
    id: 2,
    name: 'Daily Balance Gold High Potency 60s',
    slug: 'daily-balance-gold-high-potency-60s',
    product_type: 'multivitamin',
    category_name: 'Multivitamins',
    price: 3200,
    compare_at_price: 3800,
    rating: 4.7,
    reviews_count: 6,
    inventory_count: 85,
    is_featured: true,
    serving_size: '60 Tablets',
    thumbnail: '/media/products/clean-mv-gold.jpg',
  },
  {
    id: 3,
    name: 'Active Daily Multi Energy Blend 60s',
    slug: 'active-daily-multi-energy-blend-60s',
    product_type: 'multivitamin',
    category_name: 'Multivitamins',
    price: 2600,
    compare_at_price: null,
    rating: 4.7,
    reviews_count: 6,
    inventory_count: 95,
    is_featured: true,
    serving_size: '60 Tablets',
    thumbnail: '/media/products/clean-daily-vitality.jpg',
  },
  {
    id: 9,
    name: 'Men Core Multi Active Formula 60s',
    slug: 'men-core-multi-active-formula-60s',
    product_type: 'multivitamin',
    category_name: 'Multivitamins',
    price: 2600,
    compare_at_price: 3100,
    rating: 4.9,
    reviews_count: 6,
    inventory_count: 90,
    is_featured: true,
    serving_size: '60 Tablets',
    thumbnail: '/media/products/clean-men-core.jpg',
  },
  {
    id: 17,
    name: 'Kids Gummy Multi Fruit Bites 60s',
    slug: 'kids-gummy-multi-demo-fruit-bites-60s',
    product_type: 'multivitamin',
    category_name: 'Multivitamins',
    price: 1750,
    compare_at_price: 2100,
    rating: 4.8,
    reviews_count: 6,
    inventory_count: 130,
    is_featured: true,
    serving_size: '60 Gummies',
    thumbnail: '/media/products/clean-multivitamin.jpg',
  },
  {
    id: 20,
    name: 'Immune Shield Blend Vitamin C + Zinc 60s',
    slug: 'immune-shield-blend-vitamin-c-plus-zinc-60s',
    product_type: 'multivitamin',
    category_name: 'Immunity',
    price: 1850,
    compare_at_price: 2250,
    rating: 4.7,
    reviews_count: 6,
    inventory_count: 149,
    is_featured: true,
    serving_size: '60 Tablets',
    thumbnail: '/media/products/clean-immune-shield.jpg',
  },
  {
    id: 24,
    name: 'Beauty Bloom Complex Biotin 5000mcg 60s',
    slug: 'beauty-bloom-complex-biotin-5000mcg-60s',
    product_type: 'multivitamin',
    category_name: 'Skin Care',
    price: 2350,
    compare_at_price: 2750,
    rating: 4.8,
    reviews_count: 6,
    inventory_count: 115,
    is_featured: true,
    serving_size: '60 Capsules',
    thumbnail: '/media/products/clean-skin-glow.jpg',
  },
  {
    id: 56,
    name: 'Ultra Hydrating Hyaluronic Barrier Cream 50ml',
    slug: 'ultra-hydrating-hyaluronic-barrier-cream-50ml',
    product_type: 'skincare',
    category_name: 'Skin Care',
    price: 1890,
    compare_at_price: 2250,
    rating: 5.0,
    reviews_count: 1,
    inventory_count: 84,
    is_featured: true,
    serving_size: '50ml Jar',
    thumbnail: '/media/products/clean-cream-jar.jpg',
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
    webp: heroSlide1Webp,
    alt: 'Supplivix Summer Glow-on with Glutathione',
    link: '/shop?category=skincare',
  },
  {
    id: 2,
    image: heroSlide2,
    webp: heroSlide2Webp,
    alt: 'Supplivix 6000mg Marine Collagen Powder',
    link: '/shop?category=anti-aging',
  },
  {
    id: 3,
    image: heroSlide3,
    webp: heroSlide3Webp,
    alt: 'Supplivix 100% Bioavailable Daily Vitality Multivitamin',
    link: '/multivitamins',
  },
  {
    id: 4,
    image: heroSlide4,
    webp: heroSlide4Webp,
    alt: 'Supplivix Strong Bones Active Life Calcium D3',
    link: '/shop?category=bones-joints',
  },
  {
    id: 5,
    image: heroSlide5,
    webp: heroSlide5Webp,
    alt: 'Supplivix Immunity Power Daily Shield Vitamin C',
    link: '/shop?category=immunity',
  },
  {
    id: 6,
    image: heroSlide6,
    webp: heroSlide6Webp,
    alt: 'Supplivix Thicker Hair Radiant Glow Biotin',
    link: '/shop?category=skincare',
  },
  {
    id: 7,
    image: heroSlide7,
    webp: heroSlide7Webp,
    alt: 'Supplivix Yummy Multi Gummies Made Healthy',
    link: '/shop?category=kids',
  },
];

export const BUNDLED_HERO_ASSETS = {
  1: { image: heroSlide1, webp: heroSlide1Webp },
  2: { image: heroSlide2, webp: heroSlide2Webp },
  3: { image: heroSlide3, webp: heroSlide3Webp },
  4: { image: heroSlide4, webp: heroSlide4Webp },
  5: { image: heroSlide5, webp: heroSlide5Webp },
  6: { image: heroSlide6, webp: heroSlide6Webp },
  7: { image: heroSlide7, webp: heroSlide7Webp },
};

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
  const [heroSlides, setHeroSlides] = useState(HERO_SLIDES);
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);
  const categoryScrollRef = useRef(null);

  const scrollCategories = (direction) => {
    if (categoryScrollRef.current) {
      const amount = direction === 'left' ? -280 : 280;
      categoryScrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  // Fetch active hero banner slides from the backend
  useEffect(() => {
    let active = true;
    api.getHeroSlides?.()
      .then((res) => {
        if (!active) return;
        const list = res?.results || (Array.isArray(res) ? res : []);
        if (list && list.length > 0) {
          const formatted = list.map((slide, idx) => {
            const rawUrl = slide.image || slide.image_url_path || slide.image_url || '';
            const order = slide.sort_order || slide.id || (idx + 1);
            const defaultAsset = BUNDLED_HERO_ASSETS[order] || BUNDLED_HERO_ASSETS[((order - 1) % 7) + 1] || BUNDLED_HERO_ASSETS[1];

            // If the rawUrl points to default slides (hero-slide-1..7 or banners/hero-slide-1..7)
            const isDefaultSlide = !rawUrl || rawUrl.includes('hero-slide-') || rawUrl.includes('hero-banner');

            let finalImage = defaultAsset.image;
            let finalWebp = defaultAsset.webp;

            if (!isDefaultSlide) {
              const normalized = rawUrl.startsWith('http') || rawUrl.startsWith('/') ? rawUrl : `/media/${rawUrl}`;
              finalImage = normalized;
              finalWebp = normalized.replace(/\.(jpg|jpeg|png)$/i, '.webp');
            }

            return {
              id: slide.id,
              sort_order: order,
              image: finalImage,
              webp: finalWebp,
              fallback: defaultAsset.image,
              alt: slide.title || 'Supplivix Promotional Banner',
              link: slide.link || '/shop',
            };
          });
          setHeroSlides(formatted);
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  // Auto-advance hero slides every 5 seconds (5000ms), continuously looping through all banners
  useEffect(() => {
    if (!heroSlides.length) return;
    const timer = setInterval(() => {
      setHeroSlideIndex((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [heroSlides.length, heroSlideIndex]);
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
      >
        <div className="relative w-full aspect-[16/9]">
          {heroSlides.map((slide, idx) => (
            <Link
              key={slide.id || idx}
              to={slide.link}
              className={`absolute inset-0 w-full h-full block transition-opacity duration-700 ease-in-out ${
                idx === heroSlideIndex
                  ? 'opacity-100 z-10 pointer-events-auto'
                  : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              <picture className="w-full h-full block">
                {slide.webp && <source srcSet={slide.webp} type="image/webp" />}
                <img
                  src={slide.image}
                  alt={slide.alt}
                  width="1376"
                  height="768"
                  className="w-full h-full object-cover object-center"
                  loading={idx === 0 ? 'eager' : 'lazy'}
                  fetchpriority={idx === 0 ? 'high' : 'auto'}
                  decoding="async"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    const fallback = slide.fallback || BUNDLED_HERO_ASSETS[((idx) % 7) + 1]?.image || heroSlide1;
                    e.currentTarget.src = fallback;
                    const parent = e.currentTarget.parentElement;
                    if (parent && parent.tagName.toLowerCase() === 'picture') {
                      const source = parent.querySelector('source');
                      if (source) source.srcset = '';
                    }
                  }}
                />
              </picture>
            </Link>
          ))}

          {/* Left Arrow (Nutrifactor Style) */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setHeroSlideIndex((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
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
              setHeroSlideIndex((prev) => (prev + 1) % heroSlides.length);
            }}
            className="absolute right-2 sm:right-4 md:right-6 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-full bg-white/85 hover:bg-white text-brand-ink shadow-md flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer focus:outline-none"
            aria-label="Next promotional slide"
          >
            <Icon name="chevron-right" className="text-xs sm:text-sm" />
          </button>

          {/* Pagination Indicators (Centered at bottom) */}
          <div className="absolute bottom-2.5 sm:bottom-4 md:bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 sm:gap-2 bg-black/40 px-3 py-1.5 rounded-full">
            {heroSlides.map((_, idx) => (
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

      {/* 2. Scrollable Categories Carousel / Strip */}
      <section className="py-6 sm:py-8 bg-white border-b border-surface-border">
        <div className="max-w-site mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-4 sm:mb-5 gap-4">
            <div>
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-brand-green block mb-0.5">
                Tailored Formulations
              </span>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold uppercase tracking-tight text-brand-ink">
                The Natural Choice
              </h2>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                to="/shop"
                className="hidden sm:inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-brand-green hover:underline mr-1"
              >
                <span>View All</span>
                <Icon name="arrow-right" className="text-xs" />
              </Link>

              {/* Prev Button */}
              <button
                type="button"
                onClick={() => scrollCategories('left')}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-surface-border bg-white hover:bg-surface-subtle text-brand-ink flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shadow-xs cursor-pointer focus:outline-none"
                aria-label="Scroll categories left"
              >
                <Icon name="chevron-right" className="rotate-180 text-xs" />
              </button>

              {/* Next Button */}
              <button
                type="button"
                onClick={() => scrollCategories('right')}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-surface-border bg-white hover:bg-surface-subtle text-brand-ink flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shadow-xs cursor-pointer focus:outline-none"
                aria-label="Scroll categories right"
              >
                <Icon name="chevron-right" className="text-xs" />
              </button>
            </div>
          </div>

          {/* Horizontally Scrollable Categories Track */}
          <div
            ref={categoryScrollRef}
            className="flex items-stretch gap-3 sm:gap-4 md:gap-5 overflow-x-auto py-2 px-1 scroll-smooth snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {categories.map((cat, idx) => {
              const theme = getCategoryTheme(cat.slug, cat.name);
              return (
                <Link
                  key={cat.slug || idx}
                  to={cat.path}
                  className="w-28 sm:w-36 md:w-40 flex-shrink-0 snap-start bg-white hover:bg-surface-subtle border border-surface-border rounded-2xl p-3 sm:p-4 text-center flex flex-col items-center justify-between transition-all duration-300 hover:shadow-card hover:-translate-y-1.5 group cursor-pointer"
                >
                  <div
                    className={`w-full h-18 sm:h-20 rounded-2xl flex items-center justify-center mb-2.5 transition-transform duration-300 group-hover:scale-105 shadow-xs ${theme.bg} ${theme.hoverBg} border ${theme.border}`}
                  >
                    <CategoryFunkyIcon slug={cat.slug} name={cat.name} className="w-9 h-9 sm:w-11 sm:h-11" />
                  </div>

                  <h3 className="text-[11px] sm:text-xs font-bold text-brand-ink uppercase tracking-tight group-hover:text-brand-green transition-colors leading-tight line-clamp-2">
                    {cat.name}
                  </h3>
                </Link>
              );
            })}
          </div>

          {/* Mobile View All Link */}
          <div className="mt-3 text-center sm:hidden">
            <Link
              to="/shop"
              className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-brand-green hover:underline"
            >
              <span>View All Categories</span>
              <Icon name="arrow-right" className="text-xs" />
            </Link>
          </div>
        </div>
      </section>

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
            {filteredProducts.map((p, idx) => (
              <ProductCard key={p.id} product={p} priority={idx < 4} />
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

      {/* 5. Help Topics / Targeted Support Chips (Directly After Trending Now) */}
      <section className="py-12 md:py-16 bg-white border-b border-surface-border">
        <div className="max-w-site mx-auto px-4 sm:px-6 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-green mb-2 block">
            Targeted Support
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight text-brand-ink mb-3">
            What are you looking to support today?
          </h2>
          <p className="text-xs sm:text-sm text-ink-muted max-w-xl mx-auto mb-8">
            Filter our catalog directly by your specific health and skin wellness priority.
          </p>

          <div className="flex flex-wrap justify-center gap-3 sm:gap-4 max-w-3xl mx-auto">
            {HELP_TOPICS.map((topic, idx) => (
              <Link
                key={idx}
                to={`/shop?support=${topic.filter}`}
                className="bg-white border border-surface-border hover:border-brand-green hover:bg-surface-subtle px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold text-brand-ink hover:text-brand-green shadow-xs hover:shadow-sm transition-all"
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

      {/* 7c. Special Offers & Bundles (Directly After Science & Regulatory Accreditations) */}
      {dealsEnabled && activeBundles.length > 0 && (
        <section className="py-12 md:py-16 bg-surface-subtle border-b border-surface-border">
          <div className="max-w-site mx-auto px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4 pb-4 border-b border-surface-border">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-brand-green block mb-1">
                  Exclusive Savings
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-brand-ink">
                  Special Offers &amp; Bundles
                </h2>
                <p className="text-xs text-ink-muted mt-1">
                  Hand-crafted promotional packages and family value bundles backed by science.
                </p>
              </div>
              <Link
                to="/offers"
                className="text-xs font-bold uppercase tracking-wider text-brand-green hover:underline flex items-center gap-1 self-start sm:self-auto"
              >
                <span>View All Offers</span>
                <Icon name="arrow-right" className="text-xs" />
              </Link>
            </div>

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
                    className={`border rounded-lg p-8 flex flex-col justify-between shadow-card relative overflow-hidden bg-white hover:border-brand-green/40 transition-all ${
                      isGreenStyle
                        ? 'border-brand-green/30'
                        : 'border-surface-border'
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
                      <Link to={deal.link || '/offers'}>
                        <Button variant="primary" size="sm" className="h-[40px] px-6 font-bold">
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

      {/* 9. Trust Strip (At Very End of Page Above Footer) */}
      <section className="border-t border-surface-border bg-white py-8">
        <div className="max-w-site mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="border border-surface-border bg-surface-subtle p-4 rounded-md flex items-center gap-3.5 shadow-sm">
              <div className="w-10 h-10 rounded-sm bg-white border border-surface-border flex items-center justify-center flex-shrink-0 text-brand-green">
                <Icon name="cod" className="text-lg" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-brand-ink">Cash on Delivery</h3>
                <p className="text-[11px] text-ink-muted">Verify &amp; pay at your door</p>
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
    </div>
  );
}
