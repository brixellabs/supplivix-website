import React from 'react';

export default function Skeleton({
  variant = 'rect',
  width = '100%',
  height = '20px',
  className = '',
}) {
  const variantStyles = {
    rect: 'rounded-sm',
    circle: 'rounded-full',
    card: 'rounded-md',
  }[variant] || 'rounded-sm';

  return (
    <div
      style={{ width, height }}
      className={`bg-surface-accent border border-surface-border animate-pulse ${variantStyles} ${className}`}
      aria-hidden="true"
    />
  );
}
