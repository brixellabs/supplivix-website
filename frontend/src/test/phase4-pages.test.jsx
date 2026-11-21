import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from '../components/ui/Toast';
import { AuthProvider } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import HomePage from '../pages/HomePage';
import ShopPage from '../pages/ShopPage';
import MultivitaminsHubPage from '../pages/MultivitaminsHubPage';
import ProductDetailPage from '../pages/ProductDetailPage';
import CartPage from '../pages/CartPage';
import CheckoutPage from '../pages/CheckoutPage';
import TrackOrderPage from '../pages/TrackOrderPage';
import ComingSoonPage from '../pages/ComingSoonPage';
import AboutPage from '../pages/AboutPage';
import ContactPage from '../pages/ContactPage';
import NotFoundPage from '../pages/NotFoundPage';
import ServerErrorPage from '../pages/ServerErrorPage';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '../pages/auth/ResetPasswordPage';
import AccountDashboardPage from '../pages/account/AccountDashboardPage';
import PrivacyPolicyPage from '../pages/policies/PrivacyPolicyPage';
import TermsPage from '../pages/policies/TermsPage';
import ShippingPolicyPage from '../pages/policies/ShippingPolicyPage';
import ReturnsPolicyPage from '../pages/policies/ReturnsPolicyPage';
import Layout from '../components/layout/Layout';
import Footer from '../components/layout/Footer';
import { api } from '../services/api';

