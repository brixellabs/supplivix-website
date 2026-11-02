import React, { forwardRef } from 'react';

const Radio = forwardRef(function Radio(
  {
    label,
    id,
    name,
    value,
    checked,
    onChange,
    disabled = false,
    className = '',
    containerClassName = '',
    ...props
  },
  ref
) {
  const radioId = id || `${name}-${value}`;

  return (
    <div className={`inline-flex items-center ${containerClassName}`}>
      <label
        htmlFor={radioId}
        className={`inline-flex items-center gap-2.5 cursor-pointer text-sm text-brand-ink select-none ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <input
          ref={ref}
          type="radio"
          id={radioId}
          name={name}
          value={value}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className={`h-4 w-4 border border-surface-border text-brand-green focus:ring-2 focus:ring-brand-green focus:ring-offset-1 focus:outline-none transition-colors ${className}`}
          {...props}
        />
        <span>{label}</span>
      </label>
    </div>
  );
});

export default Radio;

