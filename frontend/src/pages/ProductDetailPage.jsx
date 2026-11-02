import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Breadcrumbs from '../components/layout/Breadcrumbs';
import ProductIllustration from '../components/ui/ProductIllustration';
import Icon from '../components/ui/Icon';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import QuantityStepper from '../components/ui/QuantityStepper';
import Input from '../components/ui/Input';
import { useCart } from '../context/CartContext';
import { useToast } from '../components/ui/Toast';
import { api } from '../services/api';
import SEOHead from '../components/seo/SEOHead';

const SAMPLE_PRODUCT = {
  id: 1,
  name: 'Supplivix Complete Daily Multivitamin 60s',
  slug: 'supplivix-complete-daily-multivitamin-60s',
  product_type: 'multivitamin',
  category_name: 'Multivitamins',
  category_slug: 'multivitamins',
  price: 2450,
  compare_at_price: 2900,
  inventory_count: 50,
  rating: 4.9,
  reviews_count: 52,
  description:
    'A high-potency daily micronutrient formulation engineered for modern adult nutritional demands. Delivers 24 bioavailable vitamins and chelated minerals to support metabolic energy, natural immunity, and daily cellular vitality.',
  serving_size: '1 Tablet Daily with a meal',
  directions: 'Take one (1) tablet daily with food, preferably in the morning with breakfast. Swallow with a full glass of water. Do not exceed the recommended daily dose.',
  ingredients: 'Vitamin A (Retinyl Palmitate), Vitamin C (Ascorbic Acid), Vitamin D3 (Cholecalciferol), Vitamin E (d-Alpha Tocopherol), Thiamin, Riboflavin, Niacin, Vitamin B6, Folate (L-Methylfolate), Vitamin B12 (Methylcobalamin), Biotin, Pantothenic Acid, Calcium, Iron (Ferrous Bisglycinate), Iodine, Magnesium (Magnesium Glycinate), Zinc (Zinc Picolinate), Selenium, Copper, Manganese, Chromium.',
  storage: 'Store in a cool, dry place away from direct sunlight and moisture. Keep bottle tightly closed. Keep out of reach of children.',
};

