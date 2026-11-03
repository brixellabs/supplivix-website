import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [honeypot, setHoneypot] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const errs = {};
    if (!formData.firstName.trim()) errs.firstName = 'First name is required.';
    if (!formData.lastName.trim()) errs.lastName = 'Last name is required.';
    if (!formData.email.trim() || !formData.email.includes('@')) {
      errs.email = 'Valid email address is required.';
    }
    const cleanPhone = formData.phone.replace(/[\s-]/g, '');
    const phoneRegex = /^(\+923\d{9}|03\d{9})$/;
    if (!cleanPhone || !phoneRegex.test(cleanPhone)) {
      errs.phone = 'Valid Pakistani mobile number required (03XXXXXXXXX).';
    }
    if (!formData.password || formData.password.length < 8) {
      errs.password = 'Password must be at least 8 characters.';
    }
    if (formData.password !== formData.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }
    setErrors(errs);
    const keys = Object.keys(errs);
    if (keys.length > 0) {
      const firstEl = document.querySelector(`[name="${keys[0]}"], #${keys[0]}`);
      if (firstEl && typeof firstEl.focus === 'function') {
        firstEl.focus();
      }
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await register({
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
        website: honeypot,
      });
      showToast('Registration complete! Welcome to Supplivix.');
      navigate('/account');
    } catch (err) {
      if (err.fields) {
        setErrors(err.fields);
        if (err.fields.turnstile_token || err.fields.non_field_errors || err.message) {
          setErrors({
            ...err.fields,
            general: err.fields.turnstile_token?.[0] || err.fields.non_field_errors?.[0] || err.message,
          });
        }
        const keys = Object.keys(err.fields);
        if (keys.length > 0) {
          const firstEl = document.querySelector(`[name="${keys[0]}"], #${keys[0]}`);
          if (firstEl && typeof firstEl.focus === 'function') {
            firstEl.focus();
          }
        }
      } else {
        setErrors({ general: err.message || 'Unable to register.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white min-h-[70vh] flex flex-col justify-center py-12">
      <div className="max-w-md mx-auto w-full px-4 sm:px-6">
        <div className="bg-surface-subtle border border-surface-border rounded-lg p-6 sm:p-8 shadow-card">
          <div className="text-center mb-6">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-green">
              New Customer
            </span>
            <h1 className="text-2xl font-bold uppercase tracking-tight text-brand-ink mt-1">
              Create an Account
            </h1>
            <p className="text-xs text-ink-muted mt-1">
              Join for faster COD checkouts and exclusive rewards
            </p>
          </div>

          {errors.general && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-xs text-red-700 rounded-sm font-medium">
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
            <input
              type="text"
              name="website"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              className="hidden"
              aria-hidden="true"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="First Name"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                error={errors.firstName}
                required
              />
              <Input
                label="Last Name"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                error={errors.lastName}
                required
              />
            </div>

            <Input
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              placeholder="name@example.com"
              required
            />

            <Input
              label="Mobile Number (Pakistan)"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              error={errors.phone}
              placeholder="03XXXXXXXXX"
              required
            />

            <div>
              <label htmlFor="register-password" className="block text-xs font-semibold text-brand-ink mb-1">
                Password (min 8 chars)
              </label>
              <div className="relative">
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full bg-white border ${
                    errors.password ? 'border-red-500' : 'border-surface-border'
                  } rounded-sm p-2 text-xs text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-green pr-9`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2.5 text-ink-muted hover:text-brand-ink"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Icon name={showPassword ? 'eye-slash' : 'eye'} className="text-xs" />
                </button>
              </div>
              {errors.password && <p className="text-[11px] text-red-600 mt-1">{errors.password}</p>}
            </div>

            <Input
              label="Confirm Password"
              name="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              className="w-full mt-2 h-[42px]"
            >
              Register Account
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-surface-border text-center text-xs text-ink-muted">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-brand-ink hover:text-brand-green underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
