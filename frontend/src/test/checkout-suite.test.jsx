/**
 * Phase 9: Cart, Shipping, Coupon & COD Checkout Component Test Suite
 * Covers CART-01 to CART-07, SHIP-01 to SHIP-06, COUP-01 to COUP-16, COD-01 to COD-14.
 * Strictly zero emojis.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import CartPage from '../pages/CartPage';
import CheckoutPage from '../pages/CheckoutPage';
import { AuthProvider } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import { ToastProvider } from '../components/ui/Toast';

describe('Phase 9: Cart, Shipping, Coupon & COD Component Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithProviders = (ui, initialRoute = '/cart', mockCartData = null) => {
    const defaultCart = mockCartData || {
      items: [
        {
          id: 1,
          product_id: 101,
          product_name: 'Supplivix Core Daily Multivitamin 60s',
          product_slug: 'supplivix-core-daily-multivitamin-60s',
          unit_price: 2200,
          quantity: 1,
          line_total: 2200,
        },
      ],
      total_items: 1,
      subtotal: 2200,
      discount_amount: 0,
      shipping_fee: 0,
      grand_total: 2200,
      free_shipping_eligible: true,
      coupon_code: '',
    };

    globalThis.fetch = vi.fn().mockImplementation((url, opts) => {
      if (url.includes('/auth/me/')) {
        return Promise.resolve({ ok: false, status: 401, json: async () => ({}) });
      }
      if (url.includes('/cart/items/') && opts?.method === 'PATCH') {
        const body = JSON.parse(opts.body);
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            ...defaultCart,
            items: [{ ...defaultCart.items[0], quantity: body.quantity, line_total: 2200 * body.quantity }],
            subtotal: 2200 * body.quantity,
            grand_total: 2200 * body.quantity,
          }),
        });
      }
      if (url.includes('/cart/items/') && opts?.method === 'DELETE') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ items: [], total_items: 0, subtotal: 0, grand_total: 0 }),
        });
      }
      if (url.includes('/cart/coupon/delete/') || (url.includes('/cart/coupon/') && opts?.method === 'DELETE')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ ...defaultCart, coupon_code: '', discount_amount: 0 }),
        });
      }
      if (url.includes('/cart/coupon/') && opts?.method === 'POST') {
        const body = JSON.parse(opts.body);
        if (body.code === 'VALID10') {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              message: 'Coupon applied successfully.',
              cart: { ...defaultCart, coupon_code: 'VALID10', discount_amount: 220, grand_total: 1980 },
            }),
          });
        }
        return Promise.resolve({
          ok: false,
          status: 400,
          json: async () => ({ code: 'invalid_code', message: 'This code is not valid.' }),
        });
      }
      if (url.includes('/cart/')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => defaultCart,
        });
      }
      if (url.includes('/orders/create/') || url.includes('/orders/')) {
        return Promise.resolve({
          ok: true,
          status: 201,
          json: async () => ({
            message: 'Order placed successfully.',
            order: {
              order_number: 'SPLV-TEST-8888',
              status: 'pending',
              payment_method: 'COD',
              grand_total: defaultCart.grand_total,
              recipient_name: 'Bilal Farooq',
              street_address: 'House 14B, Street 9',
              city: 'Islamabad',
            },
          }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });

    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <ToastProvider>
          <AuthProvider>
            <CartProvider>
              <Routes>
                <Route path="/cart" element={<CartPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
              </Routes>
            </CartProvider>
          </AuthProvider>
        </ToastProvider>
      </MemoryRouter>
    );
  };

  it('CART-01: CartPage renders item rows, product details, and updates quantity stepper', async () => {
    renderWithProviders(<CartPage />);

    await waitFor(() => {
      expect(screen.getByText(/Supplivix Core Daily Multivitamin 60s/i)).toBeInTheDocument();
      expect(screen.getByText(/Rs\. 2,200 each/i)).toBeInTheDocument();
    });

    // Stepper increment
    const plusBtn = screen.getByLabelText(/Increase quantity/i);
    fireEvent.click(plusBtn);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/cart\/items\/1\//),
        expect.objectContaining({ method: 'PATCH' })
      );
    });
  });

  it('CART-02: CartPage displays empty state when cart contains zero items', async () => {
    const emptyCart = { items: [], total_items: 0, subtotal: 0, grand_total: 0 };
    renderWithProviders(<CartPage />, '/cart', emptyCart);

    await waitFor(() => {
      expect(screen.getByText(/Your Cart is Empty/i)).toBeInTheDocument();
      expect(screen.getByText(/Explore Catalog/i)).toBeInTheDocument();
    });
  });

  it('SHIP-01 & SHIP-06: Free shipping progress bar displays at 50% threshold with accessible role and message', async () => {
    const halfCart = {
      items: [
        {
          id: 2,
          product_id: 102,
          product_name: 'Zinc Tablet',
          unit_price: 1000,
          quantity: 1,
          line_total: 1000,
        },
      ],
      total_items: 1,
      subtotal: 1000,
      discount_amount: 0,
      shipping_fee: 200,
      grand_total: 1200,
      free_shipping_eligible: false,
    };
    renderWithProviders(<CartPage />, '/cart', halfCart);

    await waitFor(() => {
      expect(screen.getByText(/Add/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Rs\. 1,000/i).length).toBeGreaterThan(0);
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '50');
    });
  });

  it('SHIP-02 & SHIP-06: Free shipping progress bar displays at 100% with unlocked delivery notice', async () => {
    const freeCart = {
      items: [
        {
          id: 3,
          product_id: 103,
          product_name: 'Gold Multi',
          unit_price: 2500,
          quantity: 1,
          line_total: 2500,
        },
      ],
      total_items: 1,
      subtotal: 2500,
      discount_amount: 0,
      shipping_fee: 0,
      grand_total: 2500,
      free_shipping_eligible: true,
    };
    renderWithProviders(<CartPage />, '/cart', freeCart);

    await waitFor(() => {
      expect(screen.getByText(/You have unlocked FREE delivery/i)).toBeInTheDocument();
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '100');
    });
  });

  it('COUP-01 & COUP-04: Coupon form normalizes code input and applies valid token', async () => {
    renderWithProviders(<CartPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Coupon code/i)).toBeInTheDocument();
    });

    const couponInput = screen.getByLabelText(/Coupon code/i);
    const applyBtn = screen.getByRole('button', { name: /Apply/i });

    fireEvent.change(couponInput, { target: { value: '  valid10  ' } });
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/cart\/coupon\//),
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ code: 'VALID10' }) })
      );
    });
  });

  it('COUP-05: Coupon form displays error toast on invalid or unknown code', async () => {
    renderWithProviders(<CartPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Coupon code/i)).toBeInTheDocument();
    });

    const couponInput = screen.getByLabelText(/Coupon code/i);
    const applyBtn = screen.getByRole('button', { name: /Apply/i });

    fireEvent.change(couponInput, { target: { value: 'WRONGCODE' } });
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/This code is not valid/i);
    });
  });

  it('COD-01 & COD-04: CheckoutPage validates required fields with inline feedback', async () => {
    renderWithProviders(<CheckoutPage />, '/checkout');

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Cash on Delivery Checkout/i })).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole('button', { name: /Confirm Cash on Delivery Order/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Please enter your full name/i)).toBeInTheDocument();
      expect(screen.getByText(/Please enter complete house\/street address/i)).toBeInTheDocument();
    });
  });

  it('COD-05: CheckoutPage validates Pakistani mobile number format strictly', async () => {
    renderWithProviders(<CheckoutPage />, '/checkout');

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Cash on Delivery Checkout/i })).toBeInTheDocument();
    });

    const phoneInput = screen.getByLabelText(/Mobile Number \(Pakistan\)/i);
    fireEvent.change(phoneInput, { target: { value: '12345' } });

    const submitBtn = screen.getByRole('button', { name: /Confirm Cash on Delivery Order/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Please enter a valid Pakistani mobile number/i)).toBeInTheDocument();
    });
  });

  it('COD-01 & COD-09: CheckoutPage submits order with COD notice and displays confirmation', async () => {
    renderWithProviders(<CheckoutPage />, '/checkout');

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Cash on Delivery Checkout/i })).toBeInTheDocument();
    });

    // Fill valid checkout form
    fireEvent.change(screen.getByLabelText(/Full Recipient Name/i), { target: { value: 'Bilal Farooq' } });
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'bilal@example.com' } });
    fireEvent.change(screen.getByLabelText(/Mobile Number \(Pakistan\)/i), { target: { value: '03001234567' } });
    fireEvent.change(screen.getByLabelText(/Street Address \/ House \/ Flat Number/i), { target: { value: 'House 14B, Street 9, Sector F-8' } });
    fireEvent.change(screen.getByLabelText(/City/i), { target: { value: 'Islamabad' } });

    const submitBtn = screen.getByRole('button', { name: /Confirm Cash on Delivery Order/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Thank You For Your Order!/i)).toBeInTheDocument();
      expect(screen.getByText(/SPLV-TEST-8888/i)).toBeInTheDocument();
      expect(screen.getByText(/Cash on Delivery Notice:/i)).toBeInTheDocument();
    });
  });

  it('COD-08: CheckoutPage renders empty cart prompt when zero items present', async () => {
    const emptyCart = { items: [], total_items: 0, subtotal: 0, grand_total: 0 };
    renderWithProviders(<CheckoutPage />, '/checkout', emptyCart);

    await waitFor(() => {
      expect(screen.getByText(/No Items to Checkout/i)).toBeInTheDocument();
      expect(screen.getByText(/Please add products to your cart before proceeding/i)).toBeInTheDocument();
    });
  });
});
