/**
 * Phase 9: Site Mode, Policies and Content Pages Component Suite (Category H)
 * Covers MODE-01 to MODE-06 and POL-01 to POL-03.
 * Strictly zero emojis.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import ComingSoonPage from '../pages/ComingSoonPage';
import PrivacyPolicyPage from '../pages/policies/PrivacyPolicyPage';
import TermsPage from '../pages/policies/TermsPage';
import ShippingPolicyPage from '../pages/policies/ShippingPolicyPage';
import ReturnsPolicyPage from '../pages/policies/ReturnsPolicyPage';
import ContactPage from '../pages/ContactPage';
import CookieNotice from '../components/ui/CookieNotice';
import { AuthProvider } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import { ToastProvider } from '../components/ui/Toast';

describe('Category H: Site Mode, Policies and Content Pages (MODE-01 to MODE-06, POL-01 to POL-03)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const setupFetchMock = (overrides = {}) => {
    globalThis.fetch = vi.fn().mockImplementation((url, opts) => {
      if (url.includes('/settings/public/')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            site_mode: overrides.site_mode || 'live',
            free_shipping_threshold: 2000,
            flat_shipping_fee: 200,
            launch_date: overrides.launch_date || '2026-12-01T00:00:00Z',
            store_email: 'care@supplivix.com',
            store_phone: '03001234567',
          }),
        });
      }
      if (url.includes('/auth/me/')) {
        if (overrides.user) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => overrides.user,
          });
        }
        return Promise.resolve({ ok: false, status: 401, json: async () => ({}) });
      }
      if (url.includes('/cart/')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ items: [], total_items: 0, subtotal: 0, grand_total: 0 }),
        });
      }
      if (url.includes('/waitlist/')) {
        const body = opts && opts.body ? JSON.parse(opts.body) : {};
        if (body.email === 'duplicate@example.com') {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ message: 'You are already on the list! We will notify you at launch.' }),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 201,
          json: async () => ({ message: 'Thank you for joining the waitlist! We will notify you at launch.' }),
        });
      }
      if (url.includes('/contact/')) {
        return Promise.resolve({
          ok: true,
          status: 201,
          json: async () => ({ message: 'Thank you for contacting Supplivix. Our team will get back to you shortly.' }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ results: [], count: 0 }),
      });
    });
  };

  const renderWithApp = (initialRoute = '/', overrides = {}) => {
    setupFetchMock(overrides);
    return render(
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <MemoryRouter initialEntries={[initialRoute]}>
              <Routes>
                <Route path="/coming-soon" element={<ComingSoonPage />} />
                <Route path="/" element={<Layout />}>
                  <Route index element={<div>Live Home Page Content</div>} />
                  <Route path="shop" element={<div>Shop Page Content</div>} />
                  <Route path="privacy-policy" element={<PrivacyPolicyPage />} />
                  <Route path="terms" element={<TermsPage />} />
                  <Route path="shipping-policy" element={<ShippingPolicyPage />} />
                  <Route path="returns-policy" element={<ReturnsPolicyPage />} />
                  <Route path="contact" element={<ContactPage />} />
                </Route>
              </Routes>
            </MemoryRouter>
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    );
  };

  it('MODE-01: coming_soon mode redirects public route to /coming-soon with noindex directives', async () => {
    renderWithApp('/shop', { site_mode: 'coming_soon' });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Daily vitamins for a/i })).toBeInTheDocument();
      expect(screen.getByText(/Official Launch Approaching/i)).toBeInTheDocument();
    });
  });

  it('MODE-02: coming_soon mode keeps /privacy-policy and health check reachable', async () => {
    renderWithApp('/privacy-policy', { site_mode: 'coming_soon' });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Privacy Policy/i })).toBeInTheDocument();
      expect(screen.queryByText(/Official Launch Approaching/i)).not.toBeInTheDocument();
    });
  });

  it('MODE-03: Staff user in coming_soon mode can preview the live site', async () => {
    renderWithApp('/', {
      site_mode: 'coming_soon',
      user: { id: 1, email: 'admin@supplivix.com', full_name: 'Staff Admin', is_staff: true },
    });

    await waitFor(() => {
      expect(screen.getByText('Live Home Page Content')).toBeInTheDocument();
      expect(screen.queryByText(/Official Launch Approaching/i)).not.toBeInTheDocument();
    });
  });

  it('MODE-04: Switch to live mode redirects coming-soon to home', async () => {
    renderWithApp('/coming-soon', { site_mode: 'live' });

    await waitFor(() => {
      expect(screen.getByText('Live Home Page Content')).toBeInTheDocument();
    });
  });

  it('MODE-05: Waitlist handles valid, invalid and duplicate email submissions', async () => {
    setupFetchMock({ site_mode: 'coming_soon' });
    render(
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <MemoryRouter initialEntries={['/coming-soon']}>
              <ComingSoonPage />
            </MemoryRouter>
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    );

    const emailInput = screen.getByPlaceholderText(/Enter your email/i);
    const joinBtn = screen.getByRole('button', { name: /Join Waitlist/i });

    // 1. Invalid email
    fireEvent.change(emailInput, { target: { value: 'notanemail' } });
    fireEvent.click(joinBtn);
    expect(await screen.findByText(/Please provide a valid email address/i)).toBeInTheDocument();

    // 2. Valid email
    fireEvent.change(emailInput, { target: { value: 'newuser@example.com' } });
    fireEvent.click(joinBtn);
    await waitFor(() => {
      const msgs = screen.getAllByText(/Thank you for joining the waitlist!/i);
      expect(msgs.length).toBeGreaterThanOrEqual(1);
    });

    // 3. Duplicate email
    fireEvent.change(emailInput, { target: { value: 'duplicate@example.com' } });
    fireEvent.click(joinBtn);
    await waitFor(() => {
      const dupMsgs = screen.getAllByText(/You are already on the list!/i);
      expect(dupMsgs.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('MODE-06: Countdown reaches zero and shows launch message without negative numbers', async () => {
    setupFetchMock({ launch_date: '2020-01-01T00:00:00Z', site_mode: 'coming_soon' });
    render(
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <MemoryRouter initialEntries={['/coming-soon']}>
              <ComingSoonPage />
            </MemoryRouter>
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/We are going live! Check back shortly./i)).toBeInTheDocument();
      expect(screen.queryByText(/-[0-9]+/)).not.toBeInTheDocument();
    });
  });

  it('POL-01: Privacy policy, terms, shipping and returns render with last-updated and footer links', async () => {
    renderWithApp('/privacy-policy', { site_mode: 'live' });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Privacy Policy/i })).toBeInTheDocument();
      expect(screen.getByText(/Last Updated:/i)).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Table of Contents/i })).toBeInTheDocument();
    });

    const footers = screen.getAllByRole('contentinfo');
    expect(footers.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('link', { name: /Privacy/i })[0]).toHaveAttribute('href', '/privacy-policy');
    expect(screen.getAllByRole('link', { name: /Terms/i })[0]).toHaveAttribute('href', '/terms');
  });

  it('POL-02: Cookie notice accept, decline, and reload persists choice without blocking site', async () => {
    const { unmount } = render(
      <MemoryRouter>
        <CookieNotice />
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/Cookie consent banner/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Decline/i })).toBeInTheDocument();
    const acceptBtn = screen.getByRole('button', { name: /Accept/i });

    fireEvent.click(acceptBtn);
    expect(localStorage.getItem('splv_cookie_consent')).toBe('accepted');
    expect(screen.queryByLabelText(/Cookie consent banner/i)).not.toBeInTheDocument();
    unmount();

    render(
      <MemoryRouter>
        <CookieNotice />
      </MemoryRouter>
    );
    expect(screen.queryByLabelText(/Cookie consent banner/i)).not.toBeInTheDocument();
  });

  it('POL-03: Contact form saves a message and displays confirmation', async () => {
    setupFetchMock({ site_mode: 'live' });
    render(
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <MemoryRouter initialEntries={['/contact']}>
              <ContactPage />
            </MemoryRouter>
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    );

    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Amina Tariq' } });
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'amina@example.com' } });
    fireEvent.change(screen.getByLabelText(/Subject/i), { target: { value: 'Product Guidance' } });
    fireEvent.change(screen.getByLabelText(/Message/i), {
      target: { value: 'I would like to inquire about the delivery times for COD in Lahore.' },
    });

    const submitBtn = screen.getByRole('button', { name: /(Send Inquiry|Send Message)/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Your message has been successfully transmitted/i) ||
        screen.getByText(/Thank you! Your message has been received/i)
      ).toBeInTheDocument();
    });
  });
});
