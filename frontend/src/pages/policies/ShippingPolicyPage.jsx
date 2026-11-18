import React, { useState, useEffect } from 'react';
import PolicyLayout from './PolicyLayout';
import { api } from '../../services/api';

const SECTIONS = [
  { id: 'delivery-timeline', title: '1. Delivery Timeline' },
  { id: 'free-shipping', title: '2. Free Shipping Threshold' },
  { id: 'cod-guidelines', title: '3. Cash on Delivery (COD) Guidelines' },
];

export default function ShippingPolicyPage() {
  const [threshold, setThreshold] = useState(2000);
  const [flatFee, setFlatFee] = useState(200);

  useEffect(() => {
    let active = true;
    api.getPublicSettings?.()
      .then((res) => {
        if (!active) return;
        const t = Number(res?.free_shipping_threshold || res?.data?.free_shipping_threshold);
        const f = Number(res?.flat_shipping_fee || res?.data?.flat_shipping_fee);
        if (t > 0) setThreshold(t);
        if (f > 0) setFlatFee(f);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);
  return (
    <PolicyLayout
      title="Shipping and COD Policy"
      canonical="/shipping-policy"
      lastUpdated="November 2, 2026"
      sections={SECTIONS}
    >
      <div className="bg-surface-subtle border border-surface-border rounded-lg p-6 sm:p-7 shadow-sm space-y-3">
        <section id="delivery-timeline">
          <h2 className="text-base sm:text-lg font-bold text-brand-ink uppercase tracking-wide mb-2">
            1. Delivery Timeline
          </h2>
          <p className="leading-relaxed">
            Orders placed before 2:00 PM PST on working days are processed and dispatched within 24 to 48 hours. Standard courier delivery takes 2 to 4 working days for major urban centers (Karachi, Lahore, Faisalabad, Islamabad, Rawalpindi) and 3 to 6 working days for regional destinations across Pakistan.
          </p>
        </section>
      </div>

      <div className="bg-surface-subtle border border-surface-border rounded-lg p-6 sm:p-7 shadow-sm space-y-3">
        <section id="free-shipping">
          <h2 className="text-base sm:text-lg font-bold text-brand-ink uppercase tracking-wide mb-2">
            2. Free Shipping Threshold
          </h2>
          <p className="leading-relaxed">
            We offer <strong>Free Nationwide Delivery</strong> on all orders where the subtotal after any applied promotional discounts reaches <strong>Rs. {threshold.toLocaleString()} or more</strong>. For orders below Rs. {threshold.toLocaleString()}, a standardized flat shipping fee of <strong>Rs. {flatFee.toLocaleString()}</strong> applies across all provinces.
          </p>
          <div className="bg-white border border-surface-border rounded-md p-3 text-xs text-ink-muted">
            <strong className="text-brand-green">Savings Tip:</strong> Add any complementary multivitamin or facial serum to reach Rs. {threshold.toLocaleString()} and enjoy free courier shipping.
          </div>
        </section>
      </div>

      <div className="bg-surface-subtle border border-surface-border rounded-lg p-6 sm:p-7 shadow-sm space-y-3">
        <section id="cod-guidelines">
          <h2 className="text-base sm:text-lg font-bold text-brand-ink uppercase tracking-wide mb-2">
            3. Cash on Delivery (COD) Guidelines
          </h2>
          <p className="leading-relaxed">
            Cash on Delivery is the sole payment method. Please have the exact change in whole Pakistani Rupees ready for the delivery rider. Riders are not authorized to hand over parcels prior to receiving full cash payment.
          </p>
        </section>
      </div>
    </PolicyLayout>
  );
}
