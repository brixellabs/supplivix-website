import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { api } from '../../services/api';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const uid = searchParams.get('uid') || '';
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!password || password.length < 8) {
      errs.password = 'Password must be at least 8 characters long.';
    }
    if (!confirmPassword) {
      errs.confirmPassword = 'Please confirm your new password.';
    } else if (password !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }
    setErrors(errs);
    const keys = Object.keys(errs);
    if (keys.length > 0) {
      const el = document.querySelector(`[name="${keys[0]}"], #${keys[0]}`);
      if (el && typeof el.focus === 'function') el.focus();
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;

    setLoading(true);
    try {
      await api.confirmPasswordReset({
        uid,
        token,
        new_password: password,
      });
      showToast('Password updated successfully! Please sign in with your new password.');
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Invalid or expired password reset link.');
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
              Set New Password
            </span>
            <h1 className="text-2xl font-bold uppercase tracking-tight text-brand-ink mt-1">
              Choose Password
            </h1>
            <p className="text-xs text-ink-muted mt-1">
              Ensure your new password contains at least 8 characters
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-xs text-red-700 rounded-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              label="New Password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
              }}
              placeholder="Minimum 8 characters"
              required
              error={errors.password}
            />

            <Input
              label="Confirm New Password"
              name="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: '' }));
              }}
              placeholder="Re-enter password"
              required
              error={errors.confirmPassword}
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              className="w-full h-[42px]"
            >
              Update Password
            </Button>
          </form>

          <div className="text-center pt-4">
            <Link to="/login" className="text-xs text-ink-muted hover:text-brand-green underline">
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
