import React from 'react';
import PolicyLayout from './PolicyLayout';

export default function ShippingPolicyPage() {
  return (
    <PolicyLayout
      title="Shipping and COD Policy"
      canonical="/shipping-policy"
      lastUpdated="November 2, 2026"
    >
      <section>
        <h2 className="text-lg font-bold text-brand-ink uppercase mb-2">1. Delivery Timeline</h2>
        <p>
          Orders placed before 2:00 PM PST on working days are processed and dispatched within 24 to 48 hours. Standard courier delivery takes 2 to 4 working days for major urban centers (Karachi, Lahore, Faisalabad, Islamabad, Rawalpindi) and 3 to 6 working days for regional destinations across Pakistan.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-brand-ink uppercase mb-2">2. Free Shipping Threshold</h2>
        <p>
          We offer <strong>Free Nationwide Delivery</strong> on all orders where the subtotal after any applied promotional discounts reaches <strong>Rs. 2,000 or more</strong>. For orders below Rs. 2,000, a standardized flat shipping fee of <strong>Rs. 200</strong> applies across all provinces.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-brand-ink uppercase mb-2">3. Cash on Delivery (COD) Guidelines</h2>
        <p>
          Cash on Delivery is the sole payment method. Please have the exact change in whole Pakistani Rupees ready for the delivery rider. Riders are not authorized to hand over parcels prior to receiving full cash payment.
        </p>
      </section>
    </PolicyLayout>
  );
}
