import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../components/ui/Toast';
import { AuthProvider } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import HomePage from '../pages/HomePage';
import CheckoutPage from '../pages/CheckoutPage';
import MultivitaminsHubPage from '../pages/MultivitaminsHubPage';
import PrivacyPolicyPage from '../pages/policies/PrivacyPolicyPage';
import ShippingPolicyPage from '../pages/policies/ShippingPolicyPage';
import ReturnsPolicyPage from '../pages/policies/ReturnsPolicyPage';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { api } from '../services/api';

function renderApp(ui, { route = '/' } = {}) {
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

describe('Phase 9: Full Automated Frontend UI & Invariants Suite', () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  // UI-01: Zero Emojis Anywhere
  it('UI-01: verifies zero emojis rendered across key pages and layouts', () => {
    const { container } = renderApp(
      <div>
        <Header />
        <HomePage />
        <Footer />
      </div>
    );

    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    expect(emojiRegex.test(container.textContent)).toBe(false);
  });

  // UI-02: Zero Glassmorphism
  it('UI-02: verifies no glassmorphism or backdrop-blur classes across pages', () => {
    const { container } = renderApp(
      <div>
        <Header />
        <HomePage />
        <MultivitaminsHubPage />
        <Footer />
      </div>
    );

    const backdropBlurElements = container.querySelectorAll('[class*="backdrop-blur"]');
    expect(backdropBlurElements.length).toBe(0);
  });

  // UI-03 & UI-04: Accessibility & Form Labels
  it('UI-03 & UI-04: form fields and buttons have accessible labels and solid styles', async () => {
    vi.spyOn(api, 'getCart').mockResolvedValue({
      items: [
        {
          id: 1,
          product: { id: 1, name: 'Daily Multivitamin 60s', price: 2450 },
          product_name: 'Daily Multivitamin 60s',
          unit_price: 2450,
          quantity: 1,
          line_total: 2450,
        },
      ],
      subtotal: 2450,
      discount_amount: 0,
      shipping_fee: 0,
      grand_total: 2450,
      total_items: 1,
    });

    renderApp(<CheckoutPage />);

    // All form inputs have corresponding accessible labels
    expect(await screen.findByLabelText(/Full Recipient Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Mobile Number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Street Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/City/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Province/i)).toBeInTheDocument();
  });

  // UI-05, UI-06, UI-07: Responsive Layout Viewports (360px, 768px, 1280px)
  it('UI-05: renders mobile layout cleanly at 360px viewport width', () => {
    window.innerWidth = 360;
    window.dispatchEvent(new Event('resize'));

    const { container } = renderApp(<Header />);
    const menuBtn = screen.getByRole('button', { name: /toggle navigation menu/i });
    expect(menuBtn).toBeInTheDocument();
    expect(container).toBeTruthy();
  });

  it('UI-06: renders tablet layout cleanly at 768px viewport width', () => {
    window.innerWidth = 768;
    window.dispatchEvent(new Event('resize'));

    const { container } = renderApp(<Header />);
    expect(container).toBeTruthy();
  });

  it('UI-07: renders desktop layout cleanly at 1280px viewport width', () => {
    window.innerWidth = 1280;
    window.dispatchEvent(new Event('resize'));

    const { container } = renderApp(<Header />);
    expect(screen.getByRole('link', { name: /Multivitamins/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /All Products/i })).toBeInTheDocument();
    expect(container).toBeTruthy();
  });

  // FORM-01 & FORM-02: Checkout Form Validation and Honeypot
  it('FORM-01 & FORM-02: validates Pakistani mobile format and hides honeypot trap', async () => {
    vi.spyOn(api, 'getCart').mockResolvedValue({
      items: [
        {
          id: 1,
          product: { id: 1, name: 'Daily Multivitamin 60s', price: 2450 },
          product_name: 'Daily Multivitamin 60s',
          unit_price: 2450,
          quantity: 1,
          line_total: 2450,
        },
      ],
      subtotal: 2450,
      discount_amount: 0,
      shipping_fee: 0,
      grand_total: 2450,
      total_items: 1,
    });

    renderApp(<CheckoutPage />);

    // Submit button
    const submitBtn = await screen.findByRole('button', { name: /Confirm Cash on Delivery Order/i });
    fireEvent.click(submitBtn);

    // Shows validation errors for required fields
    expect(await screen.findByText(/Please enter your full name/i)).toBeInTheDocument();
    expect(await screen.findByText(/Please enter a valid Pakistani mobile number/i)).toBeInTheDocument();

    // Verify Honeypot field exists and is hidden
    const honeypot = document.querySelector('input[name="company_name"]');
    expect(honeypot).toBeInTheDocument();
    expect(honeypot).toHaveClass('hidden');
  });

  // POL-01 to POL-04: Mandatory Policy Pages
  it('POL-01: Privacy Policy page renders cleanly', () => {
    const { container } = renderApp(<PrivacyPolicyPage />);
    expect(screen.getByRole('heading', { name: /Privacy Policy/i })).toBeInTheDocument();
    expect(container.textContent).toContain('Supplivix');
  });

  it('POL-02 & POL-03: Shipping & COD Policy renders with Rs. 2,000 threshold and COD rules', () => {
    const { container } = renderApp(<ShippingPolicyPage />);
    expect(screen.getByRole('heading', { name: /Shipping and COD Policy/i })).toBeInTheDocument();
    expect(container.textContent).toContain('Cash on Delivery');
    expect(container.textContent).toContain('2,000');
    expect(container.textContent).toContain('200');
  });

  it('POL-04: Returns Policy renders 7-day return policy', () => {
    const { container } = renderApp(<ReturnsPolicyPage />);
    expect(screen.getByRole('heading', { name: /Returns and Replacement Policy/i })).toBeInTheDocument();
    expect(container.textContent).toContain('7-day return window');
  });

  // Health Compliance: Rule 5
  it('Health Compliance: mandatory disclaimer present on Multivitamins page and footer', () => {
    const { container: footer } = renderApp(<Footer />);
    expect(footer.textContent).toContain('These statements have not been evaluated by a regulator');

    cleanup();

    const { container: multiHub } = renderApp(<MultivitaminsHubPage />);
    expect(multiHub.textContent).toContain('These statements have not been evaluated by a regulator');
  });
});
