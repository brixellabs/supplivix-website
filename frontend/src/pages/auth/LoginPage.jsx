import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [honeypot, setHoneypot] = useState('');

  const redirectPath = location.state?.from?.pathname || '/account';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password, { website: honeypot });
      showToast('Welcome back to Supplivix!');
      navigate(redirectPath, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
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
              Customer Account
            </span>
            <h1 className="text-2xl font-bold uppercase tracking-tight text-brand-ink mt-1">
              Sign In
            </h1>
            <p className="text-xs text-ink-muted mt-1">
              Access your order history and saved delivery addresses
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-xs text-red-700 rounded-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
            <Input
              label="Email Address"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
            />

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-brand-ink">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[11px] text-brand-green hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border border-surface-border rounded-sm p-2 text-xs text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-green pr-9"
                  placeholder="Enter your password"
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
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              className="w-full mt-2 h-[42px]"
            >
              Sign In
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-surface-border text-center text-xs text-ink-muted">
            Don't have an account yet?{' '}
            <Link to="/register" className="font-bold text-brand-ink hover:text-brand-green underline">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
