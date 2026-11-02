import React from 'react';
import PolicyLayout from './PolicyLayout';

export default function ReturnsPolicyPage() {
  return (
    <PolicyLayout title="Returns and Replacement Policy" lastUpdated="November 2, 2026">
      <section>
        <h2 className="text-lg font-bold text-brand-ink uppercase mb-2">1. 7-Day Return Window</h2>
        <p>
          We offer a hassle-free 7-day return window starting from the date you receive your package. Because dietary supplements and skincare are consumable personal health items, products must be completely unopened with security seals fully intact.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-brand-ink uppercase mb-2">2. Damaged or Incorrect Shipments</h2>
        <p>
          In the rare event that an item arrives damaged, leaking, or differs from your order, notify our support team within 48 hours of delivery at <a href="mailto:support@supplivix.com" className="text-brand-green underline">support@supplivix.com</a> or WhatsApp at 0300-0000000. We will dispatch a complimentary replacement immediately with zero return shipping charges.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-brand-ink uppercase mb-2">3. Return Process</h2>
        <p>
          To initiate an eligible return, send your order number and package photos to our support team. Once verified, our logistics team will arrange parcel pickup or provide drop-off instructions at the nearest courier center.
        </p>
      </section>
    </PolicyLayout>
  );
}
