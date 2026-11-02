import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
import Footer from '../components/layout/Footer';

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
    expect(screen.getByText(/Daily vitamins for a/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Cash on Delivery/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Shop Multivitamins/i)).toBeInTheDocument();
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
    // Rule 5: Regulatory Health Disclaimer
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
    // 1. Empty state
    renderWithProviders(<CartPage />);
    expect(screen.getByText(/Your Cart is Empty/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Explore Catalog/i })).toBeInTheDocument();
  });

  it('CheckoutPage handles empty and populated cart states', async () => {
    // When empty
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

  it('Footer strictly contains the mandatory regulatory disclaimer', () => {
    renderWithProviders(<Footer />);
    expect(
      screen.getByText(/These statements have not been evaluated by a regulator. This product is not intended to diagnose, treat, cure or prevent any disease./i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Cash on Delivery Only/i)).toBeInTheDocument();
  });
});
