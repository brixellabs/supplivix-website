import React from 'react';
import Icon from './Icon';

export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  className = '',
}) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav
      aria-label="Pagination Navigation"
      className={`flex items-center justify-center gap-1.5 py-4 ${className}`}
    >
      <button
        type="button"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label="Previous Page"
        className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-sm border border-surface-border bg-white text-brand-ink disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-subtle transition-colors flex items-center gap-1"
      >
        <Icon name="chevron-left" className="text-[10px]" />
        <span>Prev</span>
      </button>

      {pages.map((p) => {
        const isCurrent = p === currentPage;
        return (
          <button
            key={p}
            type="button"
            aria-current={isCurrent ? 'page' : undefined}
            onClick={() => onPageChange(p)}
            className={`min-w-[32px] h-8 text-xs font-bold rounded-sm border transition-colors flex items-center justify-center ${
              isCurrent
                ? 'bg-brand-ink text-white border-brand-ink'
                : 'bg-white text-brand-ink border-surface-border hover:bg-surface-subtle'
            }`}
          >
            {p}
          </button>
        );
      })}

      <button
        type="button"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label="Next Page"
        className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-sm border border-surface-border bg-white text-brand-ink disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-subtle transition-colors flex items-center gap-1"
      >
        <span>Next</span>
        <Icon name="chevron-right" className="text-[10px]" />
      </button>
    </nav>
  );
}

