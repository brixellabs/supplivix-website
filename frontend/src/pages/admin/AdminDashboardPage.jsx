import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/ui/Icon';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { api } from '../../services/api';

const ADMIN_TABS = [
  { key: 'overview', label: 'Overview', icon: 'capsules' },
  { key: 'orders', label: 'Orders (COD)', icon: 'cod' },
  { key: 'products', label: 'Products', icon: 'box' },
  { key: 'categories', label: 'Categories', icon: 'tag' },
  { key: 'coupons', label: 'Coupons', icon: 'bolt' },
  { key: 'customers', label: 'Customers', icon: 'user' },
  { key: 'reviews', label: 'Reviews', icon: 'star' },
  { key: 'messages', label: 'Messages', icon: 'envelope' },
  { key: 'security', label: 'Bot & IP Security', icon: 'shield' },
];

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('overview');
  const [_loading, setLoading] = useState(false);

  // 1. Overview state
  const [overview, setOverview] = useState({
    total_revenue: 0,
    total_orders_count: 0,
    pending_dispatch_count: 0,
    out_of_stock_count: 0,
    recent_orders: [],
    top_products: [],
    sales_timeline: [],
  });

  // 2. Orders state
  const [orders, setOrders] = useState([]);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);

  // 3. Products state
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [newProductModalOpen, setNewProductModalOpen] = useState(false);
  const [newProductData, setNewProductData] = useState({
    name: '',
    slug: '',
    price: '',
    compare_at_price: '',
    stock: '',
    product_type: 'multivitamin',
    category_id: '',
  });

  // 4. Categories state
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');

  // 5. Coupons state
  const [coupons, setCoupons] = useState([]);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDiscount, setNewCouponDiscount] = useState('10');

  // 6. Customers state
  const [customers, setCustomers] = useState([]);

  // 7. Reviews state
  const [reviews, setReviews] = useState([]);

  // 8. Messages state
  const [messages, setMessages] = useState([]);

  // 9. Security state
  const [securityLogs, setSecurityLogs] = useState({ bot_events: [], blocked_ips: [] });
  const [unblockIPInput, setUnblockIPInput] = useState('');

  // Check Staff Permission
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !user?.is_staff)) {
      showToast('Staff credentials required to access the admin panel.', 'error');
      navigate('/login', { state: { from: { pathname: '/admin-panel' } } });
    }
  }, [authLoading, isAuthenticated, user, navigate, showToast]);

  // Load Tab Data
  const loadTabData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'overview') {
        const data = await api.getAdminOverview();
        setOverview(data);
      } else if (activeTab === 'orders') {
        const params = {};
        if (orderSearch) params.search = orderSearch;
        if (orderStatusFilter) params.status = orderStatusFilter;
        const data = await api.getAdminOrders(params);
        setOrders(data.results || []);
      } else if (activeTab === 'products') {
        const data = await api.getAdminProducts({ search: productSearch });
        setProducts(data.results || []);
      } else if (activeTab === 'categories') {
        const data = await api.getAdminCategories();
        setCategories(data.results || []);
      } else if (activeTab === 'coupons') {
        const data = await api.getAdminCoupons();
        setCoupons(data.results || []);
      } else if (activeTab === 'customers') {
        const data = await api.getAdminCustomers();
        setCustomers(data.results || []);
      } else if (activeTab === 'reviews') {
        const data = await api.getAdminReviews();
        setReviews(data.results || []);
      } else if (activeTab === 'messages') {
        const data = await api.getAdminMessages();
        setMessages(data.results || []);
      } else if (activeTab === 'security') {
        const data = await api.getAdminSecurityLogs();
        setSecurityLogs(data);
      }
    } catch {
      // Offline fallback
    } finally {
      setLoading(false);
    }
  }, [activeTab, orderSearch, orderStatusFilter, productSearch]);

  useEffect(() => {
    if (user?.is_staff) {
      loadTabData();
    }
  }, [user, activeTab, loadTabData]);

  // Order transition
  const handleTransitionOrder = async (number, nextStatus) => {
    try {
      await api.transitionAdminOrder(number, nextStatus);
      showToast(`Order #${number} updated to ${nextStatus}.`);
      loadTabData();
    } catch (err) {
      showToast(err.message || 'Transition not allowed.', 'error');
    }
  };

  // Copy customer address
  const handleCopyAddress = (order) => {
    const text = `${order.recipient_name}, ${order.street_address}, ${order.city}, ${order.province} (${order.phone})`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToast('Customer address copied to clipboard!');
    }
  };

  // Product quick update
  const handleSaveProductEdit = async () => {
    if (!editingProduct) return;
    try {
      await api.updateAdminProduct(editingProduct.id, {
        price: editingProduct.price,
        stock: editingProduct.stock,
        is_active: editingProduct.is_active,
      });
      showToast('Product updated successfully.');
      setEditingProduct(null);
      loadTabData();
    } catch (err) {
      showToast(err.message || 'Could not update product.', 'error');
    }
  };

  // Create product
  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      await api.createAdminProduct(newProductData);
      showToast('Product created successfully.');
      setNewProductModalOpen(false);
      setNewProductData({ name: '', slug: '', price: '', compare_at_price: '', stock: '', product_type: 'multivitamin', category_id: '' });
      loadTabData();
    } catch (err) {
      showToast(err.message || 'Could not create product.', 'error');
    }
  };

  // Create category
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      await api.createAdminCategory({ name: newCategoryName.trim() });
      showToast('Category created.');
      setNewCategoryName('');
      loadTabData();
    } catch (err) {
      showToast(err.message || 'Could not create category.', 'error');
    }
  };

  // Create coupon
  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    if (!newCouponCode.trim()) return;
    try {
      await api.createAdminCoupon({
        code: newCouponCode.trim().toUpperCase(),
        discount_value: Number(newCouponDiscount),
        discount_type: 'percentage',
      });
      showToast('Coupon created.');
      setNewCouponCode('');
      loadTabData();
    } catch (err) {
      showToast(err.message || 'Could not create coupon.', 'error');
    }
  };

  // Customer status toggle
  const handleToggleCustomer = async (id) => {
    try {
      const res = await api.toggleAdminCustomer(id);
      showToast(res.message);
      loadTabData();
    } catch (err) {
      showToast(err.message || 'Could not toggle customer.', 'error');
    }
  };

  // Review moderation
  const handleModerateReview = async (id, approved) => {
    try {
      await api.moderateAdminReview(id, approved);
      showToast(`Review ${approved ? 'approved' : 'rejected'}.`);
      loadTabData();
    } catch (err) {
      showToast(err.message || 'Could not moderate review.', 'error');
    }
  };

  // Message mark read
  const handleMarkMessageRead = async (id) => {
    try {
      await api.markAdminMessageRead(id);
      showToast('Message marked as read.');
      loadTabData();
    } catch (err) {
      showToast(err.message || 'Could not mark message.', 'error');
    }
  };

  // IP Unblock
  const handleUnblockIP = async (ip) => {
    try {
      await api.unblockAdminIP(ip);
      showToast(`IP ${ip} unblocked.`);
      setUnblockIPInput('');
      loadTabData();
    } catch (err) {
      showToast(err.message || 'Could not unblock IP.', 'error');
    }
  };

  return (
    <div className="bg-white min-h-screen text-brand-ink">
      {/* Top Admin Header */}
      <header className="bg-brand-ink text-white border-b border-surface-border sticky top-0 z-30">
        <div className="max-w-site mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold text-sm tracking-wider uppercase text-brand-lavender">
              Supplivix Admin Panel
            </span>
            <Badge variant="pill">Staff Mode</Badge>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span>Signed in as <strong>{user?.email}</strong></span>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-white hover:text-brand-lavender underline font-medium"
            >
              Back to Storefront
            </button>
          </div>
        </div>
      </header>

      {/* Admin Layout: Nav Tabs Strip & Content Area */}
      <div className="max-w-site mx-auto px-4 sm:px-6 py-8">
        {/* Horizontal Navigation Tabs */}
        <div className="flex items-center gap-1.5 border-b border-surface-border pb-3 overflow-x-auto mb-8">
          {ADMIN_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-sm text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-brand-ink text-white'
                  : 'bg-surface-subtle text-ink-muted hover:text-brand-ink hover:bg-surface-accent'
              }`}
            >
              <Icon name={tab.icon} className="text-xs" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* 1. OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* KPI Cards (Solid Cards, Zero Glassmorphism) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-surface-subtle border border-surface-border rounded-lg p-5 shadow-card">
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted block mb-1">
                  Total COD Revenue
                </span>
                <span className="text-2xl font-bold text-brand-ink block">
                  Rs. {Number(overview.total_revenue).toLocaleString()}
                </span>
                <span className="text-[11px] text-brand-green font-semibold mt-1 block">
                  Delivered orders in Pakistan
                </span>
              </div>

              <div className="bg-surface-subtle border border-surface-border rounded-lg p-5 shadow-card">
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted block mb-1">
                  Total Orders Placed
                </span>
                <span className="text-2xl font-bold text-brand-ink block">
                  {overview.total_orders_count}
                </span>
                <span className="text-[11px] text-ink-muted mt-1 block">
                  100% Cash on Delivery
                </span>
              </div>

              <div className="bg-surface-subtle border border-surface-border rounded-lg p-5 shadow-card">
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted block mb-1">
                  Pending Dispatch
                </span>
                <span className="text-2xl font-bold text-amber-600 block">
                  {overview.pending_dispatch_count}
                </span>
                <span className="text-[11px] text-ink-muted mt-1 block">
                  Awaiting courier pickup
                </span>
              </div>

              <div className="bg-surface-subtle border border-surface-border rounded-lg p-5 shadow-card">
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted block mb-1">
                  Out of Stock Alert
                </span>
                <span className="text-2xl font-bold text-red-600 block">
                  {overview.out_of_stock_count}
                </span>
                <span className="text-[11px] text-ink-muted mt-1 block">
                  Products requiring restock
                </span>
              </div>
            </div>

            {/* Sales Timeline Bar Display */}
            <div className="bg-surface-subtle border border-surface-border rounded-lg p-6 shadow-card">
              <h2 className="text-xs font-bold uppercase tracking-wider text-brand-ink mb-4">
                Daily Sales (Last 7 Days)
              </h2>
              <div className="grid grid-cols-7 gap-2 text-center text-xs">
                {overview.sales_timeline?.map((day, idx) => (
                  <div key={idx} className="bg-white border border-surface-border p-3 rounded-md shadow-sm">
                    <span className="block text-[11px] font-semibold text-ink-muted mb-1">{day.date}</span>
                    <span className="block font-bold text-brand-ink">Rs. {Number(day.revenue).toLocaleString()}</span>
                    <span className="block text-[10px] text-brand-green font-medium">{day.orders_count} orders</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Orders Table */}
            <div className="bg-white border border-surface-border rounded-lg shadow-card overflow-hidden">
              <div className="p-4 bg-surface-subtle border-b border-surface-border flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-brand-ink">
                  Recent Orders
                </h2>
                <Button variant="outline" size="sm" onClick={() => setActiveTab('orders')} className="text-xs">
                  View All Orders
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-surface-subtle border-b border-surface-border text-ink-muted uppercase">
                      <th className="p-3">Order Number</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">City</th>
                      <th className="p-3">Amount (COD)</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {overview.recent_orders?.map((ord) => (
                      <tr key={ord.id} className="hover:bg-surface-subtle">
                        <td className="p-3 font-bold text-brand-ink">#{ord.order_number}</td>
                        <td className="p-3">{ord.recipient_name}</td>
                        <td className="p-3">{ord.city}</td>
                        <td className="p-3 font-semibold text-brand-green">Rs. {Number(ord.grand_total).toLocaleString()}</td>
                        <td className="p-3">
                          <Badge variant={ord.status === 'delivered' ? 'pill' : 'default'}>{ord.status}</Badge>
                        </td>
                        <td className="p-3 text-ink-muted">{new Date(ord.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 2. ORDERS TAB */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <Input
                  name="orderSearch"
                  placeholder="Search by order #, phone, city..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="text-xs py-2"
                />
                <Button variant="outline" size="sm" onClick={loadTabData} className="text-xs">
                  Filter
                </Button>
              </div>

              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
                className="bg-surface-subtle border border-surface-border rounded-sm p-2 text-xs text-brand-ink"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="packed">Packed</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="bg-white border border-surface-border rounded-lg shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-surface-subtle border-b border-surface-border uppercase font-bold text-ink-muted">
                      <th className="p-3">Order Number</th>
                      <th className="p-3">Customer & Contact</th>
                      <th className="p-3">Delivery Address</th>
                      <th className="p-3">COD Amount</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {orders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-surface-subtle">
                        <td className="p-3 font-bold text-brand-ink">
                          <div>#{ord.order_number}</div>
                          <span className="text-[10px] text-ink-muted">{new Date(ord.created_at).toLocaleDateString()}</span>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-brand-ink">{ord.recipient_name}</div>
                          <div className="text-[11px] text-ink-muted">{ord.phone}</div>
                        </td>
                        <td className="p-3">
                          <div className="truncate max-w-xs">{ord.street_address}, {ord.city}</div>
                          <button
                            type="button"
                            onClick={() => handleCopyAddress(ord)}
                            className="text-[10px] font-semibold text-brand-green hover:underline inline-flex items-center gap-1 mt-0.5"
                          >
                            <Icon name="copy" className="text-[9px]" />
                            <span>Copy Address</span>
                          </button>
                        </td>
                        <td className="p-3 font-bold text-brand-green">
                          Rs. {Number(ord.grand_total).toLocaleString()}
                        </td>
                        <td className="p-3">
                          <Badge variant={ord.status === 'delivered' ? 'pill' : ord.status === 'cancelled' ? 'default' : 'sale'}>
                            {ord.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                          {ord.status === 'pending' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleTransitionOrder(ord.order_number, 'confirmed')}
                              className="text-[10px] py-1 px-2"
                            >
                              Confirm
                            </Button>
                          )}
                          {ord.status === 'confirmed' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleTransitionOrder(ord.order_number, 'packed')}
                              className="text-[10px] py-1 px-2"
                            >
                              Pack
                            </Button>
                          )}
                          {ord.status === 'packed' && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleTransitionOrder(ord.order_number, 'shipped')}
                              className="text-[10px] py-1 px-2"
                            >
                              Dispatch
                            </Button>
                          )}
                          {ord.status === 'shipped' && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleTransitionOrder(ord.order_number, 'delivered')}
                              className="text-[10px] py-1 px-2"
                            >
                              Delivered
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedOrder(ord);
                              setInvoiceModalOpen(true);
                            }}
                            className="text-[10px] py-1 px-2"
                          >
                            <Icon name="invoice" className="mr-1" />
                            Invoice
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 3. PRODUCTS TAB */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <Input
                  name="productSearch"
                  placeholder="Search products by title or SKU..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="text-xs py-2"
                />
                <Button variant="outline" size="sm" onClick={loadTabData} className="text-xs">
                  Search
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="/api/v1/admin/products/export-csv/"
                  download
                  className="inline-flex items-center gap-1.5 bg-surface-subtle border border-surface-border px-3 py-2 rounded-sm text-xs font-bold text-brand-ink hover:bg-surface-accent"
                >
                  <Icon name="invoice" className="text-xs" />
                  <span>Export CSV</span>
                </a>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setNewProductModalOpen(true)}
                  className="text-xs"
                >
                  + Add Product
                </Button>
              </div>
            </div>

            {/* Products Table */}
            <div className="bg-white border border-surface-border rounded-lg shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-surface-subtle border-b border-surface-border uppercase font-bold text-ink-muted">
                      <th className="p-3">Product Name</th>
                      <th className="p-3">SKU</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Price (PKR)</th>
                      <th className="p-3">Stock Units</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Quick Edit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {products.map((p) => (
                      <tr key={p.id} className="hover:bg-surface-subtle">
                        <td className="p-3 font-bold text-brand-ink">
                          <div>{p.name}</div>
                          <span className="text-[10px] text-ink-muted uppercase">{p.product_type}</span>
                        </td>
                        <td className="p-3 text-ink-muted">{p.sku}</td>
                        <td className="p-3">{p.category_name}</td>
                        <td className="p-3 font-semibold">Rs. {Number(p.price).toLocaleString()}</td>
                        <td className="p-3">
                          {p.stock <= 0 ? (
                            <span className="text-red-600 font-bold">0 (Out of stock)</span>
                          ) : (
                            <span>{p.stock} units</span>
                          )}
                        </td>
                        <td className="p-3">
                          <Badge variant={p.is_active ? 'pill' : 'default'}>
                            {p.is_active ? 'Active' : 'Hidden'}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingProduct(p)}
                            className="text-[10px] py-1 px-2.5"
                          >
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 4. CATEGORIES TAB */}
        {activeTab === 'categories' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-4 bg-surface-subtle border border-surface-border rounded-lg p-6 shadow-card self-start">
              <h2 className="text-xs font-bold uppercase tracking-wider text-brand-ink mb-4">
                Add New Category
              </h2>
              <form onSubmit={handleCreateCategory} className="space-y-4">
                <Input
                  label="Category Name"
                  name="catName"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g. Brain & Focus"
                  required
                />
                <Button type="submit" variant="primary" size="sm" className="w-full">
                  Create Category
                </Button>
              </form>
            </div>

            <div className="md:col-span-8 bg-white border border-surface-border rounded-lg shadow-card overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-surface-subtle border-b border-surface-border uppercase font-bold text-ink-muted">
                    <th className="p-3">Category Name</th>
                    <th className="p-3">Slug</th>
                    <th className="p-3">Products Count</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {categories.map((c) => (
                    <tr key={c.id}>
                      <td className="p-3 font-bold text-brand-ink">{c.name}</td>
                      <td className="p-3 text-ink-muted">{c.slug}</td>
                      <td className="p-3 font-semibold">{c.products_count}</td>
                      <td className="p-3">
                        <Badge variant={c.is_active ? 'pill' : 'default'}>Active</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 5. COUPONS TAB */}
        {activeTab === 'coupons' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-4 bg-surface-subtle border border-surface-border rounded-lg p-6 shadow-card self-start">
              <h2 className="text-xs font-bold uppercase tracking-wider text-brand-ink mb-4">
                Create Discount Coupon
              </h2>
              <form onSubmit={handleCreateCoupon} className="space-y-4">
                <Input
                  label="Coupon Code"
                  name="code"
                  value={newCouponCode}
                  onChange={(e) => setNewCouponCode(e.target.value)}
                  placeholder="e.g. SUMMER15"
                  className="uppercase"
                  required
                />
                <Input
                  label="Discount Percentage (%)"
                  name="discount"
                  type="number"
                  value={newCouponDiscount}
                  onChange={(e) => setNewCouponDiscount(e.target.value)}
                  required
                />
                <Button type="submit" variant="primary" size="sm" className="w-full">
                  Create Coupon
                </Button>
              </form>
            </div>

            <div className="md:col-span-8 bg-white border border-surface-border rounded-lg shadow-card overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-surface-subtle border-b border-surface-border uppercase font-bold text-ink-muted">
                    <th className="p-3">Code</th>
                    <th className="p-3">Discount</th>
                    <th className="p-3">Times Used</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {coupons.map((c) => (
                    <tr key={c.id}>
                      <td className="p-3 font-bold text-brand-green uppercase">{c.code}</td>
                      <td className="p-3">{c.discount_value}%</td>
                      <td className="p-3">{c.times_used}</td>
                      <td className="p-3">
                        <Badge variant={c.is_active ? 'pill' : 'default'}>
                          {c.is_active ? 'Active' : 'Disabled'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 6. CUSTOMERS TAB */}
        {activeTab === 'customers' && (
          <div className="bg-white border border-surface-border rounded-lg shadow-card overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-subtle border-b border-surface-border uppercase font-bold text-ink-muted">
                  <th className="p-3">Customer Name</th>
                  <th className="p-3">Email Address</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Joined Date</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td className="p-3 font-bold text-brand-ink">{c.full_name || 'Customer'}</td>
                    <td className="p-3">{c.email}</td>
                    <td className="p-3 text-ink-muted">{c.phone || 'N/A'}</td>
                    <td className="p-3">{new Date(c.date_joined).toLocaleDateString()}</td>
                    <td className="p-3">
                      <Badge variant={c.is_active ? 'pill' : 'default'}>
                        {c.is_active ? 'Active' : 'Blocked'}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        variant={c.is_active ? 'danger' : 'outline'}
                        size="sm"
                        onClick={() => handleToggleCustomer(c.id)}
                        className="text-[10px] py-1 px-2.5"
                      >
                        {c.is_active ? 'Block' : 'Unblock'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 7. REVIEWS TAB */}
        {activeTab === 'reviews' && (
          <div className="bg-white border border-surface-border rounded-lg shadow-card overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-subtle border-b border-surface-border uppercase font-bold text-ink-muted">
                  <th className="p-3">Product</th>
                  <th className="p-3">Rating & Title</th>
                  <th className="p-3">Review Body</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Moderation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {reviews.map((r) => (
                  <tr key={r.id}>
                    <td className="p-3 font-bold text-brand-ink">{r.product_name}</td>
                    <td className="p-3">
                      <div className="font-semibold text-amber-500">{r.rating} / 5 Stars</div>
                      <div className="font-bold text-brand-ink">{r.title}</div>
                    </td>
                    <td className="p-3 text-ink-muted max-w-sm truncate">{r.content}</td>
                    <td className="p-3">
                      <Badge variant={r.is_approved ? 'pill' : 'sale'}>
                        {r.is_approved ? 'Approved' : 'Pending'}
                      </Badge>
                    </td>
                    <td className="p-3 text-right space-x-1.5">
                      {!r.is_approved ? (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleModerateReview(r.id, true)}
                          className="text-[10px] py-1 px-2"
                        >
                          Approve
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleModerateReview(r.id, false)}
                          className="text-[10px] py-1 px-2 text-red-600"
                        >
                          Reject
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 8. MESSAGES TAB */}
        {activeTab === 'messages' && (
          <div className="bg-white border border-surface-border rounded-lg shadow-card overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-subtle border-b border-surface-border uppercase font-bold text-ink-muted">
                  <th className="p-3">Sender</th>
                  <th className="p-3">Subject</th>
                  <th className="p-3">Message</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {messages.map((m) => (
                  <tr key={m.id}>
                    <td className="p-3 font-bold text-brand-ink">
                      <div>{m.name}</div>
                      <div className="text-[10px] text-ink-muted">{m.email} ({m.phone})</div>
                    </td>
                    <td className="p-3 font-semibold">{m.subject}</td>
                    <td className="p-3 text-ink-muted max-w-xs truncate">{m.message}</td>
                    <td className="p-3">
                      <Badge variant={m.is_read ? 'pill' : 'default'}>
                        {m.is_read ? 'Read' : 'New'}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      {!m.is_read && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkMessageRead(m.id)}
                          className="text-[10px] py-1 px-2"
                        >
                          Mark Read
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 9. BOT & IP SECURITY TAB */}
        {activeTab === 'security' && (
          <div className="space-y-8">
            {/* Unblock IP Control */}
            <div className="bg-surface-subtle border border-surface-border rounded-lg p-5 shadow-card max-w-md">
              <h2 className="text-xs font-bold uppercase tracking-wider text-brand-ink mb-3">
                Manual IP Unblock
              </h2>
              <div className="flex gap-2">
                <Input
                  name="ip"
                  placeholder="Enter blocked IP address"
                  value={unblockIPInput}
                  onChange={(e) => setUnblockIPInput(e.target.value)}
                  className="text-xs py-2"
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleUnblockIP(unblockIPInput)}
                  className="text-xs whitespace-nowrap"
                >
                  Unblock
                </Button>
              </div>
            </div>

            {/* Blocked IP Table */}
            <div className="bg-white border border-surface-border rounded-lg shadow-card overflow-hidden">
              <div className="p-3 bg-surface-subtle border-b border-surface-border font-bold text-xs uppercase tracking-wider text-brand-ink">
                Currently Blocked IP Addresses ({securityLogs.blocked_ips?.length || 0})
              </div>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-surface-subtle border-b border-surface-border uppercase font-bold text-ink-muted">
                    <th className="p-3">IP Address</th>
                    <th className="p-3">Block Reason</th>
                    <th className="p-3">Blocked At</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {securityLogs.blocked_ips?.map((b) => (
                    <tr key={b.id}>
                      <td className="p-3 font-bold text-red-600 font-mono">{b.ip_address}</td>
                      <td className="p-3 text-ink-muted">{b.reason}</td>
                      <td className="p-3">{new Date(b.created_at).toLocaleDateString()}</td>
                      <td className="p-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnblockIP(b.ip_address)}
                          className="text-[10px] py-1 px-2 text-green-700"
                        >
                          Unblock
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bot Telemetry Events */}
            <div className="bg-white border border-surface-border rounded-lg shadow-card overflow-hidden">
              <div className="p-3 bg-surface-subtle border-b border-surface-border font-bold text-xs uppercase tracking-wider text-brand-ink">
                Recent Bot & Honeypot Telemetry Events
              </div>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-surface-subtle border-b border-surface-border uppercase font-bold text-ink-muted">
                    <th className="p-3">Triggered Event</th>
                    <th className="p-3">IP Address</th>
                    <th className="p-3">Details</th>
                    <th className="p-3">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {securityLogs.bot_events?.map((ev) => (
                    <tr key={ev.id}>
                      <td className="p-3 font-bold text-brand-ink">{ev.event_type}</td>
                      <td className="p-3 font-mono text-ink-muted">{ev.ip_address}</td>
                      <td className="p-3 text-ink-muted">{ev.details}</td>
                      <td className="p-3 text-ink-muted">{new Date(ev.created_at).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Quick Edit Product Modal */}
      {editingProduct && (
        <Modal
          isOpen={!!editingProduct}
          onClose={() => setEditingProduct(null)}
          title={`Edit Product: ${editingProduct.name}`}
        >
          <div className="space-y-4 text-xs">
            <Input
              label="Price in PKR"
              name="price"
              type="number"
              value={editingProduct.price}
              onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
              required
            />
            <Input
              label="Stock Units"
              name="stock"
              type="number"
              value={editingProduct.stock}
              onChange={(e) => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })}
              required
            />
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="active-toggle"
                checked={editingProduct.is_active}
                onChange={(e) => setEditingProduct({ ...editingProduct, is_active: e.target.checked })}
                className="h-4 w-4 text-brand-green"
              />
              <label htmlFor="active-toggle" className="font-semibold text-brand-ink">
                Active & Visible in Catalog
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-surface-border">
              <Button variant="outline" size="sm" onClick={() => setEditingProduct(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveProductEdit}>
                Save Changes
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Invoice Modal */}
      {selectedOrder && (
        <Modal
          isOpen={invoiceModalOpen}
          onClose={() => setInvoiceModalOpen(false)}
          title={`COD Invoice - Order #${selectedOrder.order_number}`}
        >
          <div className="space-y-4 text-xs text-brand-ink print:p-0">
            <div className="border-b border-surface-border pb-3 flex justify-between">
              <div>
                <strong className="block text-sm">Supplivix Beauty & Wellness</strong>
                <span className="text-ink-muted text-[11px]">Cash on Delivery Official Invoice</span>
              </div>
              <div className="text-right">
                <span className="font-bold">Order #{selectedOrder.order_number}</span>
              </div>
            </div>

            <div className="bg-surface-subtle p-3 rounded-md border border-surface-border text-[11px]">
              <span className="font-bold block mb-1">Customer & Delivery:</span>
              <div>{selectedOrder.recipient_name} ({selectedOrder.phone})</div>
              <div>{selectedOrder.street_address}, {selectedOrder.city}, {selectedOrder.province}</div>
            </div>

            <div className="pt-2 flex justify-between font-bold text-sm border-t border-surface-border">
              <span>Payable to Courier Rider:</span>
              <span className="text-brand-green">Rs. {Number(selectedOrder.grand_total).toLocaleString()}</span>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-surface-border">
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                Print Invoice
              </Button>
              <Button variant="primary" size="sm" onClick={() => setInvoiceModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add New Product Modal */}
      {newProductModalOpen && (
        <Modal
          isOpen={newProductModalOpen}
          onClose={() => setNewProductModalOpen(false)}
          title="Add New Catalog Product"
        >
          <form onSubmit={handleCreateProduct} className="space-y-3.5 text-xs">
            <Input
              label="Product Name"
              name="name"
              value={newProductData.name}
              onChange={(e) => setNewProductData({ ...newProductData, name: e.target.value })}
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Price (PKR)"
                name="price"
                type="number"
                value={newProductData.price}
                onChange={(e) => setNewProductData({ ...newProductData, price: e.target.value })}
                required
              />
              <Input
                label="Stock Quantity"
                name="stock"
                type="number"
                value={newProductData.stock}
                onChange={(e) => setNewProductData({ ...newProductData, stock: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-brand-ink mb-1">Product Type</label>
              <select
                value={newProductData.product_type}
                onChange={(e) => setNewProductData({ ...newProductData, product_type: e.target.value })}
                className="w-full bg-white border border-surface-border rounded-sm p-2 text-xs"
              >
                <option value="multivitamin">Multivitamin (Flagship Focus)</option>
                <option value="skincare">Skincare Formulation</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-surface-border">
              <Button variant="outline" size="sm" onClick={() => setNewProductModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Create Product
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
