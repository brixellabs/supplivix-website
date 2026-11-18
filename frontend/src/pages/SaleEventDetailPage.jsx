import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ProductCard from '../components/product/ProductCard';
import SaleCountdownTimer from '../components/common/SaleCountdownTimer';
import SEOHead from '../components/seo/SEOHead';
import Icon from '../components/ui/Icon';
import Button from '../components/ui/Button';
import { api } from '../services/api';

export default function SaleEventDetailPage() {
  const { slug } = useParams();
  const [event, setEvent] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortOption, setSortOption] = useState('featured');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    api.getSaleEventDetail(slug)
      .then((data) => {
        if (!active) return;
        if (data?.event) {
          setEvent(data.event);
          setProducts(data.products || []);
        } else {
          setError('Sale event not found.');
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'Unable to load sale event.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [slug]);

  // Extract unique categories from products
  const categories = React.useMemo(() => {
    const set = new Set();
    products.forEach((p) => {
      if (p.category_name) set.add(p.category_name);
    });
    return Array.from(set);
  }, [products]);

  // Filter and sort
  const filteredProducts = React.useMemo(() => {
    let list = [...products];
    if (selectedCategory !== 'all') {
      list = list.filter((p) => p.category_name === selectedCategory);
    }
    if (sortOption === 'price-low') {
      list.sort((a, b) => a.price - b.price);
    } else if (sortOption === 'price-high') {
      list.sort((a, b) => b.price - a.price);
    }
    return list;
  }, [products, selectedCategory, sortOption]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center bg-white py-16">
        <div className="flex flex-col items-center gap-3">
          <Icon name="spinner" spin className="text-3xl text-brand-green" />
          <p className="text-xs uppercase tracking-wider font-bold text-ink-muted">Loading sale event...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-[50vh] max-w-site mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold uppercase tracking-tight text-brand-ink mb-3">Event Not Available</h1>
        <p className="text-sm text-ink-muted mb-6">{error || 'This sale event has ended or does not exist.'}</p>
        <Link to="/shop">
          <Button variant="primary">Browse All Products</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      <SEOHead
        title={`${event.name} | Special Deals Supplivix`}
        description={event.description || `Special promotional discounts for ${event.name}. Verified cash on delivery across Pakistan.`}
        canonical={`/sale/${event.slug}`}
      />

      {/* Hero Banner */}
      <section className="bg-red-700 text-white py-12 sm:py-16 border-b border-red-800 relative overflow-hidden">
        <div className="max-w-site mx-auto px-4 sm:px-6 relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <span className="inline-block bg-white text-red-700 text-xs font-black uppercase tracking-widest px-3 py-1 rounded mb-3 shadow-sm">
              {event.badge_text || 'Seasonal Campaign'}
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-white mb-3">
              {event.name}
            </h1>
            <p className="text-sm sm:text-base text-red-100 leading-relaxed max-w-xl">
              {event.description || 'Exclusive discounts on science-backed multivitamins and skincare. Calculated at runtime with Cash on Delivery nationwide.'}
            </p>
          </div>

          {event.show_countdown && event.end_at && (
            <div className="bg-red-800/90 border border-red-600/60 p-5 rounded-lg flex flex-col items-center sm:items-start text-center sm:text-left shadow-lg">
              <span className="text-[11px] uppercase tracking-wider font-extrabold text-red-200 mb-2">
                Sale Expires In:
              </span>
              <SaleCountdownTimer
                targetDate={event.end_at}
                badgeText=""
              />
              <span className="text-[10px] text-red-200 mt-2 block">
                Prices automatically revert when the countdown finishes.
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Main Content: Filter Bar & Product Grid */}
      <section className="max-w-site mx-auto px-4 sm:px-6 py-10 sm:py-14">
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-8 border-b border-surface-border">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-ink mr-2">Filter:</span>
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-sm uppercase tracking-wider transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-brand-ink text-white'
                  : 'bg-surface-subtle text-ink-muted hover:text-brand-ink border border-surface-border'
              }`}
            >
              All ({products.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-bold rounded-sm uppercase tracking-wider transition-colors ${
                  selectedCategory === cat
                    ? 'bg-brand-ink text-white'
                    : 'bg-surface-subtle text-ink-muted hover:text-brand-ink border border-surface-border'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <label htmlFor="sale-sort" className="text-xs font-bold uppercase tracking-wider text-brand-ink">
              Sort:
            </label>
            <select
              id="sale-sort"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="text-xs bg-white border border-surface-border rounded-sm px-3 py-1.5 font-medium text-brand-ink focus:outline-none focus:border-brand-green"
            >
              <option value="featured">Featured</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Product Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-surface-subtle border border-surface-border rounded-md">
            <Icon name="tag" className="text-3xl text-ink-muted mb-2" />
            <p className="text-sm font-bold text-brand-ink mb-1">No products found in this category.</p>
            <p className="text-xs text-ink-muted">Try selecting "All" or browse our complete catalog.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

