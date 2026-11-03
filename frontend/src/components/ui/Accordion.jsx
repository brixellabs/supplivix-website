import React from 'react';
import Icon from './Icon';

export default function Accordion({ items, title, children, defaultOpen = false, className = '' }) {
  if (items && Array.isArray(items)) {
    return (
      <div className={`space-y-3 ${className}`}>
        {items.map((item, idx) => (
          <details
            key={idx}
            open={defaultOpen && idx === 0}
            className="border border-surface-border rounded-lg bg-surface-card p-4 transition-all duration-150 group"
          >
            <summary className="flex items-center justify-between font-semibold text-brand-ink cursor-pointer list-none select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green rounded-sm">
              <span>{item.title || item.question || item.q}</span>
              <Icon
                name="chevron-down"
                className="text-xs text-ink-muted transition-transform duration-200 group-open:rotate-180"
              />
            </summary>
            <div className="mt-3 pt-3 border-t border-surface-border text-sm text-ink-muted leading-relaxed">
              {item.content || item.answer || item.a}
            </div>
          </details>
        ))}
      </div>
    );
  }

  return (
    <details
      open={defaultOpen}
      className={`border border-surface-border rounded-lg bg-surface-card p-4 transition-all duration-150 group ${className}`}
    >
      <summary className="flex items-center justify-between font-semibold text-brand-ink cursor-pointer list-none select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green rounded-sm">
        <span>{title}</span>
        <Icon
          name="chevron-down"
          className="text-xs text-ink-muted transition-transform duration-200 group-open:rotate-180"
        />
      </summary>
      <div className="mt-3 pt-3 border-t border-surface-border text-sm text-ink-muted leading-relaxed">
        {children}
      </div>
    </details>
  );
}
