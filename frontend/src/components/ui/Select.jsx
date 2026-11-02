import React, { forwardRef } from 'react';

const Select = forwardRef(function Select(
  {
    label,
    id,
    name,
    options = [],
    error,
    helperText,
    required = false,
    className = '',
    containerClassName = '',
    children,
    ...props
  },
  ref
) {
  const selectId = id || name;
  const errorId = error ? `${selectId}-error` : undefined;

  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-semibold uppercase tracking-wider text-brand-ink"
        >
          {label}
          {required && <span className="text-status-error ml-1" aria-hidden="true">*</span>}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        name={name}
        required={required}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={errorId}
        className={`w-full bg-white text-brand-ink text-sm px-3.5 py-2.5 rounded-sm border transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-brand-green disabled:bg-surface-accent disabled:cursor-not-allowed ${
          error ? 'border-status-error focus:ring-status-error' : 'border-surface-border'
        } ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
        {children}
      </select>
      {error && (
        <p id={errorId} className="text-xs font-medium text-status-error" role="alert">
          {error}
        </p>
      )}
      {!error && helperText && (
        <p className="text-xs text-ink-muted">
          {helperText}
        </p>
      )}
    </div>
  );
});

export default Select;
