import React from 'react';
import Icon from './Icon';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  icon,
  iconPosition = 'left',
  type = 'button',
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-bold uppercase tracking-wider transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green disabled:opacity-50 disabled:cursor-not-allowed';

  const sizeStyles = {
    sm: 'text-xs px-3 py-2 rounded-sm gap-1.5',
    md: 'text-xs md:text-sm px-6 py-3 rounded-sm gap-2',
    lg: 'text-sm md:text-base px-8 py-3.5 rounded-sm gap-2.5',
    icon: 'p-2.5 rounded-sm',
  }[size] || 'text-sm px-6 py-3 rounded-sm gap-2';

  const variantStyles = {
    primary: 'bg-brand-ink text-white hover:bg-brand-green border border-transparent shadow-solid-sm',
    outline: 'bg-transparent text-brand-ink border-2 border-brand-ink hover:bg-brand-green hover:border-brand-green hover:text-white',
    secondary: 'bg-brand-lime text-brand-ink hover:bg-brand-purple hover:text-white border border-transparent',
    ghost: 'bg-transparent text-brand-ink hover:bg-surface-accent border border-transparent',
    danger: 'bg-status-error text-white hover:bg-red-700 border border-transparent',
  }[variant] || '';

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <Icon name="spinner" spin className="text-current" />
          <span>Processing...</span>
        </>
      ) : (
        <>
          {icon && iconPosition === 'left' && <Icon name={icon} />}
          {children}
          {icon && iconPosition === 'right' && <Icon name={icon} />}
        </>
      )}
    </button>
  );
}
