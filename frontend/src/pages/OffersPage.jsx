import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Breadcrumbs from '../components/layout/Breadcrumbs';
import Icon from '../components/ui/Icon';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';
import SEOHead from '../components/seo/SEOHead';
import { useCart } from '../context/CartContext';
import { useToast } from '../components/ui/Toast';
import { api } from '../services/api';

export default function OffersPage() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    free_shipping_threshold: 2000,
  });

  const { addToCart } = useCart();
  const { showToast } = useToast();

  useEffect(() => {
    let active = true;

    // Load public shipping threshold
    api.getPublicSettings()
      .then((data) => {
        if (!active || !data) return;
        setSettings((prev) => ({
          ...prev,
          ...data,
        }));
      })
      .catch(() => {});

    // Fetch ONLY admin-configured promotional offers
    api.getOffers()
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data) ? data : (data?.results || []);
        // Strictly only active offers
        const activeOnly = list.filter((o) => o.is_active !== false);
        setOffers(activeOnly);
      })
      .catch(() => {
        if (active) setOffers([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleAddToCart = (offer) => {
    if (offer.product) {
      addToCart({
        id: offer.product.id,
        name: offer.title || offer.product.name,
        price: offer.price || offer.product.price,
        compare_at_price: offer.original_price || offer.product.compare_at_price,
        slug: offer.product.slug,
        image: offer.image || offer.product.image,
      }, 1);
      showToast(`Added "${offer.title}" to your cart!`);
    }
  };

  return (
    <div className="bg-white min-h-screen text-brand-ink">
      <SEOHead
        title="Special Offers & Deals | Supplivix"
        description="Exclusive bundle discounts, limited-time price drops, and promotional multivitamin and skincare deals from Supplivix Pakistan."
        canonical="/offers"
      />

      <Breadcrumbs items={[{ label: 'Special Offers', href: '/offers' }]} />

      {/* Hero Header with Panoramic Special Offers Background */}
      <section className="relative overflow-hidden bg-surface-subtle border-b border-surface-border py-14 md:py-20 text-center">
        {/* Panoramic Background Photography */}
        <div
          className="absolute inset-0 bg-cover bg-center pointer-events-none opacity-85 transition-opacity duration-300"
          style={{
            backgroundImage: "url('/media/offers-hero-bg.jpg')",
          }}
          aria-hidden="true"
        />

        {/* Soft center gradient wash ensuring 100% WCAG contrast for centered typography */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-[#faf9f6]/40 via-[#faf9f6]/92 via-50% to-[#faf9f6]/40 pointer-events-none"
          aria-hidden="true"
        />

        <div className="max-w-site mx-auto px-4 sm:px-6 relative z-10">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-green mb-2 block">
            Admin Verified Deals • Limited-Time Savings
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold uppercase tracking-tight text-brand-ink mb-4">
            Special Offers &amp; Value Bundles
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-ink-muted max-w-2xl mx-auto leading-relaxed mb-6">
            Explore exclusive promotional discounts on daily multivitamins, targeted skin nutrition complexes, and curated bulk bundles handpicked by Supplivix.
          </p>

          {/* Value Highlights Pill Strip */}
          <div className="inline-flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs font-semibold text-brand-ink">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-surface-border rounded-full shadow-sm hover:border-brand-green transition-colors">
              <Icon name="truck" className="text-brand-green text-xs" />
              <span>Free Delivery on Orders Over Rs. {Number(settings.free_shipping_threshold || 2000).toLocaleString()}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-surface-border rounded-full shadow-sm hover:border-brand-green transition-colors">
              <Icon name="cod" className="text-brand-green text-xs" />
              <span>Cash on Delivery Across Pakistan</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-surface-border rounded-full shadow-sm hover:border-brand-green transition-colors">
              <Icon name="shield" className="text-brand-green text-xs" />
              <span>100% Genuine Lab-Tested Quality</span>
            </span>
          </div>
        </div>
      </section>

      {/* Only Admin-Configured Offers Grid */}
      <section className="py-12 md:py-16 bg-white">
        <div className="max-w-site mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4 pb-4 border-b border-surface-border">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-brand-green block mb-1">
                Official Store Promotions
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-brand-ink">
                Active Special Offers
              </h2>
              <p className="text-xs text-ink-muted mt-1">
                Showing exclusively promotional deals and discounted offers configured by Supplivix administration.
              </p>
            </div>
            {!loading && (
              <span className="text-xs font-semibold text-brand-ink px-3 py-1 bg-surface-subtle border border-surface-border rounded-full whitespace-nowrap self-start sm:self-auto">
                {offers.length} Active {offers.length === 1 ? 'Offer' : 'Offers'}
              </span>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border border-surface-border rounded-lg p-6 space-y-4 bg-surface-subtle">
                  <Skeleton className="w-1/3 h-5 rounded" />
                  <Skeleton className="w-3/4 h-7 rounded" />
                  <Skeleton className="w-full h-16 rounded" />
                  <Skeleton className="w-1/2 h-6 rounded" />
                  <Skeleton className="w-full h-10 rounded" />
                </div>
              ))}
            </div>
          ) : offers.length === 0 ? (
            <EmptyState
              title="No Active Special Offers at this Moment"
              description="Admin has not configured any active promotional offers right now. Check back soon for upcoming holiday sales, or browse our complete catalog."
              actionLabel="Explore All Products"
              onAction={() => window.location.href = '/shop'}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {offers.map((offer) => {
                const discount =
                  offer.discount_percentage ||
                  (offer.original_price && offer.price && offer.original_price > offer.price
                    ? Math.round(((offer.original_price - offer.price) / offer.original_price) * 100)
                    : 0);

                return (
                  <div
                    key={offer.id}
                    className="border border-surface-border rounded-lg p-6 bg-surface-subtle flex flex-col justify-between shadow-card hover:border-brand-green/40 transition-all relative overflow-hidden"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        {offer.badge && (
                          <Badge variant="sale" className="font-bold text-[11px]">
                            {offer.badge}
                          </Badge>
                        )}
                        {discount > 0 && (
                          <span className="text-[11px] font-bold text-white bg-red-600 px-2 py-0.5 rounded-sm">
                            {discount}% OFF
                          </span>
                        )}
                      </div>

                      {/* Optional Image */}
                      {offer.image && (
                        <div className="mb-4 h-44 w-full bg-white border border-surface-border rounded-md overflow-hidden flex items-center justify-center p-2">
                          <img
                            src={offer.image}
                            alt={offer.title}
                            className="max-h-full max-w-full object-contain"
                            loading="lazy"
                          />
                        </div>
                      )}

                      {/* Offer Title */}
                      <h3 className="text-xl font-bold uppercase tracking-tight text-brand-ink mb-2">
                        {offer.title}
                      </h3>

                      {/* Description */}
                      {offer.description && (
                        <p className="text-xs text-ink-muted leading-relaxed mb-4">
                          {offer.description}
                        </p>
                      )}

                      {/* Linked Product Info Pill */}
                      {offer.product && (
                        <div className="mb-4 p-2 bg-white border border-surface-border rounded text-[11px] text-ink-muted flex items-center justify-between">
                          <span className="truncate font-medium text-brand-ink">
                            Includes: {offer.product.name}
                          </span>
                          <span className="text-brand-green font-semibold shrink-0 ml-2">
                            In Stock
                          </span>
                        </div>
                      )}
                    </div>

                    <div>
                      {/* Pricing */}
                      <div className="flex items-baseline gap-2 mb-4 pt-3 border-t border-surface-border">
                        <span className="text-2xl font-bold text-brand-ink">
                          Rs. {Number(offer.price).toLocaleString()}
                        </span>
                        {offer.original_price && Number(offer.original_price) > Number(offer.price) && (
                          <span className="text-xs text-ink-muted line-through">
                            Rs. {Number(offer.original_price).toLocaleString()}
                          </span>
                        )}
                        {discount > 0 && (
                          <span className="text-xs font-semibold text-brand-green">
                            Save Rs. {(Number(offer.original_price) - Number(offer.price)).toLocaleString()}
                          </span>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        {offer.product ? (
                          <>
                            <Button
                              type="button"
                              variant="primary"
                              size="sm"
                              onClick={() => handleAddToCart(offer)}
                              className="flex-1 h-[40px] font-bold"
                            >
                              Add to Cart
                            </Button>
                            <Link to={offer.link || `/products/${offer.product.slug}`} className="shrink-0">
                              <Button variant="outline" size="sm" className="h-[40px] px-3">
                                View
                              </Button>
                            </Link>
                          </>
                        ) : (
                          <Link to={offer.link || '/shop'} className="w-full">
                            <Button variant="primary" size="sm" className="w-full h-[40px] font-bold">
                              {offer.button_text || 'Claim Offer'}
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom Catalog Discovery Strip */}
          <div className="mt-14 text-center pt-8 border-t border-surface-border">
            <span className="text-xs text-ink-muted block mb-3">
              Looking for something else? Browse our complete collection of multivitamins, serums, and nutritional supplements.
            </span>
            <Link to="/shop">
              <Button variant="outline" size="md">
                Browse Full Store Catalog
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
