import React from 'react';
import PolicyLayout from './PolicyLayout';

const SECTIONS = [
  { id: 'agreement-to-terms', title: '1. Agreement to Terms' },
  { id: 'cod-only', title: '2. Cash on Delivery (COD) Only' },
  { id: 'health-compliance', title: '3. Health and Supplement Compliance' },
  { id: 'order-acceptance', title: '4. Order Acceptance and Pricing' },
];

export default function TermsPage() {
  return (
    <PolicyLayout
      title="Terms and Conditions"
      canonical="/terms"
      lastUpdated="November 2, 2026"
      sections={SECTIONS}
    >
      <div className="bg-surface-subtle border border-surface-border rounded-lg p-6 sm:p-7 shadow-sm space-y-3">
        <section id="agreement-to-terms">
          <h2 className="text-base sm:text-lg font-bold text-brand-ink uppercase tracking-wide mb-2">
            1. Agreement to Terms
          </h2>
          <p className="leading-relaxed">
            By accessing, browsing, or placing an order on Supplivix, you agree to be bound by these Terms and Conditions and all applicable laws and regulations in Pakistan. Our catalog is dedicated to providing high-potency daily multivitamins and science-backed skincare products designed for everyday wellness.
          </p>
        </section>
      </div>

      <div className="bg-surface-subtle border border-surface-border rounded-lg p-6 sm:p-7 shadow-sm space-y-3">
        <section id="cod-only">
          <h2 className="text-base sm:text-lg font-bold text-brand-ink uppercase tracking-wide mb-2">
            2. Cash on Delivery (COD) Only
          </h2>
          <p className="leading-relaxed">
            Supplivix operates exclusively with Cash on Delivery (COD) as the primary payment method across Pakistan. When placing an order, you agree to pay the exact order total in Pakistani Rupees (PKR) in cash to the delivery rider upon physical package handoff.
          </p>
          <div className="bg-white border border-surface-border rounded-md p-3 text-xs text-ink-muted">
            <strong className="text-brand-ink">Delivery Notice:</strong> Courier riders are contracted for parcel handover and cash collection. They are not authorized to open parcels prior to receiving payment.
          </div>
        </section>
      </div>

      <div className="bg-surface-subtle border border-surface-border rounded-lg p-6 sm:p-7 shadow-sm space-y-3">
        <section id="health-compliance">
          <h2 className="text-base sm:text-lg font-bold text-brand-ink uppercase tracking-wide mb-2">
            3. Health and Supplement Compliance
          </h2>
          <div className="border-l-4 border-brand-green bg-green-50/50 p-3.5 rounded-r-md">
            <p className="font-semibold text-brand-ink text-xs sm:text-sm">
              These statements have not been evaluated by a regulator. This product is not intended to diagnose, treat, cure or prevent any disease.
            </p>
          </div>
          <p className="leading-relaxed mt-2">
            Supplements are formulated to support general health and wellness. They are not substitutes for balanced nutrition or professional medical treatment. Always consult a healthcare professional before beginning any new dietary regimen.
          </p>
        </section>
      </div>

      <div className="bg-surface-subtle border border-surface-border rounded-lg p-6 sm:p-7 shadow-sm space-y-3">
        <section id="order-acceptance">
          <h2 className="text-base sm:text-lg font-bold text-brand-ink uppercase tracking-wide mb-2">
            4. Order Acceptance and Pricing
          </h2>
          <p className="leading-relaxed">
            All prices are listed in whole Pakistani Rupees (Rs.). We reserve the right to cancel orders arising from erroneous inventory levels, suspected automated bots, or unverified contact numbers.
          </p>
        </section>
      </div>
    </PolicyLayout>
  );
}
