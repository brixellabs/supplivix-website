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
import FreeShippingProgressBar from '../components/cart/FreeShippingProgressBar';
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
              number: 'SPLV-TEST-8888',
              status: 'pending',
              payment_method: 'COD',
              grand_total: defaultCart.grand_total,
              recipient_name: 'Test Customer',
              street_address: 'House 1, Street 2',
              city: 'Lahore',
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

  it('SHIP-01: Subtotal Rs. 1,999 displays shipping Rs. 200 and message Add Rs. 1 more for free shipping', async () => {
    const ship1999Cart = {
      items: [
        {
          id: 201,
          product_id: 201,
          product_name: 'Formula 1999',
          unit_price: 1999,
          quantity: 1,
          line_total: 1999,
        },
      ],
      total_items: 1,
      subtotal: 1999,
      shipping_total: 200,
      grand_total: 2199,
      free_shipping_eligible: false,
      free_shipping_threshold: 2000,
      amount_needed_for_free_shipping: 1,
    };
    renderWithProviders(<CartPage />, '/cart', ship1999Cart);

    await waitFor(() => {
      expect(screen.getByText(/Add/i)).toBeInTheDocument();
      expect(screen.getByText(/^Rs\.\s*1$/i)).toBeInTheDocument();
      expect(screen.getByText(/free shipping/i)).toBeInTheDocument();
      expect(screen.getByText(/Rs\. 200/i)).toBeInTheDocument();
      expect(screen.getByText(/^99%$/i)).toBeInTheDocument();
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '99');
      expect(progressbar).toHaveAttribute('aria-label', 'Free shipping progress');
    });
  });

  it('SHIP-02: Subtotal exactly Rs. 2,000 displays free delivery Rs. 0', async () => {
    const ship2000Cart = {
      items: [
        {
          id: 202,
          product_id: 202,
          product_name: 'Formula 2000',
          unit_price: 2000,
          quantity: 1,
          line_total: 2000,
        },
      ],
      total_items: 1,
      subtotal: 2000,
      discount_amount: 0,
      shipping_total: 0,
      grand_total: 2000,
      free_shipping_eligible: true,
      free_shipping_threshold: 2000,
      amount_needed_for_free_shipping: 0,
    };
    renderWithProviders(<CartPage />, '/cart', ship2000Cart);

    await waitFor(() => {
      expect(screen.getByText(/You have unlocked FREE delivery/i)).toBeInTheDocument();
      expect(screen.getByText(/^100%$/i)).toBeInTheDocument();
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '100');
    });
  });

  it('SHIP-03: Subtotal Rs. 2,001 and above qualifies for free shipping', async () => {
    const ship2500Cart = {
      items: [
        {
          id: 203,
          product_id: 203,
          product_name: 'Formula 2500',
          unit_price: 2500,
          quantity: 1,
          line_total: 2500,
        },
      ],
      total_items: 1,
      subtotal: 2500,
      discount_amount: 0,
      shipping_total: 0,
      grand_total: 2500,
      free_shipping_eligible: true,
      free_shipping_threshold: 2000,
      amount_needed_for_free_shipping: 0,
    };
    renderWithProviders(<CartPage />, '/cart', ship2500Cart);

    await waitFor(() => {
      expect(screen.getByText(/You have unlocked FREE delivery/i)).toBeInTheDocument();
      expect(screen.getByText(/^100%$/i)).toBeInTheDocument();
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '100');
    });
  });

  it('SHIP-04: Subtotal Rs. 2,300 with coupon taking it to Rs. 1,900 applies shipping Rs. 200', async () => {
    const couponCart = {
      items: [
        {
          id: 204,
          product_id: 204,
          product_name: 'Formula 2300',
          unit_price: 2300,
          quantity: 1,
          line_total: 2300,
        },
      ],
      total_items: 1,
      subtotal: 2300,
      discount_total: 400,
      shipping_total: 200,
      grand_total: 2100,
      free_shipping_eligible: false,
      free_shipping_threshold: 2000,
      amount_needed_for_free_shipping: 100,
    };
    renderWithProviders(<CartPage />, '/cart', couponCart);

    await waitFor(() => {
      expect(screen.getByText(/Rs\. 200/i)).toBeInTheDocument();
      expect(screen.getByText(/Add/i)).toBeInTheDocument();
      expect(screen.getByText(/Rs\. 100/i)).toBeInTheDocument();
      expect(screen.getByText(/free shipping/i)).toBeInTheDocument();
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '95');
    });
  });

  it('SHIP-05: Threshold changed to Rs. 3,000 calculates shipping against new limit', async () => {
    const dynCart = {
      items: [
        {
          id: 205,
          product_id: 205,
          product_name: 'Formula 2500',
          unit_price: 2500,
          quantity: 1,
          line_total: 2500,
        },
      ],
      total_items: 1,
      subtotal: 2500,
      shipping_total: 200,
      grand_total: 2700,
      free_shipping_eligible: false,
      free_shipping_threshold: 3000,
      amount_needed_for_free_shipping: 500,
    };
    renderWithProviders(<CartPage />, '/cart', dynCart);

    await waitFor(() => {
      expect(screen.getByText(/Rs\. 200/i)).toBeInTheDocument();
      expect(screen.getByText(/Rs\. 500/i)).toBeInTheDocument();
      expect(screen.getByText(/free shipping/i)).toBeInTheDocument();
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '83');
    });
  });

  it('SHIP-06: FreeShippingProgressBar accurately renders states at 0%, 50%, 99% and 100%', () => {
    // 1. 0%
    const { unmount: unmount0, getByRole: getByRole0, getByText: getByText0, container: container0 } = render(
      <FreeShippingProgressBar threshold={2000} subtotal={0} />
    );
    const pb0 = getByRole0('progressbar');
    expect(pb0).toHaveAttribute('aria-valuenow', '0');
    expect(pb0).toHaveAttribute('aria-label', 'Free shipping progress');
    expect(getByText0('0%')).toBeInTheDocument();
    expect(container0.querySelector('[style*="width: 0%"]')).toBeInTheDocument();
    unmount0();

    // 2. 50%
    const { unmount: unmount50, getByRole: getByRole50, getByText: getByText50, container: container50 } = render(
      <FreeShippingProgressBar threshold={2000} subtotal={1000} />
    );
    const pb50 = getByRole50('progressbar');
    expect(pb50).toHaveAttribute('aria-valuenow', '50');
    expect(getByText50('50%')).toBeInTheDocument();
    expect(container50.querySelector('[style*="width: 50%"]')).toBeInTheDocument();
    unmount50();

    // 3. 99% (at Rs. 1,999)
    const { unmount: unmount99, getByRole: getByRole99, getByText: getByText99, container: container99 } = render(
      <FreeShippingProgressBar threshold={2000} subtotal={1999} />
    );
    const pb99 = getByRole99('progressbar');
    expect(pb99).toHaveAttribute('aria-valuenow', '99');
    expect(getByText99('99%')).toBeInTheDocument();
    expect(container99.querySelector('[style*="width: 99%"]')).toBeInTheDocument();
    unmount99();

    // 4. 100% (at Rs. 2,000)
    const { unmount: unmount100, getByRole: getByRole100, getByText: getByText100, container: container100 } = render(
      <FreeShippingProgressBar threshold={2000} subtotal={2000} />
    );
    const pb100 = getByRole100('progressbar');
    expect(pb100).toHaveAttribute('aria-valuenow', '100');
    expect(getByText100('100%')).toBeInTheDocument();
    expect(container100.querySelector('[style*="width: 100%"]')).toBeInTheDocument();
    unmount100();
  });

  it('COUP-01 & COUP-04: Coupon form normalizes code input and applies valid token', async () => {
    renderWithProviders(<CartPage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Enter code/i)).toBeInTheDocument();
    });

    const couponInput = screen.getByPlaceholderText(/Enter code/i);
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
      expect(screen.getByPlaceholderText(/Enter code/i)).toBeInTheDocument();
    });

    const couponInput = screen.getByPlaceholderText(/Enter code/i);
    const applyBtn = screen.getByRole('button', { name: /Apply/i });

    fireEvent.change(couponInput, { target: { value: 'WRONGCODE' } });
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(screen.getByText(/This code is not valid/i)).toBeInTheDocument();
    });
  });

  it('COUP-13: CartPage renders applied coupon token and allows removing it', async () => {
    const appliedCouponCart = {
      items: [
        {
          id: 1,
          product_id: 101,
          product_name: 'Core Multi',
          unit_price: 2200,
          quantity: 1,
          line_total: 2200,
        },
      ],
      total_items: 1,
      subtotal: 2200,
      coupon_code: 'SAVE10',
      discount_total: 220,
      grand_total: 1980,
    };
    renderWithProviders(<CartPage />, '/cart', appliedCouponCart);

    await waitFor(() => {
      expect(screen.getByText(/SAVE10/i)).toBeInTheDocument();
      expect(screen.getAllByText(/-Rs\. 220/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByRole('button', { name: /^Remove$/i })).toBeInTheDocument();
    });

    const removeBtn = screen.getByRole('button', { name: /^Remove$/i });
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/cart\/coupon\//),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  it('COUP-14: CartPage displays notice banner when coupon was invalidated and removed', async () => {
    const invalidatedCouponCart = {
      items: [
        {
          id: 1,
          product_id: 101,
          product_name: 'Core Multi',
          unit_price: 2200,
          quantity: 1,
          line_total: 2200,
        },
      ],
      total_items: 1,
      subtotal: 2200,
      coupon_code: '',
      discount_total: 0,
      grand_total: 2200,
      notices: ['Notice: Coupon MIN4000 was removed as cart requirements are no longer met.'],
    };
    renderWithProviders(<CartPage />, '/cart', invalidatedCouponCart);

    await waitFor(() => {
      expect(screen.getByText(/Notice: Coupon MIN4000 was removed as cart requirements are no longer met\./i)).toBeInTheDocument();
    });
  });

  it('COD-01 & COD-04: CheckoutPage validates required fields with inline feedback', async () => {
    renderWithProviders(<CheckoutPage />, '/checkout');

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Cash on Delivery Checkout/i })).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole('button', { name: /(Confirm|Place) Cash on Delivery/i });
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

    const phoneInput = screen.getByLabelText(/Mobile Number/i);
    fireEvent.change(phoneInput, { target: { value: '12345' } });

    const submitBtn = screen.getByRole('button', { name: /(Confirm|Place) Cash on Delivery/i });
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
    fireEvent.change(screen.getByLabelText(/Mobile Number/i), { target: { value: '03001234567' } });
    fireEvent.change(screen.getByLabelText(/Street Address/i), { target: { value: 'House 14B, Street 9, Sector F-8' } });
    fireEvent.change(screen.getByPlaceholderText(/Select or type city/i), { target: { value: 'Islamabad' } });

    const submitBtn = screen.getByRole('button', { name: /(Confirm|Place) Cash on Delivery/i });
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

  it('CART-04: CartPage displays price update notice when product price changes', async () => {
    const priceChangedCart = {
      items: [
        {
          id: 5,
          product_id: 105,
          product_name: 'Daily Active Multi 60s',
          product_slug: 'daily-active-multi-60s',
          unit_price: 2500,
          quantity: 1,
          line_total: 2500,
          price_changed: true,
          price_change_notice: 'Price updated to Rs. 2,500 (was Rs. 2,200)',
        },
      ],
      total_items: 1,
      subtotal: 2500,
      grand_total: 2500,
      notices: ['Notice: Price for Daily Active Multi 60s has increased to Rs. 2,500.'],
    };
    renderWithProviders(<CartPage />, '/cart', priceChangedCart);

    await waitFor(() => {
      expect(screen.getByText(/Price for Daily Active Multi 60s has increased to Rs\. 2,500/i)).toBeInTheDocument();
      expect(screen.getByText(/Price updated to Rs\. 2,500 \(was Rs\. 2,200\)/i)).toBeInTheDocument();
    });
  });

  it('CART-05: CartPage flags inactive product and blocks checkout button', async () => {
    const inactiveCart = {
      items: [
        {
          id: 6,
          product_id: 106,
          product_name: 'Discontinued Skin Serum',
          product_slug: 'discontinued-skin-serum',
          unit_price: 1800,
          quantity: 1,
          line_total: 1800,
          is_active: false,
          flagged_inactive: true,
        },
      ],
      total_items: 1,
      subtotal: 1800,
      grand_total: 2000,
      notices: ['Discontinued Skin Serum is no longer available. Please remove it to proceed to checkout.'],
    };
    renderWithProviders(<CartPage />, '/cart', inactiveCart);

    await waitFor(() => {
      expect(screen.getByText(/No longer available — please remove to proceed/i)).toBeInTheDocument();
      const disabledCheckoutBtn = screen.getByRole('button', { name: /Remove Unavailable Items to Checkout/i });
      expect(disabledCheckoutBtn).toBeInTheDocument();
      expect(disabledCheckoutBtn).toBeDisabled();
    });
  });
});