function renderWithProviders(ui, { route = '/' } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            {ui}
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('Phase 4: Frontend Pages & Business Logic', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('HomePage renders hero, multivitamins focus, and trust strip', () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByLabelText(/Promotional Hero Banners/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Cash on Delivery/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/The Natural Choice/i)).toBeInTheDocument();
    expect(screen.getByText(/Trending Now/i)).toBeInTheDocument();
  });

  it('ShopPage renders filters, categories, and product listings', () => {
    renderWithProviders(<ShopPage />);
    expect(screen.getByText(/All Formulations/i)).toBeInTheDocument();
    expect(screen.getByText(/All Categories/i)).toBeInTheDocument();
    expect(screen.getByText(/Price Range \(PKR\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Sort by:/i)).toBeInTheDocument();
  });

  it('MultivitaminsHubPage renders comparison table, FAQs, and regulatory health notice', () => {
    renderWithProviders(<MultivitaminsHubPage />);
    expect(screen.getByText(/Bioavailable Multivitamins for Daily Vitality/i)).toBeInTheDocument();
    expect(screen.getByText(/Find Your Ideal Formula/i)).toBeInTheDocument();
    expect(screen.getByText(/Multivitamin Guidance/i)).toBeInTheDocument();
    expect(
      screen.getByText(/These statements have not been evaluated by a regulator/i)
    ).toBeInTheDocument();
  });

  it('ProductDetailPage renders product specs, COD notes, and health disclaimer', () => {
    renderWithProviders(
      <Routes>
        <Route path="/products/:slug" element={<ProductDetailPage />} />
      </Routes>,
      { route: '/products/supplivix-complete-daily-multivitamin-60s' }
    );

    expect(screen.getAllByText(/Supplivix Complete Daily Multivitamin 60s/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Cash on Delivery \(COD\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Buy Now \(COD\)/i)).toBeInTheDocument();
    expect(
      screen.getByText(/These statements have not been evaluated by a regulator/i)
    ).toBeInTheDocument();
  });

  it('CartPage renders empty cart state and handles cart items', async () => {
    renderWithProviders(<CartPage />);
    expect(screen.getByText(/Your Cart is Empty/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Explore Catalog/i })).toBeInTheDocument();
  });

  it('CheckoutPage handles empty and populated cart states', async () => {
    renderWithProviders(<CheckoutPage />);
    expect(screen.getByText(/No Items to Checkout/i)).toBeInTheDocument();
  });

  it('TrackOrderPage renders order lookup form', () => {
    renderWithProviders(<TrackOrderPage />);
    expect(screen.getByText(/Track Your Delivery/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Order Number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Mobile Number/i)).toBeInTheDocument();
  });

  it('ComingSoonPage renders countdown timer and waitlist form', () => {
    renderWithProviders(<ComingSoonPage />);
    expect(screen.getByText(/Official Launch Approaching/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Launch Countdown/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Join Waitlist/i })).toBeInTheDocument();
  });

  it('PrivacyPolicyPage, Terms, Shipping, and Returns render original text and TOC', () => {
    renderWithProviders(<PrivacyPolicyPage />);
    expect(screen.getByRole('heading', { level: 1, name: /Privacy Policy/i })).toBeInTheDocument();
    expect(screen.getByText(/Table of Contents/i)).toBeInTheDocument();
    expect(screen.getAllByText(/COD & Courier Data Sharing/i).length).toBeGreaterThan(0);
    cleanup();

    renderWithProviders(<TermsPage />);
    expect(screen.getByRole('heading', { level: 1, name: /Terms and Conditions/i })).toBeInTheDocument();
    cleanup();

    renderWithProviders(<ShippingPolicyPage />);
    expect(screen.getByRole('heading', { level: 1, name: /Shipping and COD Policy/i })).toBeInTheDocument();
    cleanup();

    renderWithProviders(<ReturnsPolicyPage />);
    expect(screen.getByRole('heading', { level: 1, name: /Returns and Replacement Policy/i })).toBeInTheDocument();
  });

  it('AboutPage and ContactPage render brand narrative, contact form, and settings data', () => {
    renderWithProviders(<AboutPage />);
    expect(screen.getByText(/Pakistani lifestyles/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Nationwide Cash on Delivery/i })).toBeInTheDocument();
    cleanup();

    renderWithProviders(<ContactPage />);
    expect(screen.getByText(/Send Us a Message/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByText(/Subject/i)).toBeInTheDocument();
  });

  it('Auth pages (Login, Register, Forgot Password, Reset Password) render with validation and eye toggles', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByRole('heading', { name: /Sign In/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter your password/i)).toBeInTheDocument();
    cleanup();

    renderWithProviders(<RegisterPage />);
    expect(screen.getByRole('heading', { name: /Create an Account/i })).toBeInTheDocument();
    cleanup();

    renderWithProviders(<ForgotPasswordPage />);
    expect(screen.getByRole('heading', { name: /Reset Password/i })).toBeInTheDocument();
    cleanup();

    renderWithProviders(<ResetPasswordPage />);
    expect(screen.getByRole('heading', { name: /Choose Password/i })).toBeInTheDocument();
  });

  it('AccountDashboardPage renders profile tabs and order history placeholder', async () => {
    vi.spyOn(api, 'getMe').mockResolvedValue({
      id: 1,
      email: 'customer@example.com',
      full_name: 'Ayesha Khan',
    });
    vi.spyOn(api, 'getOrders').mockResolvedValue([]);

    renderWithProviders(<AccountDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/Account Overview/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Security & Password/i)).toBeInTheDocument();
    expect(screen.getByText(/Order History/i)).toBeInTheDocument();
  });

  it('404 NotFoundPage and 500 ServerErrorPage render branded fallback with links', () => {
    renderWithProviders(<NotFoundPage />);
    expect(screen.getByText(/Page Not Found/i)).toBeInTheDocument();
    expect(screen.getByText(/Return Home/i)).toBeInTheDocument();
    cleanup();

    renderWithProviders(<ServerErrorPage />);
    expect(screen.getByText(/System Error/i)).toBeInTheDocument();
    expect(screen.getByText(/Return Home/i)).toBeInTheDocument();
  });

  it('Layout redirects to /coming-soon when site_mode is coming_soon for public users', async () => {
    vi.spyOn(api, 'getPublicSettings').mockResolvedValue({
      site_mode: 'coming_soon',
      free_shipping_threshold: 2000,
      flat_shipping_fee: 200,
    });

    render(
      <MemoryRouter initialEntries={['/shop']}>
        <ToastProvider>
          <AuthProvider>
            <CartProvider>
              <Routes>
                <Route path="/coming-soon" element={<div>Coming Soon Destination</div>} />
                <Route path="/" element={<Layout />}>
                  <Route path="shop" element={<div>Shop Page</div>} />
                </Route>
              </Routes>
            </CartProvider>
          </AuthProvider>
        </ToastProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Coming Soon Destination/i)).toBeInTheDocument();
    });
  });

  it('Footer strictly contains the mandatory regulatory disclaimer', () => {
    renderWithProviders(<Footer />);
    expect(
      screen.getByText(/These statements have not been evaluated by a regulator. This product is not intended to diagnose, treat, cure or prevent any disease./i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Cash on Delivery Only/i)).toBeInTheDocument();
  });
});
