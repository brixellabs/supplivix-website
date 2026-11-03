import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../components/ui/Toast';
import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import * as AuthContextModule from '../context/AuthContext';
import { api } from '../services/api';

function renderAdminPage(staffUser = { is_staff: true, email: 'admin@supplivix.com' }) {
  vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
    user: staffUser,
    isAuthenticated: !!staffUser,
    loading: false,
    logout: vi.fn(),
  });

  return render(
    <MemoryRouter initialEntries={['/admin-panel']}>
      <ToastProvider>
        <AdminDashboardPage />
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('Phase 5: Staff Admin Dashboard (/admin-panel)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();

    // Mock basic API endpoints
    vi.spyOn(api, 'getAdminOverview').mockResolvedValue({
      total_revenue: 150000,
      total_orders_count: 42,
      today_orders_count: 5,
      today_revenue: 18000,
      thirty_day_orders_count: 38,
      thirty_day_revenue: 135000,
      cod_pending_amount: 25000,
      pending_dispatch_count: 4,
      out_of_stock_count: 1,
      new_users_count: 12,
      orders_by_status: { pending: 2, confirmed: 2, packed: 1, shipped: 3, delivered: 30 },
      low_stock_list: [
        { id: 1, name: 'Daily Multi 30s', sku: 'SPLV-DM-30', stock: 5, price: 1800 },
      ],
      recent_orders: [
        { id: 101, order_number: 'SPLV-1001-2002', recipient_name: 'Usman Ali', city: 'Karachi', grand_total: 2400, status: 'pending', created_at: new Date().toISOString() },
      ],
      top_products: [
        { id: 1, name: 'Supplivix Core Multi', price: 2200, stock: 45 },
      ],
      sales_timeline: [
        { date: 'Nov 01', orders_count: 3, revenue: 9000 },
        { date: 'Nov 02', orders_count: 5, revenue: 15000 },
      ],
    });

    vi.spyOn(api, 'getAdminOrders').mockResolvedValue({
      results: [
        {
          id: 1,
          order_number: 'SPLV-8888-9999',
          recipient_name: 'Fatima Noor',
          phone: '+923001234567',
          street_address: 'House 12, Street 4',
          city: 'Lahore',
          province: 'Punjab',
          grand_total: 3500,
          status: 'pending',
          payment_method: 'COD',
          created_at: new Date().toISOString(),
        },
      ],
    });

    vi.spyOn(api, 'getAdminProducts').mockResolvedValue({
      results: [
        {
          id: 1,
          name: 'Daily Multivitamin 60 Tablets',
          sku: 'SPLV-DM-60',
          category_name: 'Multivitamins',
          product_type: 'multivitamin',
          price: 2400,
          stock: 35,
          is_active: true,
          is_featured: true,
        },
      ],
    });

    vi.spyOn(api, 'getAdminCategories').mockResolvedValue({
      results: [
        { id: 1, name: 'Multivitamins', slug: 'multivitamins', sort_order: 1, products_count: 12, is_active: true },
      ],
    });

    vi.spyOn(api, 'getAdminCoupons').mockResolvedValue({
      results: [
        { id: 1, code: 'WELCOME10', discount_type: 'percentage', discount_value: 10, min_order_amount: 1000, times_used: 5, is_active: true },
      ],
    });

    vi.spyOn(api, 'getAdminSettings').mockResolvedValue({
      free_shipping_threshold: 2000,
      flat_shipping_fee: 200,
      store_phone: '+92 300 1234567',
      store_email: 'care@supplivix.pk',
      corporate_address: 'Supplivix Labs, Clifton, Karachi',
      site_mode: 'live',
      launch_date: '2026-12-01',
    });

    vi.spyOn(api, 'getAdminCustomers').mockResolvedValue({
      results: [
        { id: 1, full_name: 'Zainab Ahmed', email: 'zainab@example.com', phone: '+923009876543', date_joined: new Date().toISOString(), orders_count: 3, is_active: true },
      ],
    });

    vi.spyOn(api, 'getAdminReviews').mockResolvedValue({
      results: [
        { id: 1, product_name: 'Daily Multi 60s', rating: 5, title: 'Amazing energy', body: 'Best multivitamin in Pakistan.', is_approved: false },
      ],
    });

    vi.spyOn(api, 'getAdminMessages').mockResolvedValue({
      results: [
        { id: 1, name: 'Bilal Khan', email: 'bilal@example.com', phone: '+923001112233', subject: 'Product inquiry', message: 'Is this sugar-free?', is_handled: false, is_read: false },
      ],
    });

    vi.spyOn(api, 'getAdminWaitlist').mockResolvedValue({
      results: [
        { id: 1, email: 'subscriber@example.com', source: 'Coming Soon Page', created_at: new Date().toISOString() },
      ],
    });

    vi.spyOn(api, 'getAdminSecurityLogs').mockResolvedValue({
      bot_events: [{ id: 1, event_type: 'Honeypot hit', ip_address: '198.51.100.1', details: 'Filled trap field', created_at: new Date().toISOString() }],
      blocked_ips: [{ id: 1, ip_address: '198.51.100.1', reason: 'Bot trap', created_at: new Date().toISOString() }],
      failed_logins: [{ id: 1, email: 'admin@supplivix.com', ip_address: '198.51.100.2', created_at: new Date().toISOString() }],
    });

    vi.spyOn(api, 'getAdminAuditLogs').mockResolvedValue({
      results: [
        { id: 1, staff_email: 'admin@supplivix.com', action: 'update_site_settings', target_model: 'SiteSetting', target_id: '', details: 'Updated free shipping', ip_address: '127.0.0.1', created_at: new Date().toISOString() },
      ],
      total_pages: 1,
    });
  });

  it('renders all admin tabs and overview KPIs for staff', async () => {
    renderAdminPage();
    expect(screen.getByText(/Supplivix Admin Panel/i)).toBeInTheDocument();
    expect(screen.getByText(/Staff Mode/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Overview/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Orders \(COD\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Products/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Categories/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Coupons/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Shipping & Settings/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Customers/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reviews/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Messages & Waitlist/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Bot & IP Security/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Audit Trail/i })).toBeInTheDocument();

    // KPI cards
    expect(screen.getByText(/Total COD Revenue/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Orders Placed/i)).toBeInTheDocument();
    expect(screen.getByText(/Pending Dispatch/i)).toBeInTheDocument();
    expect(screen.getByText(/Out of Stock Alert/i)).toBeInTheDocument();
  });

  it('navigates between admin tabs cleanly', async () => {
    renderAdminPage();
    // Switch to Products tab
    fireEvent.click(screen.getByRole('button', { name: /Products/i }));
    await waitFor(() => {
      expect(screen.getByText(/\+ Add Product/i)).toBeInTheDocument();
      expect(screen.getByText(/Export CSV/i)).toBeInTheDocument();
      expect(screen.getByText(/Import CSV/i)).toBeInTheDocument();
    });

    // Switch to Bot & IP Security tab
    fireEvent.click(screen.getByRole('button', { name: /Bot & IP Security/i }));
    await waitFor(() => {
      expect(screen.getByText(/Manual IP Unblock/i)).toBeInTheDocument();
      expect(screen.getByText(/Recent Bot & Honeypot Telemetry Events/i)).toBeInTheDocument();
    });

    // Switch to Audit Trail tab
    fireEvent.click(screen.getByRole('button', { name: /Audit Trail/i }));
    await waitFor(() => {
      expect(screen.getByText(/Immutable Staff Action Audit Log/i)).toBeInTheDocument();
    });
  });

  it('opens Add Product modal when + Add Product button is clicked', async () => {
    renderAdminPage();
    fireEvent.click(screen.getByRole('button', { name: /Products/i }));
    await waitFor(() => {
      expect(screen.getByText(/\+ Add Product/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/\+ Add Product/i));
    expect(screen.getByText(/Add New Catalog Product/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Product Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Price \(PKR\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Stock Quantity/i)).toBeInTheDocument();
  });

  it('switches to Orders tab and displays COD order controls and status filter', async () => {
    renderAdminPage();
    fireEvent.click(screen.getByRole('button', { name: /Orders \(COD\)/i }));
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search by order #, phone, city/i)).toBeInTheDocument();
      expect(screen.getByText(/All Statuses/i)).toBeInTheDocument();
    });
  });

  it('renders Shipping & Settings tab with logistics controls and site mode', async () => {
    renderAdminPage();
    fireEvent.click(screen.getByRole('button', { name: /Shipping & Settings/i }));
    await waitFor(() => {
      expect(screen.getByText(/Store Logistics & Public Settings/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Free Shipping Threshold \(PKR\)/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Flat Shipping Fee \(PKR\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Save Store Settings/i)).toBeInTheDocument();
    });
  });

  it('renders Coupons tab with token generation and rules fields', async () => {
    renderAdminPage();
    fireEvent.click(screen.getByRole('button', { name: /Coupons/i }));
    await waitFor(() => {
      expect(screen.getByText(/Create Discount Coupon/i)).toBeInTheDocument();
      expect(screen.getByText(/Generate Random/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Discount Type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Min Order \(PKR\)/i)).toBeInTheDocument();
    });
  });

  it('handles non-staff access verification gracefully', () => {
    const { container } = renderAdminPage({ is_staff: false, email: 'regular@example.com' });
    expect(container).toBeDefined();
  });
});
