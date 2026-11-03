import React, { forwardRef } from 'react';

const Input = forwardRef(function Input(
  {
    label,
    id,
    name,
    type = 'text',
    error,
    helperText,
    required = false,
    className = '',
    containerClassName = '',
    ...props
  },
  ref
) {
  const inputId = id || name;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold uppercase tracking-wider text-brand-ink"
        >
          {label}
          {required && <span className="text-status-error ml-1" aria-hidden="true">*</span>}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        name={name}
        type={type}
        required={required}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={errorId}
        className={`w-full bg-white text-brand-ink text-sm px-3.5 py-2.5 rounded-sm border transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-brand-green disabled:bg-surface-accent disabled:cursor-not-allowed ${
          error ? 'border-status-error focus:ring-status-error' : 'border-surface-border'
        } ${className}`}
        {...props}
      />
      {error && (
        <p id={errorId} className="text-xs font-medium text-status-error" role="alert">
          {Array.isArray(error) ? error[0] : error}
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

export default Input;
