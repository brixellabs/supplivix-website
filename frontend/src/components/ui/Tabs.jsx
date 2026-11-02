import React from 'react';

export default function Tabs({
  tabs = [],
  activeTab,
  onChange,
  className = '',
}) {
  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      className={`flex items-center gap-2 border-b border-surface-border overflow-x-auto no-scrollbar ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            id={`tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            onClick={() => onChange && onChange(tab.id)}
            className={`pb-3 px-3 border-b-2 font-semibold text-xs uppercase tracking-wider transition-colors duration-150 whitespace-nowrap cursor-pointer ${
              isActive
                ? 'border-brand-ink text-brand-ink'
                : 'border-transparent text-ink-muted hover:text-brand-ink'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isActive
                    ? 'bg-brand-ink text-white'
                    : 'bg-surface-subtle border border-surface-border text-ink-muted'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
