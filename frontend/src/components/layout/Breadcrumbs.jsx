import React from 'react';
import { Link } from 'react-router-dom';
import Icon from '../ui/Icon';

export default function Breadcrumbs({ items = [] }) {
  if (!items || items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="bg-surface-subtle border-b border-surface-border py-2.5 px-4 sm:px-6">
      <div className="max-w-site mx-auto">
        <ol className="flex items-center space-x-2 text-xs text-ink-muted flex-wrap">
          <li>
            <Link to="/" className="hover:text-brand-green flex items-center gap-1">
              <span>Home</span>
            </Link>
          </li>
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            return (
              <li key={index} className="flex items-center space-x-2">
                <Icon name="chevron-right" className="text-[9px] text-gray-400" />
                {isLast || !item.href ? (
                  <span className="font-semibold text-brand-ink truncate max-w-[200px] sm:max-w-none" aria-current="page">
                    {item.label}
                  </span>
                ) : (
                  <Link to={item.href} className="hover:text-brand-green">
                    {item.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
