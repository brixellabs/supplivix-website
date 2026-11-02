import React, { forwardRef } from 'react';

const Checkbox = forwardRef(function Checkbox(
  {
    label,
    id,
    name,
    checked,
    onChange,
    error,
    helperText,
    disabled = false,
    className = '',
    containerClassName = '',
    ...props
  },
  ref
) {
  const checkboxId = id || name;
  const errorId = error ? `${checkboxId}-error` : undefined;

  return (
    <div className={`flex flex-col gap-1 ${containerClassName}`}>
      <label
        htmlFor={checkboxId}
        className={`inline-flex items-start gap-2.5 cursor-pointer text-sm text-brand-ink select-none ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <input
          ref={ref}
          type="checkbox"
          id={checkboxId}
          name={name}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={errorId}
          className={`mt-0.5 h-4 w-4 rounded-xs border border-surface-border text-brand-green focus:ring-2 focus:ring-brand-green focus:ring-offset-1 focus:outline-none transition-colors ${className}`}
          {...props}
        />
        <span>{label}</span>
      </label>
      {error && (
        <p id={errorId} className="text-xs font-medium text-status-error ml-6.5" role="alert">
          {error}
        </p>
      )}
      {!error && helperText && (
        <p className="text-xs text-ink-muted ml-6.5">
          {helperText}
        </p>
      )}
    </div>
  );
});

export default Checkbox;

