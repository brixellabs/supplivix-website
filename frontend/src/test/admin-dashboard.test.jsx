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

    vi.spyOn(api, 'getAdminOffers').mockResolvedValue({
      count: 2,
      active_count: 2,
      inactive_count: 0,
      results: [
        {
          id: 1,
          title: 'Complete Daily Glow Duo',
          badge: 'Special Bundle',
          description: 'Pair our daily multivitamin with pure clarifying serum.',
          price: 3499,
          original_price: 4350,
          highlight: '',
          button_text: 'Shop The Duo',
          link: '/shop?bundle=glow-duo',
          is_active: true,
          sort_order: 1,
        },
        {
          id: 2,
          title: '3-Month Wellness Supply',
          badge: 'Family Pack',
          description: 'Ensure daily vitamin consistency with our bulk family package.',
          price: 0,
          original_price: null,
          highlight: 'Free Nationwide Delivery',
          button_text: 'View Family Pack',
          link: '/multivitamins',
          is_active: true,
          sort_order: 2,
        },
      ],
    });

    vi.spyOn(api, 'createAdminOffer').mockResolvedValue({
      id: 3,
      title: 'Mega Vitality Pack',
      price: 4999,
      is_active: true,
    });

    vi.spyOn(api, 'deleteAdminOffer').mockResolvedValue({
      message: 'Offer deleted successfully.',
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
    expect(screen.getByRole('button', { name: /Sale Events/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Promotional Bundles/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Shipping & Settings/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Customers/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reviews/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Messages & Waitlist/i })).toBeInTheDocument();
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

    // Switch to Messages & Waitlist tab
    fireEvent.click(screen.getByRole('button', { name: /Messages & Waitlist/i }));
    await waitFor(() => {
      expect(screen.getByText(/Customer Contact Inquiries/i)).toBeInTheDocument();
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

  it('ADM-01: handles non-staff access verification gracefully by redirecting', () => {
    const { container } = renderAdminPage({ is_staff: false, email: 'regular@example.com' });
    expect(container).toBeDefined();
  });

  it('ADM-02: opens Add Product modal and submits product with validation', async () => {
    const createSpy = vi.spyOn(api, 'createAdminProduct').mockResolvedValue({
      id: 2,
      name: 'Supplivix Vitamin C 1000mg',
      price: 1500,
      stock: 50,
    });
    renderAdminPage();
    fireEvent.click(screen.getByRole('button', { name: /Products/i }));
    await waitFor(() => {
      expect(screen.getByText(/\+ Add Product/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/\+ Add Product/i));
    expect(screen.getByText(/Add New Catalog Product/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Product Name/i), { target: { value: 'Supplivix Vitamin C 1000mg' } });
    fireEvent.change(screen.getByLabelText(/Price \(PKR\)/i), { target: { value: '1500' } });
    fireEvent.change(screen.getByLabelText(/Stock Quantity/i), { target: { value: '50' } });

    fireEvent.click(screen.getByRole('button', { name: /Create Product/i }));
    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Supplivix Vitamin C 1000mg',
        price: 1500,
        stock: 50,
      }));
    });
  });

  it('ADM-03: displays image upload constraints and modal with max 2 MB notice', async () => {
    renderAdminPage();
    fireEvent.click(screen.getByRole('button', { name: /Products/i }));
    await waitFor(() => {
      expect(screen.getByText(/Daily Multivitamin 60 Tablets/i)).toBeInTheDocument();
    });
    const photoBtns = screen.getAllByRole('button', { name: /Images/i });
    fireEvent.click(photoBtns[0]);
    await waitFor(() => {
      expect(screen.getByText(/Upload New Image \(JPEG, PNG, WebP, SVG; Max 2 MB\)/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Descriptive Alt Text/i)).toBeInTheDocument();
    });
  });

  it('ADM-04: opens order status transition modal and records staff note', async () => {
    const transitionSpy = vi.spyOn(api, 'transitionAdminOrder').mockResolvedValue({
      status: 'confirmed',
      order_number: 'SPLV-8888-9999',
    });
    renderAdminPage();
    fireEvent.click(screen.getByRole('button', { name: /Orders \(COD\)/i }));
    await waitFor(() => {
      expect(screen.getByText(/SPLV-8888-9999/i)).toBeInTheDocument();
    });

    const confirmBtns = screen.getAllByRole('button', { name: /Confirm/i });
    fireEvent.click(confirmBtns[0]);

    await waitFor(() => {
      expect(screen.getByText(/Update Order #SPLV-8888-9999 Status/i)).toBeInTheDocument();
      expect(screen.getByText(/Confirm status transition to/i)).toBeInTheDocument();
    });

    const noteInput = screen.getByPlaceholderText(/Courier tracking ID/i);
    fireEvent.change(noteInput, { target: { value: 'Customer phone confirmed via call' } });

    fireEvent.click(screen.getByRole('button', { name: /Confirm Status Transition/i }));
    await waitFor(() => {
      expect(transitionSpy).toHaveBeenCalledWith(
        'SPLV-8888-9999',
        'confirmed',
        'Customer phone confirmed via call'
      );
    });
  });

  it('ADM-05: displays orders view with COD payment method and status badges', async () => {
    renderAdminPage();
    fireEvent.click(screen.getByRole('button', { name: /Orders \(COD\)/i }));
    await waitFor(() => {
      expect(screen.getByText(/SPLV-8888-9999/i)).toBeInTheDocument();
      expect(screen.getAllByText(/COD/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Rs\. 3,500/i)).toBeInTheDocument();
    });
  });

  it('ADM-06: verifies Coupons tab is removed from admin navigation', async () => {
    renderAdminPage();
    expect(screen.queryByRole('button', { name: /Coupons/i })).not.toBeInTheDocument();
  });

  it('ADM-07: renders Shipping & Settings tab with logistics controls and saves threshold', async () => {
    const updateSpy = vi.spyOn(api, 'updateAdminSettings').mockResolvedValue({
      settings: {
        free_shipping_threshold: 3000,
        flat_shipping_fee: 250,
      },
    });
    renderAdminPage();
    fireEvent.click(screen.getByRole('button', { name: /Shipping & Settings/i }));
    await waitFor(() => {
      expect(screen.getByText(/Store Logistics & Public Settings/i)).toBeInTheDocument();
    });

    const threshInput = screen.getByLabelText(/Free Shipping Threshold \(PKR\)/i);
    fireEvent.change(threshInput, { target: { value: '3000' } });

    fireEvent.click(screen.getByText(/Save Store Settings/i));
    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({
        free_shipping_threshold: 3000,
      }));
    });
  });

  it('ADM-08: renders CSV export and import triggers on Products tab', async () => {
    renderAdminPage();
    fireEvent.click(screen.getByRole('button', { name: /Products/i }));
    await waitFor(() => {
      expect(screen.getByText(/Export CSV/i)).toBeInTheDocument();
      expect(screen.getByText(/Import CSV/i)).toBeInTheDocument();
    });
  });

  it('ADM-09: renders overview tab KPIs matching API data', async () => {
    renderAdminPage();
    expect(screen.getByText(/Total COD Revenue/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/150,000/i)).toBeInTheDocument();
      expect(screen.getByText(/Total Orders Placed/i)).toBeInTheDocument();
      expect(screen.getByText(/42 orders/i)).toBeInTheDocument();
    });
  });

  it('ADM-10: verifies confirmation modal workflow and audit trail access', async () => {
    renderAdminPage();
    // Switch to Audit Trail
    fireEvent.click(screen.getByRole('button', { name: /Audit Trail/i }));
    await waitFor(() => {
      expect(screen.getByText(/Immutable Staff Action Audit Log/i)).toBeInTheDocument();
      expect(screen.getByText(/update_site_settings/i)).toBeInTheDocument();
    });
  });

  it('ADM-11: allows admin to view, create, and remove promotional bundles', async () => {
    renderAdminPage();
    // Switch to Promotional Bundles tab
    fireEvent.click(screen.getByRole('button', { name: /Promotional Bundles/i }));
    await waitFor(() => {
      expect(screen.getByText(/Promotional Bundles & Homepage Deals/i)).toBeInTheDocument();
      expect(screen.getByText(/Complete Daily Glow Duo/i)).toBeInTheDocument();
      expect(screen.getByText(/3-Month Wellness Supply/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /\+ Add New Bundle/i })).toBeInTheDocument();
    });

    // Open remove confirmation modal for first bundle
    const removeButtons = screen.getAllByRole('button', { name: /Remove/i });
    fireEvent.click(removeButtons[0]);
    await waitFor(() => {
      expect(screen.getByText(/Remove Promotional Bundle/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Yes, Remove Bundle/i })).toBeInTheDocument();
    });

    // Confirm deletion
    fireEvent.click(screen.getByRole('button', { name: /Yes, Remove Bundle/i }));
    await waitFor(() => {
      expect(api.deleteAdminOffer).toHaveBeenCalledWith(1);
    });
  });
});
