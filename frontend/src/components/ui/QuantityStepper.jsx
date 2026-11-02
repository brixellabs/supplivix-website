import React from 'react';
import Icon from './Icon';

export default function QuantityStepper({
  value = 1,
  onChange,
  min = 1,
  max = 10,
  disabled = false,
  className = '',
}) {
  const handleDecrement = () => {
    if (value > min) {
      onChange(value - 1);
    }
  };

  const handleIncrement = () => {
    if (value < max) {
      onChange(value + 1);
    }
  };

  return (
    <div
      className={`inline-flex items-center border border-surface-border rounded-full bg-white ${className}`}
      role="group"
      aria-label="Quantity selector"
    >
      <button
        type="button"
        onClick={handleDecrement}
        disabled={disabled || value <= min}
        aria-label="Decrease quantity"
        className="w-9 h-9 flex items-center justify-center text-brand-ink hover:text-brand-green disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green rounded-l-full"
      >
        <Icon name="minus" className="text-xs" />
      </button>

      <span
        className="min-w-[28px] text-center font-semibold text-sm text-brand-ink select-none"
        aria-live="polite"
      >
        {value}
      </span>

      <button
        type="button"
        onClick={handleIncrement}
        disabled={disabled || value >= max}
        aria-label="Increase quantity"
        className="w-9 h-9 flex items-center justify-center text-brand-ink hover:text-brand-green disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green rounded-r-full"
      >
        <Icon name="plus" className="text-xs" />
      </button>
    </div>
  );
}
