import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Breadcrumbs from '../components/layout/Breadcrumbs';
import Icon from '../components/ui/Icon';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';
import ProductIllustration from '../components/ui/ProductIllustration';
import SEOHead from '../components/seo/SEOHead';
import { useCart } from '../context/CartContext';
import { useToast } from '../components/ui/Toast';
import { api, normalizeMediaUrl } from '../services/api';

function OfferImage({ offer }) {
  const [imgError, setImgError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const rawCandidate =
    offer.image ||
    offer.product?.image ||
    offer.product?.thumbnail ||
    (offer.product?.slug ? `/media/products/clean-${offer.product.slug}.jpg` : '');

  const normalized = normalizeMediaUrl(rawCandidate);
  const webpUrl = normalized ? normalized.replace(/\.(jpg|jpeg|png)$/i, '.webp') : null;

  const illustrationType =
    offer.product?.slug?.includes('serum') ? 'serum' :
    offer.product?.slug?.includes('cream') ? 'jar' :
    offer.product?.slug?.includes('sunscreen') ? 'tube' :
    'bottle';

  if (!normalized || imgError) {
    return (
      <div className="mb-4 h-48 w-full bg-white border border-surface-border rounded-md overflow-hidden flex items-center justify-center p-3">
        <ProductIllustration
          type={illustrationType}
          color="#016a38"
          name={offer.title || offer.product?.name || 'Supplivix'}
          className="w-full h-full max-h-40"
        />
      </div>
    );
  }

  return (
    <div className="mb-4 h-48 w-full bg-white border border-surface-border rounded-md overflow-hidden flex items-center justify-center p-3 relative">
      <picture className="w-full h-full flex items-center justify-center">
        {webpUrl && <source srcSet={webpUrl} type="image/webp" />}
        <img
          src={normalized}
          alt={offer.title}
          className={`max-h-full max-w-full object-contain transition-opacity duration-300 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={(e) => {
            if (offer.product?.slug && !e.currentTarget.src.includes(`clean-${offer.product.slug}`)) {
              e.currentTarget.src = `/media/products/clean-${offer.product.slug}.jpg`;
            } else {
              setImgError(true);
            }
          }}
        />
      </picture>
    </div>
  );
}

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
      const pPrice = Number(offer.price) > 0 ? Number(offer.price) : Number(offer.product.price) || 0;
      const pOriginal =
        Number(offer.original_price) > 0
          ? Number(offer.original_price)
          : Number(offer.product.compare_at_price) || null;
      addToCart(
        {
          id: offer.product.id,
          name: offer.title || offer.product.name,
          price: pPrice,
          compare_at_price: pOriginal,
          slug: offer.product.slug,
          image: normalizeMediaUrl(offer.image || offer.product.image),
        },
        1
      );
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
                const effectivePrice =
                  Number(offer.price) > 0
                    ? Number(offer.price)
                    : offer.product?.price && Number(offer.product.price) > 0
                    ? Number(offer.product.price)
                    : 0;

                const effectiveOriginalPrice =
                  Number(offer.original_price) > 0
                    ? Number(offer.original_price)
                    : offer.product?.compare_at_price && Number(offer.product.compare_at_price) > 0
                    ? Number(offer.product.compare_at_price)
                    : null;

                const hasDiscount = Boolean(
                  effectiveOriginalPrice &&
                    effectiveOriginalPrice > effectivePrice &&
                    effectivePrice > 0
                );

                const discount =
                  offer.discount_percentage && Number(offer.discount_percentage) > 0
                    ? Number(offer.discount_percentage)
                    : hasDiscount
                    ? Math.round(
                        ((effectiveOriginalPrice - effectivePrice) / effectiveOriginalPrice) * 100
                      )
                    : 0;

                const savings = hasDiscount ? effectiveOriginalPrice - effectivePrice : 0;

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
                        {discount > 0 && effectivePrice > 0 && (
                          <span className="text-[11px] font-bold text-white bg-red-600 px-2 py-0.5 rounded-sm">
                            {discount}% OFF
                          </span>
                        )}
                      </div>

                      {/* Offer Product / Bundle Image */}
                      <OfferImage offer={offer} />

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
                      <div className="flex items-baseline gap-2 mb-4 pt-3 border-t border-surface-border flex-wrap">
                        {effectivePrice > 0 ? (
                          <>
                            <span className="text-2xl font-bold text-brand-ink">
                              Rs. {effectivePrice.toLocaleString()}
                            </span>
                            {effectiveOriginalPrice && effectiveOriginalPrice > effectivePrice && (
                              <span className="text-xs text-ink-muted line-through">
                                Rs. {effectiveOriginalPrice.toLocaleString()}
                              </span>
                            )}
                            {savings > 0 && (
                              <span className="text-xs font-semibold text-brand-green">
                                Save Rs. {savings.toLocaleString()}
                              </span>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-brand-green">
                              {offer.highlight || 'Free Nationwide Delivery'}
                            </span>
                          </div>
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