export default function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { showToast } = useToast();

  const [product, setProduct] = useState(SAMPLE_PRODUCT);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('overview');
  const [reviews, setReviews] = useState([]);
  const [adding, setAdding] = useState(false);

  // Review Form states
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewBody, setReviewBody] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');

  useEffect(() => {
    // Attempt to load product from API
    api.getProduct(slug)
      .then((data) => {
        if (data) setProduct(data);
      })
      .catch(() => {
        // Fallback to sample with matching slug
        setProduct((prev) => ({ ...prev, slug }));
      });

    // Load reviews
    api.getProductReviews(slug)
      .then((data) => {
        if (Array.isArray(data)) setReviews(data);
        else if (data && data.results) setReviews(data.results);
      })
      .catch(() => {});
  }, [slug]);

  const discountPercent =
    product.compare_at_price && product.compare_at_price > product.price
      ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
      : 0;

  const handleAddToCart = async () => {
    setAdding(true);
    const result = await addToCart(product.id, quantity);
    setAdding(false);

    if (result.success) {
      showToast(`Added ${quantity} x "${product.name}" to cart`);
    } else {
      showToast(result.message || 'Could not add to cart', 'error');
    }
  };

  const handleBuyNow = async () => {
    setAdding(true);
    const result = await addToCart(product.id, quantity);
    setAdding(false);

    if (result.success) {
      navigate('/checkout');
    } else {
      showToast(result.message || 'Could not proceed to checkout', 'error');
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setReviewError('');
    if (!reviewTitle.trim() || !reviewBody.trim()) {
      setReviewError('Please provide both a title and review content.');
      return;
    }

    setSubmittingReview(true);
    try {
      await api.createReview(product.slug, {
        rating: reviewRating,
        title: reviewTitle,
        content: reviewBody,
      });
      showToast('Thank you! Your verified review has been submitted.');
      setReviewTitle('');
      setReviewBody('');
      // Reload reviews
      const updated = await api.getProductReviews(product.slug);
      if (Array.isArray(updated)) setReviews(updated);
    } catch (err) {
      setReviewError(
        err.message || 'Only verified buyers who completed an order can submit a review.'
      );
    } finally {
      setSubmittingReview(false);
    }
  };

  const breadcrumbs = [
    { label: 'Shop', href: '/shop' },
    { label: product.category_name || 'Catalog', href: `/shop?category=${product.category_slug || ''}` },
    { label: product.name },
  ];

  return (
    <div className="bg-white min-h-screen pb-16">
      <SEOHead title={product.name} description={product.short_description || product.description} canonical={`/products/${product.slug}`} ogType="product" />
      <Breadcrumbs items={breadcrumbs} />

      <div className="max-w-site mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Column: Product Image / Illustration */}
          <div className="lg:col-span-6">
            <div className="bg-surface-subtle border border-surface-border rounded-lg p-8 sm:p-12 flex items-center justify-center shadow-card sticky top-24">
              {product.images && product.images.length > 0 ? (
                <img
                  src={product.images[0].image}
                  alt={product.name}
                  className="w-full max-h-[380px] object-contain"
                />
              ) : (
                <ProductIllustration
                  type={product.product_type === 'skincare' ? 'serum' : 'bottle'}
                  accentColor={product.product_type === 'multivitamin' ? '#016a38' : '#7a2fd0'}
                  label={product.serving_size ? 'Daily' : 'Supplivix'}
                  size="lg"
                />
              )}
            </div>
          </div>

          {/* Right Column: Title, Price, Stepper, Actions */}
          <div className="lg:col-span-6 flex flex-col justify-between">
            <div>
              {/* Category & Badge */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-brand-green uppercase tracking-wider">
                  {product.category_name || 'Supplivix Formulations'}
                </span>
                {discountPercent > 0 && (
                  <Badge variant="sale">Save {discountPercent}%</Badge>
                )}
                {product.inventory_count > 0 ? (
                  <Badge variant="pill">In Stock</Badge>
                ) : (
                  <span className="bg-gray-200 text-gray-700 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-xs">
                    Out of Stock
                  </span>
                )}
              </div>

              {/* Product Title */}
              <h1 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-brand-ink leading-snug mb-3">
                {product.name}
              </h1>

              {/* Reviews Star Rating */}
              <div className="flex items-center gap-2 mb-4 text-xs">
                <div className="flex items-center text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Icon
                      key={i}
                      name={i < Math.round(product.rating || 5) ? 'star' : 'star-outline'}
                      className="text-xs"
                    />
                  ))}
                </div>
                <span className="font-bold text-brand-ink">{product.rating || 4.9}</span>
                <span className="text-ink-muted">({product.reviews_count || 52} customer reviews)</span>
              </div>

              {/* Pricing Display */}
              <div className="flex items-baseline gap-3 mb-6 p-4 bg-surface-subtle border border-surface-border rounded-md">
                <span className="text-2xl sm:text-3xl font-bold text-brand-ink">
                  Rs. {Number(product.price).toLocaleString()}
                </span>
                {product.compare_at_price && product.compare_at_price > product.price && (
                  <span className="text-sm text-ink-muted line-through font-medium">
                    Rs. {Number(product.compare_at_price).toLocaleString()}
                  </span>
                )}
                <span className="text-xs text-brand-green font-semibold ml-auto">
                  Cash on Delivery (COD)
                </span>
              </div>

              {/* Description Snippet */}
              <p className="text-xs sm:text-sm text-ink-muted leading-relaxed mb-6">
                {product.description}
              </p>

              {/* Free Shipping Dynamic Progress */}
              <div className="mb-6 p-3 bg-white border border-surface-border rounded-md text-xs">
                <div className="flex items-center gap-2 font-semibold text-brand-ink mb-1">
                  <Icon name="truck" className="text-brand-green" />
                  <span>
                    {product.price >= 2000
                      ? 'This order qualifies for FREE nationwide delivery!'
                      : `Add Rs. ${(2000 - product.price).toLocaleString()} more to unlock FREE shipping.`}
                  </span>
                </div>
              </div>

              {/* Quantity Stepper & Buttons */}
              <div className="space-y-4 pt-4 border-t border-surface-border">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-ink">Quantity:</span>
                  <QuantityStepper
                    value={quantity}
                    onChange={setQuantity}
                    max={product.inventory_count || 10}
                    disabled={product.inventory_count <= 0}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleAddToCart}
                    loading={adding}
                    disabled={product.inventory_count <= 0}
                    className="w-full"
                  >
                    <Icon name="cart" className="mr-2" />
                    Add to Cart
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={handleBuyNow}
                    disabled={product.inventory_count <= 0 || adding}
                    className="w-full"
                  >
                    Buy Now (COD)
                  </Button>
                </div>
              </div>

              {/* Trust Strip */}
              <div className="mt-8 pt-6 border-t border-surface-border grid grid-cols-3 gap-2 text-center text-[11px] text-ink-muted font-semibold">
                <div className="p-2 border border-surface-border rounded-sm bg-surface-subtle">
                  <Icon name="cod" className="text-brand-green text-sm block mx-auto mb-1" />
                  <span>Pay Cash on Delivery</span>
                </div>
                <div className="p-2 border border-surface-border rounded-sm bg-surface-subtle">
                  <Icon name="shield" className="text-brand-green text-sm block mx-auto mb-1" />
                  <span>Authentic Formula</span>
                </div>
                <div className="p-2 border border-surface-border rounded-sm bg-surface-subtle">
                  <Icon name="returns" className="text-brand-green text-sm block mx-auto mb-1" />
                  <span>7-Day Return Policy</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Information Tabs */}
        <div className="mt-16 border-t border-surface-border pt-10">
          <div className="flex border-b border-surface-border gap-6 text-xs font-bold uppercase tracking-wider overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`pb-3 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'border-brand-ink text-brand-ink'
                  : 'border-transparent text-ink-muted hover:text-brand-ink'
              }`}
            >
              Overview & Directions
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('supplement-facts')}
              className={`pb-3 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'supplement-facts'
                  ? 'border-brand-ink text-brand-ink'
                  : 'border-transparent text-ink-muted hover:text-brand-ink'
              }`}
            >
              Supplement Facts
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('reviews')}
              className={`pb-3 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'reviews'
                  ? 'border-brand-ink text-brand-ink'
                  : 'border-transparent text-ink-muted hover:text-brand-ink'
              }`}
            >
              Verified Reviews ({reviews.length || product.reviews_count || 52})
            </button>
          </div>

          <div className="py-8">
            {activeTab === 'overview' && (
              <div className="space-y-6 max-w-3xl text-xs sm:text-sm text-ink-muted leading-relaxed">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wide text-brand-ink mb-2">
                    Product Description
                  </h3>
                  <p>{product.description}</p>
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wide text-brand-ink mb-2">
                    Suggested Daily Use
                  </h3>
                  <p>{product.directions}</p>
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wide text-brand-ink mb-2">
                    Storage Guidelines
                  </h3>
                  <p>{product.storage}</p>
                </div>
              </div>
            )}

            {activeTab === 'supplement-facts' && (
              <div className="max-w-2xl bg-surface-subtle border border-surface-border rounded-lg p-6 shadow-card">
                <h3 className="text-base font-bold uppercase tracking-wide text-brand-ink border-b-2 border-brand-ink pb-2 mb-3">
                  Supplement Facts
                </h3>
                <div className="text-xs text-ink-muted mb-4">
                  Serving Size: {product.serving_size}
                </div>
                <div className="text-xs text-ink-muted leading-relaxed border-t border-surface-border pt-3">
                  <span className="font-bold text-brand-ink block mb-1">Active Nutritional Matrix:</span>
                  {product.ingredients}
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                {/* Review Form */}
                <div className="md:col-span-5 bg-surface-subtle border border-surface-border rounded-lg p-6 shadow-card self-start">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-brand-ink mb-2">
                    Write a Verified Review
                  </h3>
                  <p className="text-xs text-ink-muted mb-4">
                    Only verified buyers who completed an order can submit ratings.
                  </p>
                  <form onSubmit={handleReviewSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-brand-ink mb-1">
                        Rating (1 to 5 Stars)
                      </label>
                      <select
                        value={reviewRating}
                        onChange={(e) => setReviewRating(Number(e.target.value))}
                        className="w-full bg-white border border-surface-border rounded-sm p-2 text-xs"
                      >
                        <option value={5}>5 Stars - Excellent</option>
                        <option value={4}>4 Stars - Very Good</option>
                        <option value={3}>3 Stars - Average</option>
                        <option value={2}>2 Stars - Below Expectation</option>
                        <option value={1}>1 Star - Poor</option>
                      </select>
                    </div>

                    <Input
                      label="Review Title"
                      name="title"
                      value={reviewTitle}
                      onChange={(e) => setReviewTitle(e.target.value)}
                      placeholder="e.g. Noticeable energy boost within a week"
                      required
                    />

                    <div>
                      <label className="block text-xs font-semibold text-brand-ink mb-1">
                        Detailed Review
                      </label>
                      <textarea
                        value={reviewBody}
                        onChange={(e) => setReviewBody(e.target.value)}
                        rows={3}
                        className="w-full bg-white border border-surface-border rounded-sm p-2 text-xs text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-green"
                        placeholder="Share your personal experience with dosage and results..."
                        required
                      />
                    </div>

                    {reviewError && (
                      <p className="text-xs text-red-600 font-semibold">{reviewError}</p>
                    )}

                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      loading={submittingReview}
                      className="w-full"
                    >
                      Submit Review
                    </Button>
                  </form>
                </div>

                {/* Review Feed */}
                <div className="md:col-span-7 space-y-4">
                  {reviews.length === 0 ? (
                    <div className="bg-surface-subtle border border-surface-border rounded-md p-6 text-center text-xs text-ink-muted">
                      No customer reviews yet. Be the first verified customer to share feedback!
                    </div>
                  ) : (
                    reviews.map((rev) => (
                      <div key={rev.id} className="border border-surface-border rounded-md p-4 bg-white shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1 text-amber-500 text-xs">
                            {[...Array(5)].map((_, i) => (
                              <Icon
                                key={i}
                                name={i < rev.rating ? 'star' : 'star-outline'}
                                className="text-[11px]"
                              />
                            ))}
                          </div>
                          <span className="text-[11px] text-ink-muted">
                            {new Date(rev.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-brand-ink mb-1">{rev.title}</h4>
                        <p className="text-xs text-ink-muted leading-relaxed mb-2">{rev.content}</p>
                        <div className="text-[10px] font-semibold text-brand-green flex items-center gap-1">
                          <Icon name="check" />
                          <span>Verified Buyer</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Mandatory Health Disclaimer on every supplement page (Rule 5) */}
          <div className="mt-8 p-4 bg-surface-subtle border border-surface-border rounded-md text-xs text-ink-muted leading-relaxed">
            <span className="font-bold text-brand-ink block mb-1">Regulatory Health Disclaimer:</span>
            These statements have not been evaluated by a regulator. This product is not intended to diagnose, treat, cure or prevent any disease. Always consult your healthcare professional before use.
          </div>
        </div>
      </div>

      {/* Sticky Bottom Bar on Mobile (360px) for Easy COD Purchase */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-surface-border p-3 z-30 shadow-hover flex items-center justify-between gap-3">
        <div>
          <span className="text-[11px] text-ink-muted block">Cash on Delivery</span>
          <span className="text-base font-bold text-brand-ink">Rs. {Number(product.price).toLocaleString()}</span>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={handleAddToCart}
          disabled={product.inventory_count <= 0}
          className="h-[38px] px-5"
        >
          <Icon name="cart" className="mr-1.5" />
          Add to Cart
        </Button>
      </div>
    </div>
  );
}
