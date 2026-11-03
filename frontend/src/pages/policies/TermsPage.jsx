import React from 'react';
import PolicyLayout from './PolicyLayout';

export default function TermsPage() {
  return (
    <PolicyLayout
      title="Terms and Conditions"
      canonical="/terms"
      lastUpdated="November 2, 2026"
    >
      <section>
        <h2 className="text-lg font-bold text-brand-ink uppercase mb-2">1. Agreement to Terms</h2>
        <p>
          By accessing or placing an order on Supplivix, you agree to be bound by these Terms and Conditions. Our catalog focuses on daily multivitamins and skincare products for wellness in Pakistan.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-brand-ink uppercase mb-2">2. Cash on Delivery (COD) Only</h2>
        <p>
          Supplivix operates exclusively with Cash on Delivery (COD) as the payment method. When placing an order, you commit to paying the exact order total in Pakistani Rupees (PKR) in cash to the delivery rider upon physical package handoff.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-brand-ink uppercase mb-2">3. Health and Supplement Compliance</h2>
        <p className="border-l-2 border-brand-green pl-3 py-1 font-medium text-brand-ink">
          These statements have not been evaluated by a regulator. This product is not intended to diagnose, treat, cure or prevent any disease.
        </p>
        <p className="mt-2">
          Supplements are formulated to support general health and wellness. They are not substitutes for balanced nutrition or professional medical treatment. Always consult a healthcare professional before beginning any new dietary regimen.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-brand-ink uppercase mb-2">4. Order Acceptance and Pricing</h2>
        <p>
          All prices are listed in whole Pakistani Rupees (Rs.). We reserve the right to cancel orders arising from erroneous inventory levels, suspected automated bots, or unverified contact numbers.
        </p>
      </section>
    </PolicyLayout>
  );
}
