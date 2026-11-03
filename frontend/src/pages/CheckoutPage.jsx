import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Breadcrumbs from '../components/layout/Breadcrumbs';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import Badge from '../components/ui/Badge';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import SEOHead from '../components/seo/SEOHead';
import { api } from '../services/api';

const PROVINCES = [
  'Punjab',
  'Sindh',
  'Khyber Pakhtunkhwa',
  'Balochistan',
  'Islamabad Capital Territory',
  'Gilgit-Baltistan',
  'Azad Kashmir',
];

const MAJOR_CITIES = [
  'Lahore',
  'Karachi',
  'Islamabad',
  'Rawalpindi',
  'Faisalabad',
  'Multan',
  'Peshawar',
  'Quetta',
  'Gujranwala',
  'Sialkot',
  'Hyderabad',
  'Sargodha',
  'Bahawalpur',
  'Abbottabad',
  'Sukkur',
];

function generateIdempotencyKey() {
  return 'splv_ord_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
}

export default function CheckoutPage() {
  const { cart, fetchCart } = useCart();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [idempotencyKey] = useState(generateIdempotencyKey);
  const [loading, setLoading] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);

  // Form State
  const [fullName, setFullName] = useState(user ? `${user.first_name} ${user.last_name}`.trim() : '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('Punjab');
  const [postalCode, setPostalCode] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [honeypot, setHoneypot] = useState('');

  // Validation Errors
  const [errors, setErrors] = useState({});

  const items = cart?.items || [];
  const subtotal = cart?.subtotal || 0;
  const discountAmount = cart?.discount_amount || 0;
  const netSubtotal = Math.max(0, subtotal - discountAmount);
  const shippingFee = cart?.shipping_fee !== undefined ? cart.shipping_fee : (netSubtotal >= 2000 ? 0 : 200);
  const grandTotal = cart?.grand_total || (netSubtotal + shippingFee);

  // Validate form matching server validation rules exactly
  const validateForm = () => {
    const errs = {};
    if (!fullName.trim() || fullName.trim().length < 2) {
      errs.fullName = 'Please enter your full name (at least 2 characters).';
    }
    if (!email.trim() || !email.includes('@')) {
      errs.email = 'Please provide a valid email address for order confirmation.';
    }
    // Pakistani Phone Normalization rule
    const cleanPhone = phone.replace(/[\s-]/g, '');
    const phoneRegex = /^(\+923\d{9}|03\d{9})$/;
    if (!cleanPhone || !phoneRegex.test(cleanPhone)) {
      errs.phone = 'Please enter a valid Pakistani mobile number (e.g. 03001234567).';
    }
    if (!streetAddress.trim() || streetAddress.trim().length < 5) {
      errs.streetAddress = 'Please enter complete house/street address (min 5 characters).';
    }
    if (!city.trim()) {
      errs.city = 'Please enter or select your delivery city.';
    }
    if (!province.trim()) {
      errs.province = 'Please select your province.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!validateForm()) {
      showToast('Please correct the highlighted form errors.', 'error');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        recipient_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        street_address: streetAddress.trim(),
        city: city.trim(),
        province: province.trim(),
        postal_code: postalCode.trim(),
        delivery_notes: deliveryNotes.trim(),
        payment_method: 'cod', // COD only
        idempotency_key: idempotencyKey,
        website: honeypot, // Honeypot trap
      };

      const result = await api.placeOrder(payload);
      setCompletedOrder(result);
      fetchCart(); // Clear cart
      showToast('Order placed successfully! Cash on Delivery confirmed.');
    } catch (err) {
      if (err.fields) {
        setErrors(err.fields);
      }
      showToast(err.message || 'Unable to place order. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // If order was successfully completed, render confirmation view
  if (completedOrder) {
    return (
      <div className="bg-white min-h-screen py-12">
        <div className="max-w-xl mx-auto px-4 sm:px-6">
          <div className="border border-brand-green bg-green-50/40 rounded-lg p-8 shadow-card text-center">
            <div className="w-16 h-16 bg-brand-green text-white rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="check" className="text-2xl" />
            </div>

            <span className="text-xs font-bold uppercase tracking-widest text-brand-green mb-1 block">
              Order Confirmed
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-brand-ink mb-2">
              Thank You For Your Order!
            </h1>
            <p className="text-xs sm:text-sm text-ink-muted mb-6">
              Your Cash on Delivery order has been registered and is being prepared for dispatch.
            </p>

            {/* Order Details Card */}
            <div className="bg-white border border-surface-border rounded-md p-6 text-left text-xs space-y-3 mb-6 shadow-sm">
              <div className="flex justify-between border-b border-surface-border pb-2">
                <span className="text-ink-muted">Order Number:</span>
                <span className="font-bold text-brand-ink">{completedOrder.order_number}</span>
              </div>
              <div className="flex justify-between border-b border-surface-border pb-2">
                <span className="text-ink-muted">Payment Method:</span>
                <span className="font-bold text-brand-green">Cash on Delivery (COD)</span>
              </div>
              <div className="flex justify-between border-b border-surface-border pb-2">
                <span className="text-ink-muted">Total Payable to Rider:</span>
                <span className="font-bold text-brand-ink text-sm">
                  Rs. {Number(completedOrder.grand_total).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between border-b border-surface-border pb-2">
                <span className="text-ink-muted">Recipient Name:</span>
                <span className="font-semibold text-brand-ink">{completedOrder.recipient_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Delivery Address:</span>
                <span className="font-medium text-brand-ink text-right">
                  {completedOrder.street_address}, {completedOrder.city}
                </span>
              </div>
            </div>

            {/* COD Instructions Note */}
            <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-xs text-amber-900 text-left mb-6">
              <span className="font-bold block mb-1">Cash on Delivery Notice:</span>
              Please keep the exact cash amount of <strong>Rs. {Number(completedOrder.grand_total).toLocaleString()}</strong> ready for the courier rider upon delivery.
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to={`/track?number=${completedOrder.order_number}&phone=${encodeURIComponent(phone)}`}
                className="flex-1"
              >
                <Button variant="primary" size="md" className="w-full">
                  Track Your Order
                </Button>
              </Link>
              <Link to="/shop" className="flex-1">
                <Button variant="outline" size="md" className="w-full">
                  Continue Shopping
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If cart is empty, redirect back to cart
  if (items.length === 0) {
    return (
      <div className="bg-white min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-lg font-bold text-brand-ink mb-2">No Items to Checkout</h2>
        <p className="text-xs text-ink-muted mb-4">Please add products to your cart before proceeding.</p>
        <Link to="/shop">
          <Button variant="primary" size="sm">Go to Shop</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen pb-16">
      <SEOHead
        title="Cash on Delivery Checkout | Supplivix"
        description="Complete your Cash on Delivery order for authentic multivitamins and skincare at Supplivix Pakistan."
        canonical="/checkout"
        noindex={true}
      />
      <Breadcrumbs items={[{ label: 'Cart', href: '/cart' }, { label: 'Checkout' }]} />

      <div className="max-w-site mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-brand-ink mb-8">
          Cash on Delivery Checkout
        </h1>

        <form onSubmit={handleSubmitOrder} noValidate>
          {/* Honeypot traps */}
          <input
            type="text"
            name="website"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            className="hidden"
            aria-hidden="true"
          />
          <input
            type="text"
            name="company_name"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            className="hidden"
            aria-hidden="true"
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Delivery & Contact Form */}
            <div className="lg:col-span-7 space-y-6">
              {/* 1. Contact Information */}
              <div className="bg-surface-subtle border border-surface-border rounded-lg p-6 shadow-card">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-surface-border">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-brand-ink">
                    1. Contact Information
                  </h2>
                  <span className="text-[11px] text-ink-muted">SMS & Call Updates</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Input
                      label="Full Recipient Name"
                      name="fullName"
                      placeholder="e.g. Muhammad Usman"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      error={errors.fullName}
                      required
                    />
                  </div>

                  <div>
                    <Input
                      label="Email Address"
                      name="email"
                      type="email"
                      placeholder="e.g. usman@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      error={errors.email}
                      required
                    />
                  </div>

                  <div>
                    <Input
                      label="Mobile Number (Pakistan)"
                      name="phone"
                      type="tel"
                      placeholder="03XXXXXXXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      error={errors.phone}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* 2. Delivery Address */}
              <div className="bg-surface-subtle border border-surface-border rounded-lg p-6 shadow-card">
                <h2 className="text-xs font-bold uppercase tracking-wider text-brand-ink mb-4 pb-2 border-b border-surface-border">
                  2. Nationwide Delivery Address
                </h2>

                <div className="space-y-4">
                  <Input
                    label="Street Address / House / Flat Number"
                    name="streetAddress"
                    placeholder="House 12, Street 4, Sector F-7/2"
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    error={errors.streetAddress}
                    required
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="checkout-city" className="block text-xs font-semibold text-brand-ink mb-1">
                        City <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="checkout-city"
                        list="city-suggestions"
                        name="city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Select or type city"
                        className={`w-full bg-white border ${errors.city ? 'border-red-500' : 'border-surface-border'
                          } rounded-sm p-2 text-xs text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-green`}
                        required
                      />
                      <datalist id="city-suggestions">
                        {MAJOR_CITIES.map((c) => (
                          <option key={c} value={c} />
                        ))}
                      </datalist>
                      {errors.city && <p className="text-[11px] text-red-600 mt-1">{errors.city}</p>}
                    </div>

                    <div>
                      <label htmlFor="checkout-province" className="block text-xs font-semibold text-brand-ink mb-1">
                        Province <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="checkout-province"
                        name="province"
                        value={province}
                        onChange={(e) => setProvince(e.target.value)}
                        className="w-full bg-white border border-surface-border rounded-sm p-2 text-xs text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-green"
                      >
                        {PROVINCES.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Input
                        label="Postal Code (Optional)"
                        name="postalCode"
                        placeholder="e.g. 54000"
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="deliveryNotes" className="block text-xs font-semibold text-brand-ink mb-1">
                      Delivery Instructions for Courier Rider (Optional)
                    </label>
                    <textarea
                      id="deliveryNotes"
                      name="deliveryNotes"
                      rows={2}
                      value={deliveryNotes}
                      onChange={(e) => setDeliveryNotes(e.target.value)}
                      placeholder="e.g. Please call before arriving or deliver between 2pm-5pm"
                      className="w-full bg-white border border-surface-border rounded-sm p-2 text-xs text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-green"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Payment Method: COD Only */}
              <div className="bg-surface-subtle border border-surface-border rounded-lg p-6 shadow-card">
                <h2 className="text-xs font-bold uppercase tracking-wider text-brand-ink mb-4 pb-2 border-b border-surface-border">
                  3. Payment Method
                </h2>

                <div className="bg-white border-2 border-brand-green rounded-md p-4 flex items-start gap-3">
                  <input
                    type="radio"
                    name="payment_method"
                    id="cod-radio"
                    checked
                    readOnly
                    className="mt-1 text-brand-green focus:ring-brand-green"
                  />
                  <div>
                    <label htmlFor="cod-radio" className="font-bold text-sm text-brand-ink flex items-center gap-2 cursor-pointer">
                      <span>Cash on Delivery (COD)</span>
                      <Badge variant="pill">Default & Only</Badge>
                    </label>
                    <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                      Pay cash to the courier rider upon delivery at your doorstep anywhere in Pakistan. No prepayment or credit card required.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Order Summary & Place Order Button */}
            <div className="lg:col-span-5">
              <div className="bg-surface-subtle border border-surface-border rounded-lg p-6 shadow-card sticky top-24">
                <h2 className="text-base font-bold uppercase tracking-wider text-brand-ink pb-4 border-b border-surface-border mb-4">
                  Order Summary ({items.length} {items.length === 1 ? 'item' : 'items'})
                </h2>

                {/* Items preview list */}
                <div className="divide-y divide-surface-border max-h-60 overflow-y-auto mb-4 pr-1">
                  {items.map((item) => (
                    <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="flex-1 pr-3">
                        <span className="font-bold text-brand-ink block truncate">{item.product_name}</span>
                        <span className="text-ink-muted">Qty: {item.quantity} × Rs. {Number(item.unit_price).toLocaleString()}</span>
                      </div>
                      <span className="font-bold text-brand-ink">
                        Rs. {Number(item.line_total || item.unit_price * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Subtotals */}
                <div className="space-y-2.5 text-xs text-ink-muted pt-3 border-t border-surface-border pb-4">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-semibold text-brand-ink">
                      Rs. {Number(subtotal).toLocaleString()}
                    </span>
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex justify-between text-brand-green font-semibold">
                      <span>Discount ({cart?.coupon_code})</span>
                      <span>-Rs. {Number(discountAmount).toLocaleString()}</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span>Nationwide Shipping</span>
                    <span className="font-semibold text-brand-ink">
                      {shippingFee === 0 ? (
                        <span className="text-brand-green font-bold uppercase">Free</span>
                      ) : (
                        `Rs. ${Number(shippingFee).toLocaleString()}`
                      )}
                    </span>
                  </div>
                </div>

                {/* Grand Total */}
                <div className="flex justify-between items-baseline py-4 border-t border-b border-surface-border mb-6">
                  <div>
                    <span className="text-sm font-bold text-brand-ink block">Amount Due (COD)</span>
                    <span className="text-[10px] text-ink-muted">Payable to courier rider</span>
                  </div>
                  <span className="text-2xl font-bold text-brand-ink">
                    Rs. {Number(grandTotal).toLocaleString()}
                  </span>
                </div>

                {/* Submit Order Button */}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={loading}
                  className="w-full h-[48px] uppercase tracking-wider"
                >
                  <Icon name="check" className="mr-2" />
                  Confirm Cash on Delivery Order
                </Button>

                <p className="text-[11px] text-ink-muted text-center mt-3 leading-snug">
                  By clicking confirm, you agree to inspect your parcel and pay the exact amount upon physical delivery.
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
