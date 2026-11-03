import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Breadcrumbs from '../components/layout/Breadcrumbs';
import ProductCard from '../components/product/ProductCard';
import Icon from '../components/ui/Icon';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';
import SEOHead from '../components/seo/SEOHead';
import { api } from '../services/api';

const CATEGORIES = [
  { slug: '', label: 'All Categories' },
  { slug: 'multivitamins', label: 'Multivitamins' },
  { slug: 'skincare', label: 'Skin Care' },
  { slug: 'immunity', label: 'Immunity' },
  { slug: 'bones-joints', label: 'Bone & Joints' },
  { slug: 'skin-glow', label: 'Skin & Glow' },
];

const SORT_OPTIONS = [
  { value: '-created_at', label: 'Newest Arrivals' },
  { value: 'price', label: 'Price: Low to High' },
  { value: '-price', label: 'Price: High to Low' },
  { value: '-rating', label: 'Highest Rated' },
];

// Fallback catalog if backend is not seeded yet
const FALLBACK_CATALOG = [
  {
    id: 1,
    name: 'Supplivix Complete Daily Multivitamin 60s',
    slug: 'supplivix-complete-daily-multivitamin-60s',
    product_type: 'multivitamin',
    category_slug: 'multivitamins',
    category_name: 'Multivitamins',
    price: 2450,
    compare_at_price: 2900,
    rating: 4.9,
    reviews_count: 52,
    inventory_count: 100,
    is_featured: true,
  },
  {
    id: 2,
    name: 'Advanced Vitamin C + Zinc Immunity Shield 30s',
    slug: 'advanced-vitamin-c-zinc-immunity-shield-30s',
    product_type: 'multivitamin',
    category_slug: 'immunity',
    category_name: 'Immunity',
    price: 1850,
    compare_at_price: 2200,
    rating: 4.8,
    reviews_count: 38,
    inventory_count: 85,
    is_featured: true,
  },
  {
    id: 3,
    name: 'Radiant Glow Biotin & Collagen Complex',
    slug: 'radiant-glow-biotin-collagen-complex',
    product_type: 'multivitamin',
    category_slug: 'skin-glow',
    category_name: 'Skin & Glow',
    price: 2750,
    compare_at_price: 3300,
    rating: 4.9,
    reviews_count: 44,
    inventory_count: 60,
    is_featured: true,
  },
  {
    id: 4,
    name: 'Niacinamide 10% + Zinc Clarifying Serum 30ml',
    slug: 'niacinamide-10-zinc-clarifying-serum-30ml',
    product_type: 'skincare',
    category_slug: 'skincare',
    category_name: 'Skin Care',
    price: 1650,
    compare_at_price: 1950,
    rating: 4.7,
    reviews_count: 29,
    inventory_count: 45,
    is_featured: false,
  },
  {
    id: 5,
    name: 'High Potency Vitamin D3 5000 IU + K2',
    slug: 'high-potency-vitamin-d3-5000-iu-k2',
    product_type: 'multivitamin',
    category_slug: 'bones-joints',
    category_name: 'Bone & Joints',
    price: 1950,
    compare_at_price: 2300,
    rating: 4.9,
    reviews_count: 31,
    inventory_count: 70,
    is_featured: true,
  },
  {
    id: 6,
    name: 'Ultra Hydrating Hyaluronic Barrier Cream 50ml',
    slug: 'ultra-hydrating-hyaluronic-barrier-cream-50ml',
    product_type: 'skincare',
    category_slug: 'skincare',
    category_name: 'Skin Care',
    price: 1890,
    compare_at_price: 2250,
    rating: 4.8,
    reviews_count: 26,
    inventory_count: 55,
    is_featured: false,
  },
  {
    id: 7,
    name: 'Men\'s Active Daily Energy Multivitamin',
    slug: 'mens-active-daily-energy-multivitamin',
    product_type: 'multivitamin',
    category_slug: 'multivitamins',
    category_name: 'Multivitamins',
    price: 2600,
    compare_at_price: 3100,
    rating: 4.9,
    reviews_count: 35,
    inventory_count: 40,
    is_featured: true,
  },
  {
    id: 8,
    name: 'Women\'s Complete Balanced Multivitamin',
    slug: 'womens-complete-balanced-multivitamin',
    product_type: 'multivitamin',
    category_slug: 'multivitamins',
    category_name: 'Multivitamins',
    price: 2600,
    compare_at_price: 3100,
    rating: 5.0,
    reviews_count: 47,
    inventory_count: 65,
    is_featured: true,
  },
  {
    id: 9,
    name: 'Daily Magnesium Glycinate 400mg Calming Rest',
    slug: 'daily-magnesium-glycinate-400mg-calming-rest',
    product_type: 'multivitamin',
    category_slug: 'multivitamins',
    category_name: 'Multivitamins',
    price: 2200,
    compare_at_price: 2600,
    rating: 4.9,
    reviews_count: 22,
    inventory_count: 50,
    is_featured: false,
  },
  {
    id: 10,
    name: 'Gentle Salicylic Cleansing Gel 150ml',
    slug: 'gentle-salicylic-cleansing-gel-150ml',
    product_type: 'skincare',
    category_slug: 'skincare',
    category_name: 'Skin Care',
    price: 1450,
    compare_at_price: 1750,
    rating: 4.6,
    reviews_count: 19,
    inventory_count: 35,
    is_featured: false,
  },
];

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState(FALLBACK_CATALOG);
  const [loading, setLoading] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Filter states derived from URL
  const currentCategory = searchParams.get('category') || '';
  const searchQuery = searchParams.get('q') || '';
  const currentOrdering = searchParams.get('ordering') || '-created_at';
  const inStockOnly = searchParams.get('in_stock') === 'true';
  const minPrice = searchParams.get('min_price') || '';
  const maxPrice = searchParams.get('max_price') || '';

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value === '' || value === null || value === undefined) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next);
  };

  const clearAllFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  // Fetch from API
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (currentCategory) params.category = currentCategory;
      if (searchQuery) params.search = searchQuery;
      if (currentOrdering) params.ordering = currentOrdering;
      if (inStockOnly) params.in_stock = 'true';
      if (minPrice) params.min_price = minPrice;
      if (maxPrice) params.max_price = maxPrice;

      const data = await api.getProducts(params);
      if (data && data.results && data.results.length > 0) {
        setProducts(data.results);
      } else if (!data || data.count === 0) {
        setProducts([]);
      }
    } catch {
      // Fallback filtering in memory
      let filtered = [...FALLBACK_CATALOG];
      if (currentCategory) {
        filtered = filtered.filter((p) => p.category_slug === currentCategory);
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (p) => p.name.toLowerCase().includes(q) || p.product_type.toLowerCase().includes(q)
        );
      }
      if (inStockOnly) {
        filtered = filtered.filter((p) => p.inventory_count > 0);
      }
      if (minPrice) {
        filtered = filtered.filter((p) => p.price >= Number(minPrice));
      }
      if (maxPrice) {
        filtered = filtered.filter((p) => p.price <= Number(maxPrice));
      }
      if (currentOrdering === 'price') {
        filtered.sort((a, b) => a.price - b.price);
      } else if (currentOrdering === '-price') {
        filtered.sort((a, b) => b.price - a.price);
      } else if (currentOrdering === '-rating') {
        filtered.sort((a, b) => b.rating - a.rating);
      }
      setProducts(filtered);
    } finally {
      setLoading(false);
    }
  }, [currentCategory, searchQuery, currentOrdering, inStockOnly, minPrice, maxPrice]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (currentCategory) count++;
    if (searchQuery) count++;
    if (inStockOnly) count++;
    if (minPrice || maxPrice) count++;
    return count;
  }, [currentCategory, searchQuery, inStockOnly, minPrice, maxPrice]);

  const currentCategoryLabel = currentCategory
    ? CATEGORIES.find((c) => c.slug === currentCategory)?.label || currentCategory
    : 'All Formulations';

  const shopSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${currentCategoryLabel} | Supplivix Pakistan`,
    description: 'Browse pure, bioavailable multivitamins and targeted skincare formulations with Cash on Delivery across Pakistan.',
    url: 'https://supplivix.pk/shop',
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: products.slice(0, 20).map((prod, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        name: prod.name,
        url: `https://supplivix.pk/products/${prod.slug}`,
      })),
    },
  };

  const breadcrumbItems = [
    { label: 'Shop', href: '/shop' },
    ...(currentCategory ? [{ label: CATEGORIES.find((c) => c.slug === currentCategory)?.label || currentCategory }] : []),
  ];

  const filterSidebarContent = (
    <div className="space-y-6">
      {/* Category Filter */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-brand-ink mb-3">
          Categories
        </h3>
        <div className="space-y-1">
          {CATEGORIES.map((cat) => {
            const isActive = currentCategory === cat.slug;
            return (
              <button
                key={cat.slug}
                type="button"
                onClick={() => {
                  updateParam('category', cat.slug);
                  setMobileFilterOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-sm text-xs transition-colors flex items-center justify-between ${isActive
                  ? 'bg-brand-ink text-white font-bold'
                  : 'text-ink-muted hover:bg-surface-subtle hover:text-brand-ink'
                  }`}
              >
                <span>{cat.label}</span>
                {isActive && <Icon name="check" className="text-xs" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Price Range Filter */}
      <div className="pt-4 border-t border-surface-border">
        <h3 className="text-xs font-bold uppercase tracking-wider text-brand-ink mb-3">
          Price Range (PKR)
        </h3>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <Input
            name="min_price"
            type="number"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => updateParam('min_price', e.target.value)}
            className="text-xs py-1.5"
            aria-label="Minimum price in PKR"
          />
          <Input
            name="max_price"
            type="number"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => updateParam('max_price', e.target.value)}
            className="text-xs py-1.5"
            aria-label="Maximum price in PKR"
          />
        </div>
      </div>

      {/* In-Stock Filter Toggle */}
      <div className="pt-4 border-t border-surface-border">
        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-brand-ink">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => updateParam('in_stock', e.target.checked ? 'true' : '')}
            className="rounded-sm border-surface-border text-brand-green focus:ring-brand-green h-4 w-4"
          />
          <span>In-Stock Only</span>
        </label>
      </div>

      {/* Reset Filters */}
      {activeFilterCount > 0 && (
        <div className="pt-4 border-t border-surface-border">
          <Button
            variant="outline"
            size="sm"
            onClick={clearAllFilters}
            className="w-full text-xs"
          >
            Clear All Filters ({activeFilterCount})
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white min-h-screen">
      <SEOHead
        title={currentCategory ? `${currentCategoryLabel} | Supplivix` : 'Shop Multivitamins & Skincare | Supplivix'}
        description="Shop bioavailable daily multivitamins, zinc, vitamin D3, and targeted skincare in Pakistan. Fast nationwide Cash on Delivery with free delivery over Rs. 2,000."
        canonical="/shop"
        schema={shopSchema}
      />
      <Breadcrumbs items={breadcrumbItems} />

      <div className="max-w-site mx-auto px-4 sm:px-6 py-8">
        {/* Page Heading & Search Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-surface-border gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-brand-ink">
              {currentCategory
                ? CATEGORIES.find((c) => c.slug === currentCategory)?.label || 'All Products'
                : 'All Formulations'}
            </h1>
            <p className="text-xs text-ink-muted mt-1">
              Showing {products.length} {products.length === 1 ? 'product' : 'products'} • Cash on Delivery across Pakistan
            </p>
          </div>

          {/* Right Controls: Sort Dropdown & Mobile Filter Button */}
          <div className="flex items-center gap-3">
            {/* Mobile Filter Trigger Button */}
            <button
              type="button"
              onClick={() => setMobileFilterOpen(true)}
              className="lg:hidden inline-flex items-center gap-2 bg-surface-subtle border border-surface-border text-brand-ink px-3 py-2 rounded-sm text-xs font-bold"
            >
              <Icon name="sliders" className="text-xs" />
              <span>Filters {activeFilterCount > 0 && `(${activeFilterCount})`}</span>
            </button>

            {/* Sort Selector */}
            <div className="flex items-center gap-2 text-xs">
              <label htmlFor="sort-select" className="text-ink-muted font-medium hidden sm:inline">
                Sort by:
              </label>
              <select
                id="sort-select"
                value={currentOrdering}
                onChange={(e) => updateParam('ordering', e.target.value)}
                className="bg-surface-subtle border border-surface-border rounded-sm px-3 py-2 text-xs font-semibold text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-green cursor-pointer"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Search query tag if present */}
        {searchQuery && (
          <div className="mt-4 flex items-center gap-2 bg-surface-subtle border border-surface-border px-3 py-1.5 rounded-sm text-xs text-brand-ink self-start inline-flex">
            <span>Search: "{searchQuery}"</span>
            <button
              type="button"
              onClick={() => updateParam('q', '')}
              className="text-ink-muted hover:text-brand-ink ml-1"
              aria-label="Clear search query"
            >
              <Icon name="close" className="text-xs" />
            </button>
          </div>
        )}

        {/* 2-Column Layout: Sidebar & Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mt-8">
          {/* Desktop Filter Sidebar */}
          <aside className="hidden lg:block lg:col-span-1">
            <div className="bg-surface-subtle border border-surface-border rounded-md p-5 sticky top-24">
              {filterSidebarContent}
            </div>
          </aside>

          {/* Products Grid */}
          <section className="lg:col-span-3">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="border border-surface-border rounded-md p-4 bg-white space-y-3">
                    <Skeleton className="h-44 w-full" />
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <EmptyState
                icon="capsules"
                title="No Products Found"
                description="We could not find any products matching your selected filters. Try broadening your criteria."
                actionLabel="Clear Filters"
                onAction={clearAllFilters}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Mobile Filters Drawer (Solid Background, 1px Border, NO Glassmorphism) */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Solid Backdrop Overlay (no blur) */}
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setMobileFilterOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Content */}
          <div className="relative ml-auto w-full max-w-xs bg-white h-full shadow-hover flex flex-col justify-between p-6 overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-surface-border mb-6">
                <h2 className="text-sm font-bold uppercase tracking-wider text-brand-ink">
                  Filter Products
                </h2>
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(false)}
                  className="p-1 text-ink-muted hover:text-brand-ink"
                  aria-label="Close filters drawer"
                >
                  <Icon name="close" className="text-base" />
                </button>
              </div>

              {filterSidebarContent}
            </div>

            <div className="pt-6 border-t border-surface-border mt-6">
              <Button
                variant="primary"
                size="md"
                onClick={() => setMobileFilterOpen(false)}
                className="w-full"
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
