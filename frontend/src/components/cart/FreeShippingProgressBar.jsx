import React from 'react';
import Icon from '../ui/Icon';

export default function FreeShippingProgressBar({
  threshold = 2000,
  subtotal = 0,
  amountNeeded: propAmountNeeded,
  className = '',
}) {
  const safeThreshold = Number(threshold) > 0 ? Number(threshold) : 2000;
  const safeSubtotal = Math.max(0, Number(subtotal) || 0);

  const amountNeeded = propAmountNeeded !== undefined
    ? Math.max(0, Number(propAmountNeeded))
    : Math.max(0, safeThreshold - safeSubtotal);

  let progress = 0;
  if (safeThreshold > 0) {
    if (safeSubtotal >= safeThreshold) {
      progress = 100;
    } else if (safeSubtotal <= 0) {
      progress = 0;
    } else {
      // If below threshold, cap between 1% and 99% so Rs. 1,999 never falsely shows 100%
      const raw = Math.floor((safeSubtotal / safeThreshold) * 100);
      progress = Math.min(99, Math.max(1, raw));
    }
  }

  const isUnlocked = safeSubtotal >= safeThreshold || amountNeeded === 0;

  return (
    <div className={`bg-surface-subtle border border-surface-border rounded-lg p-4 shadow-card ${className}`}>
      <div className="flex items-center justify-between text-xs font-semibold mb-2">
        <span className="flex items-center gap-1.5 text-brand-ink">
          <Icon name="truck" className="text-brand-green" />
          {isUnlocked ? (
            <strong className="text-brand-green">You have unlocked FREE delivery across Pakistan!</strong>
          ) : (
            <span>
              Add <strong className="text-brand-ink">Rs. {amountNeeded.toLocaleString()}</strong> more for <strong>free shipping</strong>
            </span>
          )}
        </span>
        <span className="text-ink-muted">{progress}%</span>
      </div>
      <div
        className="w-full bg-surface-border rounded-full h-2 overflow-hidden"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Free shipping progress"
      >
        <div
          className="bg-brand-green h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
