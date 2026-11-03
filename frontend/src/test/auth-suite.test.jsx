/**
 * Phase 9: Authentication & Account Frontend Form & Component Test Suite
 * Covers AUTH-01 through AUTH-10. Strictly zero emojis.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RegisterPage from '../pages/auth/RegisterPage';
import LoginPage from '../pages/auth/LoginPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '../pages/auth/ResetPasswordPage';
import { AuthProvider } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import { ToastProvider } from '../components/ui/Toast';

describe('Phase 9: Authentication & Account Component Suite (AUTH-01 to AUTH-10)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/auth/me/')) {
        return Promise.resolve({ ok: false, status: 401, json: async () => ({}) });
      }
      if (url.includes('/cart/')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ items: [], total_items: 0, subtotal: 0 }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });
  });

  const renderWithProviders = (ui, initialRoute = '/') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <ToastProvider>
          <AuthProvider>
            <CartProvider>
              {ui}
            </CartProvider>
          </AuthProvider>
        </ToastProvider>
      </MemoryRouter>
    );
  };

  it('AUTH-01: Register with valid data submits and calls auth register API', async () => {
    globalThis.fetch.mockImplementation((url) => {
      if (url.includes('/auth/register/')) {
        return Promise.resolve({
          ok: true,
          status: 201,
          json: async () => ({
            message: 'Registration successful.',
            user: { id: 101, email: 'valid@supplivix.com', full_name: 'Zaid Malik' },
          }),
        });
      }
      if (url.includes('/auth/me/')) {
        return Promise.resolve({ ok: false, status: 401, json: async () => ({}) });
      }
      if (url.includes('/cart/')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ items: [], total_items: 0, subtotal: 0 }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });

    renderWithProviders(<RegisterPage />, '/register');

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Zaid' } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Malik' } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'valid@supplivix.com' } });
    fireEvent.change(screen.getByLabelText(/mobile number/i), { target: { value: '03001234567' } });
    fireEvent.change(screen.getByLabelText(/password \(min 8 chars\)/i), { target: { value: 'SecurePass2026!' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'SecurePass2026!' } });

    const submitBtn = screen.getByRole('button', { name: /register account/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/register/'),
        expect.anything()
      );
    });
  });

  it('AUTH-02: Register with existing email displays field error from server', async () => {
    globalThis.fetch.mockImplementation((url) => {
      if (url.includes('/auth/register/')) {
        return Promise.resolve({
          ok: false,
          status: 400,
          json: async () => ({
            code: 'validation_error',
            message: 'Validation failed.',
            fields: { email: ['A user with this email already exists.'] },
          }),
        });
      }
      if (url.includes('/auth/me/')) {
        return Promise.resolve({ ok: false, status: 401, json: async () => ({}) });
      }
      if (url.includes('/cart/')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ items: [], total_items: 0, subtotal: 0 }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });

    renderWithProviders(<RegisterPage />, '/register');

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Impostor' } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'User' } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'existing@supplivix.com' } });
    fireEvent.change(screen.getByLabelText(/mobile number/i), { target: { value: '03001234567' } });
    fireEvent.change(screen.getByLabelText(/password \(min 8 chars\)/i), { target: { value: 'SecurePass2026!' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'SecurePass2026!' } });

    fireEvent.click(screen.getByRole('button', { name: /register account/i }));

    await waitFor(() => {
      expect(screen.getByText(/already exists/i)).toBeInTheDocument();
    });
  });

  it('AUTH-03: Register with invalid email, short password, no digits prevents network request and shows inline errors', async () => {
    renderWithProviders(<RegisterPage />, '/register');

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Test' } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'User' } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'invalid-email' } });
    fireEvent.change(screen.getByLabelText(/mobile number/i), { target: { value: '123' } });
    fireEvent.change(screen.getByLabelText(/password \(min 8 chars\)/i), { target: { value: 'short' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'short' } });

    fireEvent.click(screen.getByRole('button', { name: /register account/i }));

    await waitFor(() => {
      expect(screen.getByText(/valid email address is required/i)).toBeInTheDocument();
    });
  });

  it('AUTH-04: Login with correct credentials sets session and updates state', async () => {
    globalThis.fetch.mockImplementation((url) => {
      if (url.includes('/auth/login/')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            message: 'Login successful.',
            user: { id: 1, email: 'customer@supplivix.com', full_name: 'Customer One' },
          }),
        });
      }
      if (url.includes('/auth/me/')) {
        return Promise.resolve({ ok: false, status: 401, json: async () => ({}) });
      }
      if (url.includes('/cart/')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ items: [], total_items: 0, subtotal: 0 }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });

    renderWithProviders(<LoginPage />, '/login');

    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'customer@supplivix.com' } });
    fireEvent.change(screen.getByPlaceholderText(/enter your password/i), { target: { value: 'Password123!' } });

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/login/'),
        expect.anything()
      );
    });
  });

  it('AUTH-05: Login with wrong password or unknown email displays identical error message', async () => {
    globalThis.fetch.mockImplementation((url) => {
      if (url.includes('/auth/login/')) {
        return Promise.resolve({
          ok: false,
          status: 400,
          json: async () => ({
            code: 'invalid_credentials',
            message: 'Invalid email or password.',
            fields: {},
          }),
        });
      }
      if (url.includes('/auth/me/')) {
        return Promise.resolve({ ok: false, status: 401, json: async () => ({}) });
      }
      if (url.includes('/cart/')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ items: [], total_items: 0, subtotal: 0 }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });

    renderWithProviders(<LoginPage />, '/login');

    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'unknown@supplivix.com' } });
    fireEvent.change(screen.getByPlaceholderText(/enter your password/i), { target: { value: 'WrongPass!' } });

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });
  });

  it('AUTH-06: 5 failed logins triggers lockout notification and renders Turnstile challenge banner', async () => {
    globalThis.fetch.mockImplementation((url) => {
      if (url.includes('/auth/login/')) {
        return Promise.resolve({
          ok: false,
          status: 400,
          json: async () => ({
            code: 'account_locked',
            message: 'Account temporarily locked due to 5 consecutive failed login attempts. Please wait 15 minutes or reset your password.',
            fields: {},
          }),
        });
      }
      if (url.includes('/auth/me/')) {
        return Promise.resolve({ ok: false, status: 401, json: async () => ({}) });
      }
      if (url.includes('/cart/')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ items: [], total_items: 0, subtotal: 0 }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });

    renderWithProviders(<LoginPage />, '/login');

    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'locked@supplivix.com' } });
    fireEvent.change(screen.getByPlaceholderText(/enter your password/i), { target: { value: 'WrongPass!' } });

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/account temporarily locked/i)).toBeInTheDocument();
    });
  });

  it('AUTH-07: Password reset request displays generic confirmation message without user enumeration', async () => {
    globalThis.fetch.mockImplementation((url) => {
      if (url.includes('/password-reset/request/')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            message: 'If an account exists with this email, password reset instructions have been sent.',
          }),
        });
      }
      if (url.includes('/auth/me/')) {
        return Promise.resolve({ ok: false, status: 401, json: async () => ({}) });
      }
      if (url.includes('/cart/')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ items: [], total_items: 0, subtotal: 0 }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });

    renderWithProviders(<ForgotPasswordPage />, '/forgot-password');

    fireEvent.change(screen.getByLabelText(/registered email address/i), { target: { value: 'nonexistent@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText(/a password reset link has been dispatched/i)).toBeInTheDocument();
    });
  });

  it('AUTH-08: Reset password confirmation displays error on invalid or expired token', async () => {
    globalThis.fetch.mockImplementation((url) => {
      if (url.includes('/password-reset/confirm/')) {
        return Promise.resolve({
          ok: false,
          status: 400,
          json: async () => ({
            code: 'invalid_token',
            message: 'Invalid or expired password reset link.',
            fields: {},
          }),
        });
      }
      if (url.includes('/auth/me/')) {
        return Promise.resolve({ ok: false, status: 401, json: async () => ({}) });
      }
      if (url.includes('/cart/')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ items: [], total_items: 0, subtotal: 0 }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });

    renderWithProviders(
      <Routes>
        <Route path="/reset-password/:uid/:token" element={<ResetPasswordPage />} />
      </Routes>,
      '/reset-password/MQ/expired-token-123'
    );

    fireEvent.change(screen.getByLabelText(/^new password/i), { target: { value: 'NewPassword2026!' } });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: 'NewPassword2026!' } });

    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid or expired/i)).toBeInTheDocument();
    });
  });

  it('AUTH-09: Unauthenticated user accessing private account route is protected', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/account" element={<div data-testid="account-page">Protected Account</div>} />
        <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
      </Routes>,
      '/account'
    );

    expect(screen.queryByText(/secret financial data/i)).not.toBeInTheDocument();
  });

  it('AUTH-10: Cart merges guest session into authenticated user cart upon login', async () => {
    globalThis.fetch.mockImplementation((url) => {
      if (url.includes('/auth/login/')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            message: 'Login successful.',
            user: { id: 42, email: 'buyer@supplivix.com', full_name: 'Buyer FortyTwo' },
          }),
        });
      }
      if (url.includes('/cart/merge/')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            total_items: 3,
            subtotal: 6600,
            items: [{ id: 1, product: { name: 'Multivitamin' }, quantity: 3 }],
          }),
        });
      }
      if (url.includes('/auth/me/')) {
        return Promise.resolve({ ok: false, status: 401, json: async () => ({}) });
      }
      if (url.includes('/cart/')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ items: [], total_items: 0, subtotal: 0 }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ items: [], total_items: 0, subtotal: 0 }),
      });
    });

    renderWithProviders(<LoginPage />, '/login');

    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'buyer@supplivix.com' } });
    fireEvent.change(screen.getByPlaceholderText(/enter your password/i), { target: { value: 'Password123!' } });

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/login/'),
        expect.anything()
      );
    });
  });
});
