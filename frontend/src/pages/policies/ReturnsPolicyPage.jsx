import React, { useState, useEffect } from 'react';
import PolicyLayout from './PolicyLayout';
import { api } from '../../services/api';

const SECTIONS = [
  { id: 'return-window', title: '1. 7-Day Return Window' },
  { id: 'damaged-shipments', title: '2. Damaged or Incorrect Shipments' },
  { id: 'return-process', title: '3. Return Process' },
];

const DEFAULT_POLICY = {
  window: 'We offer a hassle-free 7-day return window starting from the date you receive your package. Because dietary supplements and skincare are consumable personal health items, products must be completely unopened with security seals fully intact.',
  damaged: 'In the rare event that an item arrives damaged, leaking, or differs from your order, notify our support team within 48 hours of delivery at supplivix@gmail.com or WhatsApp at 0302-5222405. We will dispatch a complimentary replacement immediately with zero return shipping charges.',
  process: 'To initiate an eligible return, send your order number and package photos to our support team. Once verified, our logistics team will arrange parcel pickup or provide drop-off instructions at the nearest courier center.',
  lastUpdated: 'November 2, 2026',
};

export default function ReturnsPolicyPage() {
  const [policyData, setPolicyData] = useState(DEFAULT_POLICY);

  useEffect(() => {
    let isMounted = true;
    api.getPublicSettings()
      .then((data) => {
        if (!isMounted || !data) return;
        setPolicyData({
          window: data.returns_policy_window || DEFAULT_POLICY.window,
          damaged: data.returns_policy_damaged || DEFAULT_POLICY.damaged,
          process: data.returns_policy_process || DEFAULT_POLICY.process,
          lastUpdated: data.returns_policy_last_updated || DEFAULT_POLICY.lastUpdated,
        });
      })
      .catch(() => {
        // Fallback to default policy terms gracefully
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <PolicyLayout
      title="Returns and Replacement Policy"
      canonical="/returns-policy"
      lastUpdated={policyData.lastUpdated}
      sections={SECTIONS}
    >
      <div className="bg-surface-subtle border border-surface-border rounded-lg p-6 sm:p-7 shadow-sm space-y-3">
        <section id="return-window">
          <h2 className="text-base sm:text-lg font-bold text-brand-ink uppercase tracking-wide mb-2">
            1. 7-Day Return Window
          </h2>
          <p className="leading-relaxed whitespace-pre-line text-sm text-brand-body">
            {policyData.window}
          </p>
        </section>
      </div>

      <div className="bg-surface-subtle border border-surface-border rounded-lg p-6 sm:p-7 shadow-sm space-y-3">
        <section id="damaged-shipments">
          <h2 className="text-base sm:text-lg font-bold text-brand-ink uppercase tracking-wide mb-2">
            2. Damaged or Incorrect Shipments
          </h2>
          <p className="leading-relaxed whitespace-pre-line text-sm text-brand-body">
            {policyData.damaged}
          </p>
        </section>
      </div>

      <div className="bg-surface-subtle border border-surface-border rounded-lg p-6 sm:p-7 shadow-sm space-y-3">
        <section id="return-process">
          <h2 className="text-base sm:text-lg font-bold text-brand-ink uppercase tracking-wide mb-2">
            3. Return Process
          </h2>
          <p className="leading-relaxed whitespace-pre-line text-sm text-brand-body">
            {policyData.process}
          </p>
        </section>
      </div>
    </PolicyLayout>
  );
}
