import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Breadcrumbs from '../components/layout/Breadcrumbs';
import QuantityStepper from '../components/ui/QuantityStepper';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Icon from '../components/ui/Icon';
import EmptyState from '../components/ui/EmptyState';
import ProductIllustration from '../components/ui/ProductIllustration';
import SEOHead from '../components/seo/SEOHead';
import { useCart } from '../context/CartContext';
import { useToast } from '../components/ui/Toast';

const FREE_SHIPPING_THRESHOLD = 2000;

export default function CartPage() {
  const navigate = useNavigate();
  const { cart, updateQuantity, removeItem, applyCoupon, removeCoupon, loading } = useCart();
  const { showToast } = useToast();

  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  const items = cart?.items || [];
  const subtotal = cart?.subtotal || 0;
  const discountAmount = cart?.discount_amount || 0;
  const netSubtotal = Math.max(0, subtotal - discountAmount);
  const shippingFee = cart?.shipping_fee !== undefined ? cart.shipping_fee : (netSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : 200);
  const grandTotal = cart?.grand_total || (netSubtotal + shippingFee);

  const amountNeeded = Math.max(0, FREE_SHIPPING_THRESHOLD - netSubtotal);
  const freeShippingProgress = Math.min(100, Math.round((netSubtotal / FREE_SHIPPING_THRESHOLD) * 100));

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    setCouponLoading(true);
    const res = await applyCoupon(couponCode.trim().toUpperCase());
    setCouponLoading(false);

    if (res.success) {
      showToast('Coupon applied successfully!');
      setCouponCode('');
    } else {
      showToast(res.message || 'Invalid or expired coupon', 'error');
    }
  };

  const handleRemoveCoupon = async () => {
    setCouponLoading(true);
    await removeCoupon();
    setCouponLoading(false);
    showToast('Coupon removed');
  };

  if (!loading && items.length === 0) {
    return (
      <div className="bg-white min-h-[60vh]">
        <SEOHead
          title="Shopping Cart | Supplivix"
          description="View your shopping cart at Supplivix Pakistan. Multivitamins and skincare with Cash on Delivery."
          canonical="/cart"
          noindex={true}
        />
        <Breadcrumbs items={[{ label: 'Cart' }]} />
        <div className="max-w-site mx-auto px-4 py-16">
          <EmptyState
            icon="cart"
            title="Your Cart is Empty"
            description="Looks like you haven't added any multivitamins or skincare products to your cart yet."
            actionLabel="Explore Catalog"
            onAction={() => navigate('/shop')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      <SEOHead
        title="Shopping Cart | Supplivix"
        description="View your shopping cart at Supplivix Pakistan. Multivitamins and skincare with Cash on Delivery."
        canonical="/cart"
        noindex={true}
      />
      <Breadcrumbs items={[{ label: 'Shopping Cart', href: '/cart' }]} />

      <div className="max-w-site mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-brand-ink mb-6">
          Shopping Cart ({items.reduce((s, i) => s + i.quantity, 0)} items)
        </h1>

        {/* Free Shipping Progress Alert */}
        <div className="bg-surface-subtle border border-surface-border rounded-lg p-4 mb-8 shadow-card">
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span className="flex items-center gap-1.5 text-brand-ink">
              <Icon name="truck" className="text-brand-green" />
              {amountNeeded === 0 ? (
                <strong className="text-brand-green">You have unlocked FREE delivery across Pakistan!</strong>
              ) : (
                <span>
                  Add <strong className="text-brand-ink">Rs. {amountNeeded.toLocaleString()}</strong> more to get <strong>FREE delivery</strong>
                </span>
              )}
            </span>
            <span className="text-ink-muted">{freeShippingProgress}%</span>
          </div>
          <div className="w-full bg-surface-border rounded-full h-2 overflow-hidden">
            <div
              className="bg-brand-green h-2 rounded-full transition-all duration-300"
              style={{ width: `${freeShippingProgress}%` }}
            />
          </div>
        </div>

        {/* 2-Column Grid: Items List & Order Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Cart Items List */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white border border-surface-border rounded-lg shadow-card overflow-hidden">
              <div className="divide-y divide-surface-border">
                {items.map((item) => (
                  <div key={item.id} className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    {/* Visual & Details */}
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-16 h-16 bg-surface-subtle border border-surface-border rounded-md p-1 flex items-center justify-center flex-shrink-0">
                        {item.product_thumbnail ? (
                          <img
                            src={item.product_thumbnail}
                            alt={item.product_name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <ProductIllustration
                            type={item.product_name?.toLowerCase().includes('serum') ? 'serum' : 'bottle'}
                            accentColor="#016a38"
                            size="sm"
                          />
                        )}
                      </div>

                      <div>
                        <Link
                          to={`/products/${item.product_slug || ''}`}
                          className="text-xs sm:text-sm font-bold text-brand-ink hover:text-brand-green transition-colors leading-snug"
                        >
                          {item.product_name}
                        </Link>
                        <div className="text-xs text-ink-muted mt-1">
                          Rs. {Number(item.unit_price).toLocaleString()} each
                        </div>
                      </div>
                    </div>

                    {/* Stepper, Total, and Delete */}
                    <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-6">
                      <QuantityStepper
                        value={item.quantity}
                        onChange={(val) => updateQuantity(item.id, val)}
                        max={item.product_stock || 10}
                      />

                      <div className="text-right">
                        <span className="block text-sm font-bold text-brand-ink">
                          Rs. {Number(item.line_total || item.unit_price * item.quantity).toLocaleString()}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-ink-muted hover:text-red-600 p-1"
                        aria-label={`Remove ${item.product_name} from cart`}
                      >
                        <Icon name="trash" className="text-sm" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Coupon Application Box */}
            <div className="bg-surface-subtle border border-surface-border rounded-lg p-5 shadow-card">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-ink mb-3">
                Discount Coupon
              </h3>
              {cart?.coupon_code ? (
                <div className="flex items-center justify-between bg-white border border-brand-green px-4 py-2.5 rounded-md">
                  <div className="flex items-center gap-2">
                    <Icon name="tag" className="text-brand-green text-sm" />
                    <span className="text-xs font-bold text-brand-green">
                      {cart.coupon_code} Applied (-Rs. {discountAmount.toLocaleString()})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    disabled={couponLoading}
                    className="text-xs text-red-600 hover:underline font-semibold"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <Input
                    name="coupon"
                    placeholder="Enter code (e.g. WELCOME10)"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="text-xs py-2 uppercase"
                    aria-label="Coupon code"
                  />
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    loading={couponLoading}
                    className="text-xs px-5 whitespace-nowrap"
                  >
                    Apply
                  </Button>
                </form>
              )}
            </div>
          </div>

          {/* Right Column: Order Summary */}
          <div className="lg:col-span-4">
            <div className="bg-surface-subtle border border-surface-border rounded-lg p-6 shadow-card sticky top-24">
              <h2 className="text-base font-bold uppercase tracking-wider text-brand-ink pb-4 border-b border-surface-border mb-4">
                Order Summary
              </h2>

              <div className="space-y-3 text-xs text-ink-muted pb-4 border-b border-surface-border">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-brand-ink">
                    Rs. {Number(subtotal).toLocaleString()}
                  </span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-brand-green font-semibold">
                    <span>Coupon Discount</span>
                    <span>-Rs. {Number(discountAmount).toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>Estimated Delivery</span>
                  <span className="font-semibold text-brand-ink">
                    {shippingFee === 0 ? (
                      <span className="text-brand-green uppercase font-bold">Free</span>
                    ) : (
                      `Rs. ${Number(shippingFee).toLocaleString()}`
                    )}
                  </span>
                </div>
              </div>

              {/* Grand Total */}
              <div className="flex justify-between items-baseline py-4 border-b border-surface-border mb-6">
                <div>
                  <span className="text-sm font-bold text-brand-ink block">Total Due (COD)</span>
                  <span className="text-[10px] text-ink-muted">Cash on Delivery at your doorstep</span>
                </div>
                <span className="text-xl font-bold text-brand-ink">
                  Rs. {Number(grandTotal).toLocaleString()}
                </span>
              </div>

              {/* Checkout Action */}
              <Link to="/checkout" className="block w-full">
                <Button variant="primary" size="lg" className="w-full h-[46px]">
                  Proceed to Checkout
                </Button>
              </Link>

              <div className="mt-4 text-center">
                <Link
                  to="/shop"
                  className="text-xs text-ink-muted hover:text-brand-green underline inline-flex items-center gap-1"
                >
                  <Icon name="arrow-left" className="text-[10px]" />
                  <span>Continue Shopping</span>
                </Link>
              </div>

              {/* Payment & Guarantee Notice */}
              <div className="mt-6 pt-4 border-t border-surface-border text-[11px] text-ink-muted space-y-2">
                <div className="flex items-center gap-2">
                  <Icon name="cod" className="text-brand-green" />
                  <span>100% Cash on Delivery across Pakistan</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icon name="shield" className="text-brand-green" />
                  <span>Verified bioavailable ingredients</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
