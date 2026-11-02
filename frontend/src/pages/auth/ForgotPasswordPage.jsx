import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { api } from '../../services/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) return;

    setLoading(true);
    try {
      await api.requestPasswordReset(email.trim());
    } catch {
      // Non-enumerating: always show success message
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  };

  return (
    <div className="bg-white min-h-[70vh] flex flex-col justify-center py-12">
      <div className="max-w-md mx-auto w-full px-4 sm:px-6">
        <div className="bg-surface-subtle border border-surface-border rounded-lg p-6 sm:p-8 shadow-card">
          <div className="text-center mb-6">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-green">
              Account Recovery
            </span>
            <h1 className="text-2xl font-bold uppercase tracking-tight text-brand-ink mt-1">
              Reset Password
            </h1>
            <p className="text-xs text-ink-muted mt-1">
              Enter your email to receive recovery instructions
            </p>
          </div>

          {submitted ? (
            <div className="space-y-4 text-center">
              <div className="p-4 bg-green-50 border border-brand-green rounded-md text-xs text-brand-green font-medium leading-relaxed">
                If an account exists with <strong>{email}</strong>, a password reset link has been dispatched to your inbox.
              </div>
              <p className="text-xs text-ink-muted">
                Please check your spam or promotions folder if you don't see it within a few minutes.
              </p>
              <Link to="/login">
                <Button variant="outline" size="sm" className="mt-2">
                  Return to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <Input
                label="Registered Email Address"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
              />

              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={loading}
                className="w-full h-[42px]"
              >
                Send Reset Link
              </Button>

              <div className="text-center pt-2">
                <Link to="/login" className="text-xs text-ink-muted hover:text-brand-green underline">
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
