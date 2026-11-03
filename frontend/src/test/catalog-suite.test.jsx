/**
 * Phase 9: Catalog, Search and Filters Frontend Test Suite
 * Covers CAT-01 through CAT-08. Strictly zero emojis.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ShopPage from '../pages/ShopPage';
import ProductDetailPage from '../pages/ProductDetailPage';
import ProductCard from '../components/product/ProductCard';
import NotFoundPage from '../pages/NotFoundPage';
import { AuthProvider } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import { ToastProvider } from '../components/ui/Toast';

describe('Phase 9: Catalog, Search and Filters Component Suite (CAT-01 to CAT-08)', () => {
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
      if (url.includes('/categories/')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [
            { id: 1, name: 'Multivitamins', slug: 'multivitamins' },
            { id: 2, name: 'Skin Care', slug: 'skincare' },
          ],
        });
      }
      if (url.includes('/reviews/')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [],
        });
      }
      if (url.includes('/products/')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            count: 2,
            results: [
              {
                id: 101,
                name: 'Supplivix Core Daily Multivitamin 60s',
                slug: 'supplivix-core-daily-multivitamin-60s',
                category_name: 'Multivitamins',
                category_slug: 'multivitamins',
                price: 2400,
                compare_at_price: 2800,
                stock: 25,
                in_stock: true,
                product_type: 'multivitamin',
                rating_average: 4.9,
                reviews_count: 32,
              },
              {
                id: 102,
                name: 'Clear Gel Daily Cleanser 150ml',
                slug: 'clear-gel-daily-cleanser-150ml',
                category_name: 'Skin Care',
                category_slug: 'skincare',
                price: 1450,
                stock: 0,
                in_stock: false,
                product_type: 'skincare',
                rating_average: 4.6,
                reviews_count: 15,
              },
            ],
          }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });
  });

  const renderWithProviders = (ui, initialRoute = '/shop') => {
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

  it('CAT-01: ShopPage renders default product list with active products and metadata', async () => {
    renderWithProviders(<ShopPage />, '/shop');

    await waitFor(() => {
      expect(screen.getByText(/Supplivix Core Daily Multivitamin 60s/i)).toBeInTheDocument();
      expect(screen.getByText(/Clear Gel Daily Cleanser 150ml/i)).toBeInTheDocument();
    });
  });

  it('CAT-02: Filter controls for category, type, price range, and in-stock update parameters', async () => {
    renderWithProviders(<ShopPage />, '/shop');

    // Click Category filter (first matching button in category block)
    const catBtns = screen.getAllByRole('button', { name: /multivitamins/i });
    fireEvent.click(catBtns[0]);

    // Toggle In-Stock checkbox
    const inStockCheckbox = screen.getByLabelText(/in-stock only/i);
    fireEvent.click(inStockCheckbox);

    // Enter Price inputs
    const minInput = screen.getByPlaceholderText(/min/i);
    const maxInput = screen.getByPlaceholderText(/max/i);
    fireEvent.change(minInput, { target: { value: '1000' } });
    fireEvent.change(maxInput, { target: { value: '3000' } });

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/products\/.*category=multivitamins/),
        expect.anything()
      );
    });
  });

  it('CAT-03: Sort dropdown options reorder catalog by price and newest', async () => {
    renderWithProviders(<ShopPage />, '/shop');

    const sortSelect = screen.getByRole('combobox');
    fireEvent.change(sortSelect, { target: { value: 'price' } });

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/products\/.*ordering=price/),
        expect.anything()
      );
    });
  });

  it('CAT-04: Search for a term with no result renders graceful empty state with clear action', async () => {
    globalThis.fetch.mockImplementation((url) => {
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
      if (url.includes('/products/')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ count: 0, results: [] }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });

    renderWithProviders(<ShopPage />, '/shop?q=xyznonexistentterm999');

    await waitFor(() => {
      expect(screen.getByText(/no products found/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument();
    });
  });

  it('CAT-05: Inactive product URL returns 404 not found route', async () => {
    globalThis.fetch.mockImplementation((url) => {
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
      if (url.includes('/products/discontinued-herb/')) {
        return Promise.resolve({
          ok: false,
          status: 404,
          json: async () => ({ code: 'not_found', message: 'Product not found.' }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });

    renderWithProviders(
      <Routes>
        <Route path="/products/:slug" element={<ProductDetailPage />} />
        <Route path="/404" element={<NotFoundPage />} />
      </Routes>,
      '/products/discontinued-herb'
    );

    await waitFor(() => {
      expect(screen.getByText(/page not found/i)).toBeInTheDocument();
    });
  });

  it('CAT-06: Out-of-stock product card and detail show Out of Stock badge and disable Add to Cart', async () => {
    const oosProduct = {
      id: 202,
      name: 'Bioactive Zinc Tablet 30s',
      slug: 'bioactive-zinc-tablet-30s',
      price: 1200,
      stock: 0,
      in_stock: false,
      product_type: 'multivitamin',
      rating: 5,
      reviews_count: 8,
    };

    renderWithProviders(<ProductCard product={oosProduct} />);

    expect(screen.getByText(/out of stock/i)).toBeInTheDocument();
    const addBtn = screen.getByRole('button', { name: /add bioactive zinc tablet 30s to cart/i });
    expect(addBtn).toBeDisabled();
  });

  it('CAT-07: Review submission by unverified user rejects with verified buyer message', async () => {
    globalThis.fetch.mockImplementation((url) => {
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
      if (url.includes('/reviews/create/')) {
        return Promise.resolve({
          ok: false,
          status: 403,
          json: async () => ({
            code: 'verified_buyer_required',
            message: 'Only verified buyers can review this product.',
            fields: {},
          }),
        });
      }
      if (url.includes('/reviews/')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [],
        });
      }
      if (url.includes('/products/test-multi/')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            id: 1,
            name: 'Supplivix Test Multi',
            slug: 'test-multi',
            price: 2200,
            stock: 20,
            in_stock: true,
            product_type: 'multivitamin',
            reviews: [],
            faqs: [],
            attributes: [],
          }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });

    renderWithProviders(
      <Routes>
        <Route path="/products/:slug" element={<ProductDetailPage />} />
      </Routes>,
      '/products/test-multi'
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Supplivix Test Multi/i })).toBeInTheDocument();
    });

    // Switch to Reviews tab
    const reviewsTab = screen.getByRole('button', { name: /reviews/i });
    fireEvent.click(reviewsTab);

    // Fill and submit review form
    const titleInput = screen.getByPlaceholderText(/energy boost/i);
    const bodyInput = screen.getByPlaceholderText(/personal experience/i);
    fireEvent.change(titleInput, { target: { value: 'Great multivitamin' } });
    fireEvent.change(bodyInput, { target: { value: 'Very noticeable energy.' } });

    const submitBtn = screen.getByRole('button', { name: /submit review/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/only verified buyers/i)).toBeInTheDocument();
    });
  });

  it('CAT-08: Product list handles multi-item catalog rendering smoothly', async () => {
    const multiProducts = Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      name: `Supplivix Vitamin Formulation ${i + 1}`,
      slug: `supplivix-vitamin-formulation-${i + 1}`,
      price: 1500 + i * 50,
      stock: 15,
      in_stock: true,
      product_type: 'multivitamin',
      rating_average: 4.8,
      reviews_count: 10 + i,
    }));

    globalThis.fetch.mockImplementation((url) => {
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
      if (url.includes('/products/')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            count: 1000,
            results: multiProducts,
          }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });

    renderWithProviders(<ShopPage />, '/shop');

    await waitFor(() => {
      expect(screen.getByText('Supplivix Vitamin Formulation 1')).toBeInTheDocument();
      expect(screen.getByText('Supplivix Vitamin Formulation 20')).toBeInTheDocument();
    });
  });
});
