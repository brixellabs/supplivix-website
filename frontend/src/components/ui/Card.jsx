import React from 'react';

export default function Card({ children, className = '', hover = true, ...props }) {
  return (
    <div
      className={`bg-surface-card border border-surface-border rounded-md shadow-card overflow-hidden transition-all duration-200 ${
        hover ? 'hover:shadow-hover hover:-translate-y-0.5' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
