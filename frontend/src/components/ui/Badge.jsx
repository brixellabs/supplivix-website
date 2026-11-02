import React from 'react';

export default function Badge({ children, variant = 'default', size = 'sm', className = '' }) {
  const variantStyles = {
    default: 'bg-brand-ink text-white',
    sale: 'bg-status-sale text-white font-bold',
    success: 'bg-brand-green text-white',
    pill: 'bg-brand-lavender text-brand-purple font-semibold rounded-full px-3 py-1',
    category: 'bg-surface-accent text-brand-ink border border-surface-border',
  }[variant] || 'bg-brand-ink text-white';

  const sizeStyles = {
    xs: 'text-[10px] px-2 py-0.5 rounded-xs',
    sm: 'text-xs px-2.5 py-1 rounded-sm',
    md: 'text-sm px-3.5 py-1.5 rounded-md',
  }[size] || 'text-xs px-2.5 py-1 rounded-sm';

  return (
    <span className={`inline-flex items-center tracking-wide uppercase ${sizeStyles} ${variantStyles} ${className}`}>
      {children}
    </span>
  );
}
