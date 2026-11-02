import React from 'react';

export default function Table({
  headers = [],
  children,
  className = '',
}) {
  return (
    <div className={`overflow-x-auto border border-surface-border rounded-md bg-white ${className}`}>
      <table className="w-full text-left text-sm text-brand-ink">
        {headers.length > 0 && (
          <thead className="bg-surface-subtle border-b border-surface-border text-xs uppercase font-bold text-ink-muted">
            <tr>
              {headers.map((h, i) => (
                <th key={i} scope="col" className="px-4 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody className="divide-y divide-surface-border">
          {children}
        </tbody>
      </table>
    </div>
  );
}
