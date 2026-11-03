import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  { key: 'overview', label: 'Overview', icon: 'chart' },
  { key: 'orders', label: 'Orders (COD)', icon: 'cod' },
  { key: 'products', label: 'Products', icon: 'box' },
  { key: 'categories', label: 'Categories', icon: 'tag' },
  { key: 'coupons', label: 'Coupons', icon: 'bolt' },
  { key: 'settings', label: 'Shipping & Settings', icon: 'sliders' },
  { key: 'customers', label: 'Customers', icon: 'user' },
  { key: 'reviews', label: 'Reviews', icon: 'star' },
  { key: 'messages', label: 'Messages & Waitlist', icon: 'envelope' },
  { key: 'security', label: 'Bot & IP Security', icon: 'shield' },
  { key: 'audit', label: 'Audit Trail', icon: 'clock' },
];

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('overview');
  const [_loading, setLoading] = useState(false);
  const csvFileInputRef = useRef(null);

  // 1. Overview state
  const [overview, setOverview] = useState({
    total_revenue: 0,
    total_orders_count: 0,
    today_orders_count: 0,
    today_revenue: 0,
    thirty_day_orders_count: 0,
    thirty_day_revenue: 0,
    cod_pending_amount: 0,
    pending_dispatch_count: 0,
    out_of_stock_count: 0,
    new_users_count: 0,
    orders_by_status: {},
    low_stock_list: [],
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
  const [transitionModalOpen, setTransitionModalOpen] = useState(false);
  const [targetOrderNumber, setTargetOrderNumber] = useState('');
  const [targetOrderStatus, setTargetOrderStatus] = useState('');
  const [transitionNote, setTransitionNote] = useState('');

  // 3. Products state
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('');
  const [productTypeFilter, setProductTypeFilter] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState([]);
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
    sku: '',
    brand: 'Supplivix',
    short_description: '',
    description: '',
    seo_title: '',
    seo_description: '',
  });

  // Product Images & FAQs sub-modals
  const [imageModalProduct, setImageModalProduct] = useState(null);
  const [uploadImageFile, setUploadImageFile] = useState(null);
  const [uploadAltText, setUploadAltText] = useState('');
  const [faqModalProduct, setFaqModalProduct] = useState(null);
  const [newFaqQuestion, setNewFaqQuestion] = useState('');
  const [newFaqAnswer, setNewFaqAnswer] = useState('');

  // 4. Categories state
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategorySlug, setNewCategorySlug] = useState('');
  const [newCategoryParent, setNewCategoryParent] = useState('');
  const [newCategoryOrder, setNewCategoryOrder] = useState('0');

  // 5. Coupons state
  const [coupons, setCoupons] = useState([]);
  const [newCouponData, setNewCouponData] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: '10',
    min_order_amount: '0',
    max_discount_amount: '',
    usage_limit: '',
    is_active: true,
  });
  const [redemptionsModalOpen, setRedemptionsModalOpen] = useState(false);
  const [couponRedemptions, setCouponRedemptions] = useState([]);
  const [activeCouponCode, setActiveCouponCode] = useState('');

  // 6. Settings state
  const [settingsData, setSettingsData] = useState({
    free_shipping_threshold: '2000',
    flat_shipping_fee: '200',
    store_phone: '+92 300 0000000',
    store_email: 'care@supplivix.pk',
    corporate_address: 'Supplivix Labs, Clifton Block 4, Karachi, Pakistan',
    site_mode: 'live',
    launch_date: '',
  });

  // 7. Customers state
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerOrdersModalOpen, setCustomerOrdersModalOpen] = useState(false);
  const [selectedCustomerInfo, setSelectedCustomerInfo] = useState({ email: '', orders: [] });

  // 8. Reviews state
  const [reviews, setReviews] = useState([]);

  // 9. Messages & Waitlist state
  const [messagesTab, setMessagesTab] = useState('inquiries');
  const [messages, setMessages] = useState([]);
  const [waitlistEntries, setWaitlistEntries] = useState([]);

  // 10. Security state
  const [securityLogs, setSecurityLogs] = useState({ bot_events: [], blocked_ips: [], failed_logins: [] });
  const [unblockIPInput, setUnblockIPInput] = useState('');
  const [manualBlockData, setManualBlockData] = useState({ ip: '', reason: 'Suspicious bot traffic', hours: '24' });

  // 11. Audit logs state
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);

  // Verify staff access
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
        const params = {};
        if (productSearch) params.search = productSearch;
        if (productCategoryFilter) params.category = productCategoryFilter;
        if (productTypeFilter) params.product_type = productTypeFilter;
        const data = await api.getAdminProducts(params);
        setProducts(data.results || []);
      } else if (activeTab === 'categories') {
        const data = await api.getAdminCategories();
        setCategories(data.results || []);
      } else if (activeTab === 'coupons') {
        const data = await api.getAdminCoupons();
        setCoupons(data.results || []);
      } else if (activeTab === 'settings') {
        const data = await api.getAdminSettings();
        setSettingsData({
          free_shipping_threshold: String(data.free_shipping_threshold || 2000),
          flat_shipping_fee: String(data.flat_shipping_fee || 200),
          store_phone: data.store_phone || '',
          store_email: data.store_email || '',
          corporate_address: data.corporate_address || '',
          site_mode: data.site_mode || 'live',
          launch_date: data.launch_date || '',
        });
      } else if (activeTab === 'customers') {
        const params = {};
        if (customerSearch) params.search = customerSearch;
        const data = await api.getAdminCustomers(params);
        setCustomers(data.results || []);
      } else if (activeTab === 'reviews') {
        const data = await api.getAdminReviews();
        setReviews(data.results || []);
      } else if (activeTab === 'messages') {
        const [msgData, waitData] = await Promise.all([
          api.getAdminMessages(),
          api.getAdminWaitlist(),
        ]);
        setMessages(msgData.results || []);
        setWaitlistEntries(waitData.results || []);
      } else if (activeTab === 'security') {
        const data = await api.getAdminSecurityLogs();
        setSecurityLogs(data);
      } else if (activeTab === 'audit') {
        const data = await api.getAdminAuditLogs({ page: auditPage });
        setAuditLogs(data.results || []);
        setAuditTotalPages(data.total_pages || 1);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, [
    activeTab,
    orderSearch,
    orderStatusFilter,
    productSearch,
    productCategoryFilter,
    productTypeFilter,
    customerSearch,
    auditPage,
  ]);

  useEffect(() => {
    if (user?.is_staff) {
      loadTabData();
    }
  }, [user, activeTab, loadTabData]);

  // ============================================================================
  // ORDERS HANDLERS
  // ============================================================================
  const openTransitionModal = (number, nextStatus) => {
    setTargetOrderNumber(number);
    setTargetOrderStatus(nextStatus);
    setTransitionNote('');
    setTransitionModalOpen(true);
  };

  const handleConfirmTransition = async () => {
    if (!targetOrderNumber || !targetOrderStatus) return;
    try {
      await api.transitionAdminOrder(targetOrderNumber, targetOrderStatus, transitionNote);
      showToast(`Order #${targetOrderNumber} updated to ${targetOrderStatus}.`);
      setTransitionModalOpen(false);
      loadTabData();
    } catch (err) {
      showToast(err.message || 'Transition not allowed.', 'error');
    }
  };

  const handleMarkCODCollected = async (number) => {
    try {
      await api.markAdminOrderCODCollected(number);
      showToast(`Payment collected and recorded for Order #${number}.`);
      loadTabData();
    } catch (err) {
      showToast(err.message || 'Could not update COD status.', 'error');
    }
  };

  const handleCopyAddress = (order) => {
    const text = `${order.recipient_name}, ${order.street_address}, ${order.city}, ${order.province} (Phone: ${order.phone})`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToast('Customer delivery address copied to clipboard!');
    }
  };

  // ============================================================================
  // PRODUCTS HANDLERS
  // ============================================================================
  const handleSelectProduct = (id) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllProducts = () => {
    if (selectedProductIds.length === products.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(products.map((p) => p.id));
    }
  };

  const handleBulkStatusChange = async (isActive) => {
    if (selectedProductIds.length === 0) return;
    try {
      const res = await api.bulkUpdateProductStatus(selectedProductIds, isActive);
      showToast(res.message);
      setSelectedProductIds([]);
      loadTabData();
    } catch (err) {
      showToast(err.message || 'Bulk status update failed.', 'error');
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...newProductData,
        price: Number(newProductData.price),
        compare_at_price: newProductData.compare_at_price ? Number(newProductData.compare_at_price) : null,
        stock: Number(newProductData.stock),
        category_id: newProductData.category_id ? Number(newProductData.category_id) : null,
      };
      await api.createAdminProduct(payload);
      showToast('Product created successfully.');
      setNewProductModalOpen(false);
      setNewProductData({
        name: '',
        slug: '',
        price: '',
        compare_at_price: '',
        stock: '',
        product_type: 'multivitamin',
        category_id: '',
        sku: '',
        brand: 'Supplivix',
        short_description: '',
        description: '',
        seo_title: '',
        seo_description: '',
      });
      loadTabData();
    } catch (err) {
      showToast(err.message || 'Could not create product.', 'error');
    }
  };

  const handleSaveProductEdit = async () => {
    if (!editingProduct) return;
    try {
      await api.updateAdminProduct(editingProduct.id, {
        name: editingProduct.name,
        price: Number(editingProduct.price),
        compare_at_price: editingProduct.compare_at_price ? Number(editingProduct.compare_at_price) : null,
        stock: Number(editingProduct.stock),
        is_active: editingProduct.is_active,
        is_featured: editingProduct.is_featured,
        product_type: editingProduct.product_type,
        seo_title: editingProduct.seo_title || '',
        seo_description: editingProduct.seo_description || '',
      });
      showToast('Product updated successfully.');
      setEditingProduct(null);
      loadTabData();
    } catch (err) {
      showToast(err.message || 'Could not update product.', 'error');
    }
  };

  const handleDeleteProduct = async (id, name) => {
    if (!window.confirm(`Permanently delete "${name}" from catalog?`)) return;
    try {
      await api.deleteAdminProduct(id);
      showToast(`Product "${name}" deleted.`);
      loadTabData();
    } catch (err) {
      showToast(err.message || 'Could not delete product.', 'error');
    }
  };

  const handleCSVImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new window.FormData();
    formData.append('file', file);
    try {
      const res = await api.importAdminProductsCSV(formData);
      showToast(res.message);
      loadTabData();
    } catch (err) {
      showToast(err.message || 'CSV Import failed.', 'error');
    } finally {
      if (csvFileInputRef.current) csvFileInputRef.current.value = '';
    }
  };

  // Product Image upload
  const handleUploadProductImage = async (e) => {
    e.preventDefault();
    if (!imageModalProduct || !uploadImageFile) return;
    const formData = new window.FormData();
    formData.append('image', uploadImageFile);
    formData.append('alt_text', uploadAltText || imageModalProduct.name);
    try {
      await api.uploadProductImage(imageModalProduct.id, formData);
      showToast('Product image uploaded successfully.');
      setUploadImageFile(null);
      setUploadAltText('');
      // Refresh product images
      const fresh = await api.getAdminProductDetail(imageModalProduct.id);
      setImageModalProduct(fresh);
      loadTabData();
    } catch (err) {
      showToast(err.message || 'Image upload failed.', 'error');
    }
  };

  const handleDeleteProductImage = async (imageId) => {
    if (!imageModalProduct) return;
    try {
      await api.deleteProductImage(imageModalProduct.id, imageId);
      showToast('Image deleted.');
      const fresh = await api.getAdminProductDetail(imageModalProduct.id);
      setImageModalProduct(fresh);
      loadTabData();
    } catch (err) {
      showToast(err.message || 'Could not delete image.', 'error');
    }
  };

  // Product FAQs (AEO)
  const handleAddProductFAQ = async (e) => {
    e.preventDefault();
    if (!faqModalProduct || !newFaqQuestion.trim() || !newFaqAnswer.trim()) return;
    try {
      await api.addProductFAQ(faqModalProduct.id, {
        question: newFaqQuestion.trim(),
        answer: newFaqAnswer.trim(),
      });
      showToast('FAQ added to product knowledge base.');
      setNewFaqQuestion('');
      setNewFaqAnswer('');
      const fresh = await api.getAdminProductDetail(faqModalProduct.id);
      setFaqModalProduct(fresh);
    } catch (err) {
      showToast(err.message || 'Could not add FAQ.', 'error');
    }
  };

  const handleDeleteProductFAQ = async (faqId) => {
    if (!faqModalProduct) return;
    try {
      await api.deleteProductFAQ(faqModalProduct.id, faqId);
      showToast('FAQ deleted.');
      const fresh = await api.getAdminProductDetail(faqModalProduct.id);
      setFaqModalProduct(fresh);
    } catch (err) {
      showToast(err.message || 'Could not delete FAQ.', 'error');
    }
  };

  // ============================================================================
  // CATEGORIES HANDLERS
  // ============================================================================
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      await api.createAdminCategory({
        name: newCategoryName.trim(),
        slug: newCategorySlug.trim() || undefined,
        parent_id: newCategoryParent ? Number(newCategoryParent) : null,
        sort_order: Number(newCategoryOrder) || 0,
      });
      showToast('Category created successfully.');
      setNewCategoryName('');
      setNewCategorySlug('');
      setNewCategoryParent('');
      setNewCategoryOrder('0');
      loadTabData();
    } catch (err) {
      showToast(err.message || 'Could not create category.', 'error');
    }
  };

  const handleDeleteCategory = async (id, name) => {
    if (!window.confirm(`Delete category "${name}"?`)) return;
    try {
      await api.deleteAdminCategory(id);
      showToast(`Category "${name}" deleted.`);
      loadTabData();
    } catch (err) {
      showToast(err.message || 'Could not delete category.', 'error');
    }
  };

  // ============================================================================
  // COUPONS HANDLERS
  // ============================================================================
  const handleGenerateRandomCode = async () => {
    try {
      const res = await api.generateAdminCouponCode('SPLV');
      setNewCouponData((prev) => ({ ...prev, code: res.code }));
    } catch {
      showToast('Could not generate random code.', 'error');
    }
  };

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    if (!newCouponData.code.trim()) return;
    try {
      await api.createAdminCoupon({
        code: newCouponData.code.trim().toUpperCase(),
        discount_type: newCouponData.discount_type,
        discount_value: Number(newCouponData.discount_value),
        min_order_amount: Number(newCouponData.min_order_amount) || 0,
        max_discount_amount: newCouponData.max_discount_amount ? Number(newCouponData.max_discount_amount) : null,
        usage_limit: newCouponData.usage_limit ? Number(newCouponData.usage_limit) : null,
        is_active: newCouponData.is_active,
      });
      showToast('Coupon created successfully.');
      setNewCouponData({
        code: '',
        discount_type: 'percentage',
        discount_value: '10',
        min_order_amount: '0',
        max_discount_amount: '',
        usage_limit: '',
        is_active: true,
      });
      loadTabData();
    } catch (err) {
      showToast(err.message || 'Could not create coupon.', 'error');
    }
  };

  const handleViewCouponRedemptions = async (coupon) => {
    try {
      const res = await api.getAdminCouponRedemptions(coupon.id);
      setActiveCouponCode(coupon.code);
      setCouponRedemptions(res.results || []);
      setRedemptionsModalOpen(true);
    } catch (err) {
      showToast(err.message || 'Could not load redemptions.', 'error');
    }
  };

  const handleDeleteCoupon = async (id, code) => {
    if (!window.confirm(`Delete coupon "${code}"?`)) return;
    try {
      await api.deleteAdminCoupon(id);
      showToast(`Coupon "${code}" deleted.`);
      loadTabData();
    } catch (err) {
      showToast(err.message || 'Could not delete coupon.', 'error');
    }
  };

  // ============================================================================
  // SETTINGS HANDLERS
  // ============================================================================
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      await api.updateAdminSettings({
        free_shipping_threshold: Number(settingsData.free_shipping_threshold),
        flat_shipping_fee: Number(settingsData.flat_shipping_fee),
        store_phone: settingsData.store_phone.trim(),
        store_email: settingsData.store_email.trim(),
        corporate_address: settingsData.corporate_address.trim(),
        site_mode: settingsData.site_mode,
        launch_date: settingsData.launch_date,
      });
      showToast('Store settings saved successfully.');
      loadTabData();
    } catch (err) {
      showToast(err.message || 'Could not save settings.', 'error');
    }
  };

  // ============================================================================
  // CUSTOMERS HANDLERS
  // ============================================================================
  const handleViewCustomerOrders = async (cust) => {
    try {
      const res = await api.getAdminCustomerOrders(cust.id);
      setSelectedCustomerInfo({ email: cust.email, orders: res.results || [] });
      setCustomerOrdersModalOpen(true);
    } catch (err) {
      showToast(err.message || 'Could not load customer orders.', 'error');
    }
  };

  const handleToggleCustomer = async (id) => {
    try {
      const res = await api.toggleAdminCustomer(id);
      showToast(res.message);
      loadTabData();
    } catch (err) {
      showToast(err.message || 'Could not toggle customer status.', 'error');
    }
  };

  // ============================================================================
  // REVIEWS HANDLERS
  // ============================================================================
  const handleModerateReview = async (id, approved) => {
    try {
      await api.moderateAdminReview(id, approved);
      showToast(`Review ${approved ? 'approved' : 'rejected'}.`);
      loadTabData();
    } catch (err) {
      showToast(err.message || 'Could not moderate review.', 'error');
    }
  };

  const handleDeleteReview = async (id) => {
    if (!window.confirm('Delete this review permanently?')) return;
    try {
      await api.deleteAdminReview(id);
      showToast('Review deleted.');
      loadTabData();
    } catch (err) {
      showToast(err.message || 'Could not delete review.', 'error');
    }
  };

  // ============================================================================
  // MESSAGES & WAITLIST HANDLERS
  // ============================================================================
  const handleToggleMessageHandled = async (id) => {
    try {
      const res = await api.toggleAdminMessageHandled(id);
      showToast(res.message);
      loadTabData();
    } catch (err) {
      showToast(err.message || 'Could not update message.', 'error');
    }
  };

  // ============================================================================
  // BOT & SECURITY HANDLERS
  // ============================================================================
  const handleManualBlockIP = async (e) => {
    e.preventDefault();
    if (!manualBlockData.ip.trim()) return;
    try {
      await api.blockAdminIP({
        ip: manualBlockData.ip.trim(),
        reason: manualBlockData.reason.trim(),
        hours: Number(manualBlockData.hours),
      });
      showToast(`IP ${manualBlockData.ip} blocked.`);
      setManualBlockData({ ip: '', reason: 'Suspicious bot traffic', hours: '24' });
      loadTabData();
    } catch (err) {
      showToast(err.message || 'Could not block IP.', 'error');
    }
  };

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

  // ============================================================================
  // REVENUE LINE CHART HELPER (SVG)
  // ============================================================================
  const renderRevenueLineChart = () => {
    const data = overview.sales_timeline || [];
    if (data.length === 0) {
      return (
        <div className="py-8 text-center text-xs text-ink-muted">
          No sales timeline data recorded yet.
        </div>
      );
    }

    const width = 800;
    const height = 180;
    const padding = 35;
    const maxRevenue = Math.max(...data.map((d) => d.revenue), 1000);

    const points = data.map((d, index) => {
      const x = padding + (index / (data.length - 1)) * (width - 2 * padding);
      const y = height - padding - (d.revenue / maxRevenue) * (height - 2 * padding);
      return { x, y, ...d };
    });

    const pointsString = points.map((p) => `${p.x},${p.y}`).join(' ');

    return (
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[600px] select-none"
          aria-label="30-day revenue line chart"
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = height - padding - ratio * (height - 2 * padding);
            const val = Math.round(ratio * maxRevenue);
            return (
              <g key={i}>
                <line
                  x1={padding}
                  y1={y}
                  x2={width - padding}
                  y2={y}
                  stroke="#e8e8e8"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <text
                  x={padding - 6}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="9"
                  fill="#767676"
                  fontFamily="sans-serif"
                >
                  Rs. {val >= 1000 ? `${Math.round(val / 1000)}k` : val}
                </text>
              </g>
            );
          })}

          {/* Polyline */}
          <polyline
            fill="none"
            stroke="#1b365d"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={pointsString}
          />

          {/* Data points */}
          {points.map((p, idx) => (
            <circle
              key={idx}
              cx={p.x}
              cy={p.y}
              r="3.5"
              fill="#2e7d32"
              stroke="#ffffff"
              strokeWidth="1.5"
            >
              <title>{`${p.date}: Rs. ${Number(p.revenue).toLocaleString()} (${p.orders_count} orders)`}</title>
            </circle>
          ))}

          {/* Date labels (first, middle, last) */}
          {points.length > 0 && (
            <>
              <text
                x={points[0].x}
                y={height - 10}
                fontSize="9"
                fill="#767676"
                textAnchor="start"
              >
                {points[0].date}
              </text>
              <text
                x={points[Math.floor(points.length / 2)].x}
                y={height - 10}
                fontSize="9"
                fill="#767676"
                textAnchor="middle"
              >
                {points[Math.floor(points.length / 2)].date}
              </text>
              <text
                x={points[points.length - 1].x}
                y={height - 10}
                fontSize="9"
                fill="#767676"
                textAnchor="end"
              >
                {points[points.length - 1].date}
              </text>
            </>
          )}
        </svg>
      </div>
    );
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

      {/* Main Container */}
      <div className="max-w-site mx-auto px-4 sm:px-6 py-8">
        {/* Navigation Tabs Strip */}
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

        {/* ================================================================== */}
        {/* 1. OVERVIEW TAB */}
        {/* ================================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Top KPI Cards */}
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
                  Today Revenue & Orders
                </span>
                <span className="text-2xl font-bold text-brand-ink block">
                  Rs. {Number(overview.today_revenue).toLocaleString()}
                </span>
                <span className="text-[11px] text-ink-muted mt-1 block">
                  {overview.today_orders_count} orders placed today
                </span>
              </div>

              <div className="bg-surface-subtle border border-surface-border rounded-lg p-5 shadow-card">
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted block mb-1">
                  30-Day Revenue & Volume
                </span>
                <span className="text-2xl font-bold text-brand-ink block">
                  Rs. {Number(overview.thirty_day_revenue).toLocaleString()}
                </span>
                <span className="text-[11px] text-ink-muted mt-1 block">
                  {overview.thirty_day_orders_count} orders in 30 days
                </span>
              </div>

              <div className="bg-surface-subtle border border-surface-border rounded-lg p-5 shadow-card">
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted block mb-1">
                  COD Pending Collection
                </span>
                <span className="text-2xl font-bold text-amber-700 block">
                  Rs. {Number(overview.cod_pending_amount).toLocaleString()}
                </span>
                <span className="text-[11px] text-ink-muted mt-1 block">
                  In transit with courier riders
                </span>
              </div>
            </div>

            {/* Secondary KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white border border-surface-border rounded-lg p-4 shadow-card">
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted block mb-1">
                  Total Orders Placed
                </span>
                <span className="text-xl font-bold text-brand-ink block">
                  {overview.total_orders_count} orders
                </span>
                <span className="text-[11px] text-ink-muted mt-0.5 block">100% Cash on Delivery</span>
              </div>

              <div className="bg-white border border-surface-border rounded-lg p-4 shadow-card">
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted block mb-1">
                  Pending Dispatch
                </span>
                <span className="text-xl font-bold text-amber-600 block">
                  {overview.pending_dispatch_count}
                </span>
                <span className="text-[11px] text-ink-muted mt-0.5 block">Awaiting courier pickup</span>
              </div>

              <div className="bg-white border border-surface-border rounded-lg p-4 shadow-card">
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted block mb-1">
                  Out of Stock Alert
                </span>
                <span className="text-xl font-bold text-red-600 block">
                  {overview.out_of_stock_count} products
                </span>
                <span className="text-[11px] text-ink-muted mt-0.5 block">Immediate restocking required</span>
              </div>
            </div>

            {/* Orders By Status Grid */}
            <div className="bg-surface-subtle border border-surface-border rounded-lg p-5 shadow-card">
              <h2 className="text-xs font-bold uppercase tracking-wider text-brand-ink mb-3">
                Orders Breakdown by Operational Status
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-center text-xs">
                {Object.entries(overview.orders_by_status || {}).map(([st, cnt]) => (
                  <div key={st} className="bg-white border border-surface-border p-2.5 rounded-md shadow-sm">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-ink-muted truncate mb-1">
                      {st.replace('_', ' ')}
                    </span>
                    <span className="block text-base font-bold text-brand-ink">{cnt}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 30-Day Revenue Line Chart */}
            <div className="bg-surface-subtle border border-surface-border rounded-lg p-6 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-brand-ink">
                  30-Day Revenue Timeline
                </h2>
                <span className="text-[11px] text-ink-muted font-medium">PKR Revenue per day</span>
              </div>
              {renderRevenueLineChart()}
            </div>

            {/* Low-Stock Alert & Top Products side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Low Stock Alert Table */}
              <div className="bg-white border border-surface-border rounded-lg shadow-card overflow-hidden">
                <div className="p-4 bg-surface-subtle border-b border-surface-border flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-brand-ink">
                    Low-Stock Alert (Units &lt;= 10)
                  </h2>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab('products')} className="text-xs">
                    View Catalog
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-surface-subtle border-b border-surface-border text-ink-muted uppercase">
                        <th className="p-3">Product</th>
                        <th className="p-3">SKU</th>
                        <th className="p-3">Stock Units</th>
                        <th className="p-3">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border">
                      {overview.low_stock_list && overview.low_stock_list.length > 0 ? (
                        overview.low_stock_list.map((item) => (
                          <tr key={item.id} className="hover:bg-surface-subtle">
                            <td className="p-3 font-semibold text-brand-ink">{item.name}</td>
                            <td className="p-3 font-mono text-ink-muted">{item.sku}</td>
                            <td className="p-3">
                              <span className={`font-bold ${item.stock <= 0 ? 'text-red-600' : 'text-amber-600'}`}>
                                {item.stock} left
                              </span>
                            </td>
                            <td className="p-3">Rs. {Number(item.price).toLocaleString()}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="p-4 text-center text-ink-muted">
                            All catalog items have healthy stock levels.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Top Products */}
              <div className="bg-white border border-surface-border rounded-lg shadow-card overflow-hidden">
                <div className="p-4 bg-surface-subtle border-b border-surface-border">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-brand-ink">
                    Top Priority Multivitamins &amp; Formulations
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-surface-subtle border-b border-surface-border text-ink-muted uppercase">
                        <th className="p-3">Product Name</th>
                        <th className="p-3">Price</th>
                        <th className="p-3">Stock Units</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border">
                      {overview.top_products?.map((p) => (
                        <tr key={p.id} className="hover:bg-surface-subtle">
                          <td className="p-3 font-semibold text-brand-ink">{p.name}</td>
                          <td className="p-3 font-medium">Rs. {Number(p.price).toLocaleString()}</td>
                          <td className="p-3 font-semibold">{p.stock} units</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Recent Orders Table */}
            <div className="bg-white border border-surface-border rounded-lg shadow-card overflow-hidden">
              <div className="p-4 bg-surface-subtle border-b border-surface-border flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-brand-ink">
                  Recent 10 Customer Orders
                </h2>
                <Button variant="outline" size="sm" onClick={() => setActiveTab('orders')} className="text-xs">
                  Manage All Orders
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

        {/* ================================================================== */}
        {/* 2. ORDERS TAB */}
        {/* ================================================================== */}
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

              <div className="flex items-center gap-2">
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

                <a
                  href="/api/v1/admin/orders/export-csv/"
                  download
                  className="inline-flex items-center gap-1.5 bg-surface-subtle border border-surface-border px-3 py-2 rounded-sm text-xs font-bold text-brand-ink hover:bg-surface-accent"
                >
                  <Icon name="download" className="text-xs" />
                  <span>Export CSV</span>
                </a>
              </div>
            </div>

            <div className="bg-white border border-surface-border rounded-lg shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-surface-subtle border-b border-surface-border uppercase font-bold text-ink-muted">
                      <th className="p-3">Order Number</th>
                      <th className="p-3">Customer &amp; Contact</th>
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
                          <div>Rs. {Number(ord.grand_total).toLocaleString()}</div>
                          {ord.payment_method === 'COD' && (
                            <span className="text-[10px] text-ink-muted font-normal">Cash on Delivery</span>
                          )}
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
                              onClick={() => openTransitionModal(ord.order_number, 'confirmed')}
                              className="text-[10px] py-1 px-2"
                            >
                              Confirm
                            </Button>
                          )}
                          {ord.status === 'confirmed' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openTransitionModal(ord.order_number, 'packed')}
                              className="text-[10px] py-1 px-2"
                            >
                              Pack
                            </Button>
                          )}
                          {ord.status === 'packed' && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => openTransitionModal(ord.order_number, 'shipped')}
                              className="text-[10px] py-1 px-2"
                            >
                              Dispatch
                            </Button>
                          )}
                          {ord.status === 'shipped' && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => openTransitionModal(ord.order_number, 'delivered')}
                              className="text-[10px] py-1 px-2"
                            >
                              Deliver
                            </Button>
                          )}
                          {ord.status === 'delivered' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleMarkCODCollected(ord.order_number)}
                              className="text-[10px] py-1 px-2 text-brand-green"
                            >
                              COD Collected
                            </Button>
                          )}
                          {['pending', 'confirmed'].includes(ord.status) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openTransitionModal(ord.order_number, 'cancelled')}
                              className="text-[10px] py-1 px-2 text-red-600"
                            >
                              Cancel
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

        {/* ================================================================== */}
        {/* 3. PRODUCTS TAB */}
        {/* ================================================================== */}
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

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={productCategoryFilter}
                  onChange={(e) => setProductCategoryFilter(e.target.value)}
                  className="bg-surface-subtle border border-surface-border rounded-sm p-2 text-xs text-brand-ink"
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.slug || c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <select
                  value={productTypeFilter}
                  onChange={(e) => setProductTypeFilter(e.target.value)}
                  className="bg-surface-subtle border border-surface-border rounded-sm p-2 text-xs text-brand-ink"
                >
                  <option value="">All Types</option>
                  <option value="multivitamin">Multivitamins (Main Focus)</option>
                  <option value="skincare">Skincare</option>
                </select>

                <a
                  href="/api/v1/admin/products/export-csv/"
                  download
                  className="inline-flex items-center gap-1.5 bg-surface-subtle border border-surface-border px-3 py-2 rounded-sm text-xs font-bold text-brand-ink hover:bg-surface-accent"
                >
                  <Icon name="download" className="text-xs" />
                  <span>Export CSV</span>
                </a>

                {/* Import CSV Hidden File Input */}
                <input
                  type="file"
                  ref={csvFileInputRef}
                  onChange={handleCSVImport}
                  accept=".csv"
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => csvFileInputRef.current?.click()}
                  className="text-xs"
                >
                  <Icon name="upload" className="mr-1" />
                  Import CSV
                </Button>

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

            {/* Bulk Actions Bar */}
            {selectedProductIds.length > 0 && (
              <div className="bg-surface-subtle border border-surface-border rounded-lg p-3 flex items-center justify-between">
                <span className="text-xs font-bold text-brand-ink">
                  {selectedProductIds.length} products selected
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkStatusChange(true)}
                    className="text-xs py-1"
                  >
                    Activate Selected
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkStatusChange(false)}
                    className="text-xs py-1 text-red-600"
                  >
                    Deactivate Selected
                  </Button>
                </div>
              </div>
            )}

            {/* Products Table */}
            <div className="bg-white border border-surface-border rounded-lg shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-surface-subtle border-b border-surface-border uppercase font-bold text-ink-muted">
                      <th className="p-3 w-8">
                        <input
                          type="checkbox"
                          checked={selectedProductIds.length > 0 && selectedProductIds.length === products.length}
                          onChange={handleSelectAllProducts}
                          className="h-3.5 w-3.5"
                        />
                      </th>
                      <th className="p-3">Product Name</th>
                      <th className="p-3">SKU</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Price (PKR)</th>
                      <th className="p-3">Stock Units</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {products.map((p) => (
                      <tr key={p.id} className="hover:bg-surface-subtle">
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedProductIds.includes(p.id)}
                            onChange={() => handleSelectProduct(p.id)}
                            className="h-3.5 w-3.5"
                          />
                        </td>
                        <td className="p-3 font-bold text-brand-ink">
                          <div>{p.name}</div>
                          <span className="text-[10px] text-ink-muted uppercase">{p.product_type}</span>
                        </td>
                        <td className="p-3 font-mono text-ink-muted">{p.sku}</td>
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
                        <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingProduct(p)}
                            className="text-[10px] py-1 px-2"
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setImageModalProduct(p);
                              setUploadAltText(p.name);
                            }}
                            className="text-[10px] py-1 px-2"
                          >
                            Images
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setFaqModalProduct(p)}
                            className="text-[10px] py-1 px-2"
                          >
                            FAQs
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteProduct(p.id, p.name)}
                            className="text-[10px] py-1 px-2 text-red-600"
                          >
                            Delete
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

        {/* ================================================================== */}
        {/* 4. CATEGORIES TAB */}
        {/* ================================================================== */}
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
                <Input
                  label="Category Slug (Optional)"
                  name="catSlug"
                  value={newCategorySlug}
                  onChange={(e) => setNewCategorySlug(e.target.value)}
                  placeholder="brain-and-focus"
                />
                <div>
                  <label htmlFor="parent-category-select" className="block text-xs font-semibold text-brand-ink mb-1">
                    Parent Category (Optional Tree Hierarchy)
                  </label>
                  <select
                    id="parent-category-select"
                    value={newCategoryParent}
                    onChange={(e) => setNewCategoryParent(e.target.value)}
                    className="w-full bg-white border border-surface-border rounded-sm p-2 text-xs"
                  >
                    <option value="">None (Top Level Category)</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Display Sort Order"
                  name="sortOrder"
                  type="number"
                  value={newCategoryOrder}
                  onChange={(e) => setNewCategoryOrder(e.target.value)}
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
                    <th className="p-3">Parent</th>
                    <th className="p-3">Sort Order</th>
                    <th className="p-3">Products Count</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {categories.map((c) => (
                    <tr key={c.id}>
                      <td className="p-3 font-bold text-brand-ink">
                        <div>{c.name}</div>
                        <span className="text-[10px] text-ink-muted">{c.slug}</span>
                      </td>
                      <td className="p-3 text-ink-muted">{c.parent_name || 'Top Level'}</td>
                      <td className="p-3 font-mono">{c.sort_order}</td>
                      <td className="p-3 font-semibold">{c.products_count}</td>
                      <td className="p-3">
                        <Badge variant={c.is_active ? 'pill' : 'default'}>Active</Badge>
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteCategory(c.id, c.name)}
                          className="text-[10px] py-1 px-2 text-red-600"
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* 5. COUPONS TAB */}
        {/* ================================================================== */}
        {activeTab === 'coupons' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-4 bg-surface-subtle border border-surface-border rounded-lg p-6 shadow-card self-start">
              <h2 className="text-xs font-bold uppercase tracking-wider text-brand-ink mb-4">
                Create Discount Coupon
              </h2>
              <form onSubmit={handleCreateCoupon} className="space-y-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-brand-ink">Coupon Code</label>
                    <button
                      type="button"
                      onClick={handleGenerateRandomCode}
                      className="text-[10px] text-brand-green font-bold hover:underline"
                    >
                      Generate Random
                    </button>
                  </div>
                  <Input
                    name="code"
                    value={newCouponData.code}
                    onChange={(e) => setNewCouponData({ ...newCouponData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. SPLV-WELCOME10"
                    className="uppercase"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="discount-type-select" className="block text-xs font-semibold text-brand-ink mb-1">Discount Type</label>
                    <select
                      id="discount-type-select"
                      value={newCouponData.discount_type}
                      onChange={(e) => setNewCouponData({ ...newCouponData, discount_type: e.target.value })}
                      className="w-full bg-white border border-surface-border rounded-sm p-2 text-xs"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed PKR (Rs.)</option>
                    </select>
                  </div>
                  <Input
                    label="Discount Value"
                    name="discountValue"
                    type="number"
                    value={newCouponData.discount_value}
                    onChange={(e) => setNewCouponData({ ...newCouponData, discount_value: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="Min Order (PKR)"
                    name="minOrder"
                    type="number"
                    value={newCouponData.min_order_amount}
                    onChange={(e) => setNewCouponData({ ...newCouponData, min_order_amount: e.target.value })}
                  />
                  <Input
                    label="Max Discount"
                    name="maxDiscount"
                    type="number"
                    value={newCouponData.max_discount_amount}
                    onChange={(e) => setNewCouponData({ ...newCouponData, max_discount_amount: e.target.value })}
                    placeholder="Optional cap"
                  />
                </div>

                <Input
                  label="Total Usage Limit"
                  name="usageLimit"
                  type="number"
                  value={newCouponData.usage_limit}
                  onChange={(e) => setNewCouponData({ ...newCouponData, usage_limit: e.target.value })}
                  placeholder="Unlimited if empty"
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
                    <th className="p-3">Min Order</th>
                    <th className="p-3">Times Used</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {coupons.map((c) => (
                    <tr key={c.id}>
                      <td className="p-3 font-bold text-brand-green uppercase">{c.code}</td>
                      <td className="p-3">
                        {c.discount_type === 'percentage' || c.type === 'percent'
                          ? `${c.discount_value || c.value}%`
                          : `Rs. ${c.discount_value || c.value}`}
                      </td>
                      <td className="p-3">Rs. {Number(c.min_order_amount || 0).toLocaleString()}</td>
                      <td className="p-3">{c.times_used || 0}</td>
                      <td className="p-3">
                        <Badge variant={c.is_active ? 'pill' : 'default'}>
                          {c.is_active ? 'Active' : 'Disabled'}
                        </Badge>
                      </td>
                      <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewCouponRedemptions(c)}
                          className="text-[10px] py-1 px-2"
                        >
                          Redemptions
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteCoupon(c.id, c.code)}
                          className="text-[10px] py-1 px-2 text-red-600"
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* 6. SHIPPING & SETTINGS TAB */}
        {/* ================================================================== */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl bg-surface-subtle border border-surface-border rounded-lg p-6 shadow-card">
            <h2 className="text-xs font-bold uppercase tracking-wider text-brand-ink mb-6">
              Store Logistics &amp; Public Settings
            </h2>
            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Free Shipping Threshold (PKR)"
                  name="threshold"
                  type="number"
                  value={settingsData.free_shipping_threshold}
                  onChange={(e) => setSettingsData({ ...settingsData, free_shipping_threshold: e.target.value })}
                  required
                />
                <Input
                  label="Flat Shipping Fee (PKR)"
                  name="flatFee"
                  type="number"
                  value={settingsData.flat_shipping_fee}
                  onChange={(e) => setSettingsData({ ...settingsData, flat_shipping_fee: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Store Phone (Helpline / WhatsApp)"
                  name="storePhone"
                  value={settingsData.store_phone}
                  onChange={(e) => setSettingsData({ ...settingsData, store_phone: e.target.value })}
                  required
                />
                <Input
                  label="Official Support Email"
                  name="storeEmail"
                  type="email"
                  value={settingsData.store_email}
                  onChange={(e) => setSettingsData({ ...settingsData, store_email: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-ink mb-1">
                  Corporate Physical Address
                </label>
                <textarea
                  value={settingsData.corporate_address}
                  onChange={(e) => setSettingsData({ ...settingsData, corporate_address: e.target.value })}
                  rows="2"
                  className="w-full bg-white border border-surface-border rounded-sm p-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="site-mode-select" className="block text-xs font-semibold text-brand-ink mb-1">
                    Storefront Operational Mode
                  </label>
                  <select
                    id="site-mode-select"
                    value={settingsData.site_mode}
                    onChange={(e) => setSettingsData({ ...settingsData, site_mode: e.target.value })}
                    className="w-full bg-white border border-surface-border rounded-sm p-2 text-xs"
                  >
                    <option value="live">Live (Full Storefront &amp; Checkout)</option>
                    <option value="coming_soon">Coming Soon (Waitlist Mode Only)</option>
                  </select>
                </div>
                <Input
                  label="Official Launch Date"
                  name="launchDate"
                  type="date"
                  value={settingsData.launch_date}
                  onChange={(e) => setSettingsData({ ...settingsData, launch_date: e.target.value })}
                />
              </div>

              <div className="pt-4 border-t border-surface-border flex justify-end">
                <Button type="submit" variant="primary" size="sm">
                  Save Store Settings
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* ================================================================== */}
        {/* 7. CUSTOMERS TAB */}
        {/* ================================================================== */}
        {activeTab === 'customers' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 max-w-md">
              <Input
                name="customerSearch"
                placeholder="Search customers by email, phone, name..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="text-xs py-2"
              />
              <Button variant="outline" size="sm" onClick={loadTabData} className="text-xs">
                Search
              </Button>
            </div>

            <div className="bg-white border border-surface-border rounded-lg shadow-card overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-surface-subtle border-b border-surface-border uppercase font-bold text-ink-muted">
                    <th className="p-3">Customer Name</th>
                    <th className="p-3">Email Address</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3">Orders Count</th>
                    <th className="p-3">Joined Date</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {customers.map((c) => (
                    <tr key={c.id}>
                      <td className="p-3 font-bold text-brand-ink">{c.full_name || 'Customer'}</td>
                      <td className="p-3">{c.email}</td>
                      <td className="p-3 text-ink-muted">{c.phone || 'N/A'}</td>
                      <td className="p-3 font-semibold">{c.orders_count || 0}</td>
                      <td className="p-3">{new Date(c.date_joined).toLocaleDateString()}</td>
                      <td className="p-3">
                        <Badge variant={c.is_active ? 'pill' : 'default'}>
                          {c.is_active ? 'Active' : 'Blocked'}
                        </Badge>
                      </td>
                      <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewCustomerOrders(c)}
                          className="text-[10px] py-1 px-2"
                        >
                          Orders
                        </Button>
                        <Button
                          variant={c.is_active ? 'outline' : 'primary'}
                          size="sm"
                          onClick={() => handleToggleCustomer(c.id)}
                          className={`text-[10px] py-1 px-2.5 ${c.is_active ? 'text-red-600' : 'text-white'}`}
                        >
                          {c.is_active ? 'Block' : 'Unblock'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* 8. REVIEWS TAB */}
        {/* ================================================================== */}
        {activeTab === 'reviews' && (
          <div className="bg-white border border-surface-border rounded-lg shadow-card overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-subtle border-b border-surface-border uppercase font-bold text-ink-muted">
                  <th className="p-3">Product</th>
                  <th className="p-3">Rating &amp; Title</th>
                  <th className="p-3">Review Body</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Moderation Actions</th>
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
                    <td className="p-3 text-ink-muted max-w-sm truncate">{r.body || r.content}</td>
                    <td className="p-3">
                      <Badge variant={r.is_approved ? 'pill' : 'sale'}>
                        {r.is_approved ? 'Approved' : 'Pending'}
                      </Badge>
                    </td>
                    <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
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
                          className="text-[10px] py-1 px-2 text-amber-700"
                        >
                          Reject
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteReview(r.id)}
                        className="text-[10px] py-1 px-2 text-red-600"
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ================================================================== */}
        {/* 9. MESSAGES & WAITLIST TAB */}
        {/* ================================================================== */}
        {activeTab === 'messages' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-surface-border pb-2">
              <button
                type="button"
                onClick={() => setMessagesTab('inquiries')}
                className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-sm ${
                  messagesTab === 'inquiries' ? 'bg-brand-ink text-white' : 'bg-surface-subtle text-ink-muted'
                }`}
              >
                Customer Contact Inquiries ({messages.length})
              </button>
              <button
                type="button"
                onClick={() => setMessagesTab('waitlist')}
                className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-sm ${
                  messagesTab === 'waitlist' ? 'bg-brand-ink text-white' : 'bg-surface-subtle text-ink-muted'
                }`}
              >
                Launch Waitlist Signups ({waitlistEntries.length})
              </button>
            </div>

            {messagesTab === 'inquiries' && (
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
                          <Badge variant={m.is_handled ? 'pill' : 'default'}>
                            {m.is_handled ? 'Handled' : 'New'}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleMessageHandled(m.id)}
                            className="text-[10px] py-1 px-2"
                          >
                            {m.is_handled ? 'Mark Unhandled' : 'Mark Handled'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {messagesTab === 'waitlist' && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <a
                    href="/api/v1/admin/waitlist/export-csv/"
                    download
                    className="inline-flex items-center gap-1.5 bg-surface-subtle border border-surface-border px-3 py-2 rounded-sm text-xs font-bold text-brand-ink hover:bg-surface-accent"
                  >
                    <Icon name="download" className="text-xs" />
                    <span>Export Waitlist CSV</span>
                  </a>
                </div>
                <div className="bg-white border border-surface-border rounded-lg shadow-card overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-surface-subtle border-b border-surface-border uppercase font-bold text-ink-muted">
                        <th className="p-3">Subscriber Email</th>
                        <th className="p-3">Signup Source</th>
                        <th className="p-3">Subscribed Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border">
                      {waitlistEntries.map((w) => (
                        <tr key={w.id}>
                          <td className="p-3 font-bold text-brand-ink">{w.email}</td>
                          <td className="p-3 text-ink-muted">{w.source || 'Coming Soon Page'}</td>
                          <td className="p-3">{new Date(w.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================== */}
        {/* 10. BOT & IP SECURITY TAB */}
        {/* ================================================================== */}
        {activeTab === 'security' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Manual IP Block Form */}
              <div className="bg-surface-subtle border border-surface-border rounded-lg p-5 shadow-card">
                <h2 className="text-xs font-bold uppercase tracking-wider text-brand-ink mb-3">
                  Add IP Address to Blocklist
                </h2>
                <form onSubmit={handleManualBlockIP} className="space-y-3">
                  <Input
                    name="ip"
                    placeholder="e.g. 192.168.1.1"
                    value={manualBlockData.ip}
                    onChange={(e) => setManualBlockData({ ...manualBlockData, ip: e.target.value })}
                    required
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      name="reason"
                      placeholder="Reason for blocking"
                      value={manualBlockData.reason}
                      onChange={(e) => setManualBlockData({ ...manualBlockData, reason: e.target.value })}
                    />
                    <Input
                      name="hours"
                      type="number"
                      placeholder="Hours (default 24)"
                      value={manualBlockData.hours}
                      onChange={(e) => setManualBlockData({ ...manualBlockData, hours: e.target.value })}
                    />
                  </div>
                  <Button type="submit" variant="primary" size="sm" className="w-full">
                    Block IP Address
                  </Button>
                </form>
              </div>

              {/* Quick Unblock Tool */}
              <div className="bg-surface-subtle border border-surface-border rounded-lg p-5 shadow-card self-start">
                <h2 className="text-xs font-bold uppercase tracking-wider text-brand-ink mb-3">
                  Manual IP Unblock
                </h2>
                <div className="flex gap-2">
                  <Input
                    name="unblockIp"
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

            {/* Failed Login Attempts Log */}
            <div className="bg-white border border-surface-border rounded-lg shadow-card overflow-hidden">
              <div className="p-3 bg-surface-subtle border-b border-surface-border font-bold text-xs uppercase tracking-wider text-brand-ink">
                Recent Failed Authentication Attempts (Lockout Tracking)
              </div>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-surface-subtle border-b border-surface-border uppercase font-bold text-ink-muted">
                    <th className="p-3">Target Email</th>
                    <th className="p-3">Originating IP</th>
                    <th className="p-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {securityLogs.failed_logins?.map((fl) => (
                    <tr key={fl.id}>
                      <td className="p-3 font-semibold text-brand-ink">{fl.email}</td>
                      <td className="p-3 font-mono text-ink-muted">{fl.ip_address}</td>
                      <td className="p-3 text-ink-muted">{new Date(fl.created_at).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bot Telemetry Events */}
            <div className="bg-white border border-surface-border rounded-lg shadow-card overflow-hidden">
              <div className="p-3 bg-surface-subtle border-b border-surface-border font-bold text-xs uppercase tracking-wider text-brand-ink">
                Recent Bot &amp; Honeypot Telemetry Events
              </div>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-surface-subtle border-b border-surface-border uppercase font-bold text-ink-muted">
                    <th className="p-3">Triggered Event</th>
                    <th className="p-3">IP Address</th>
                    <th className="p-3">Target Path</th>
                    <th className="p-3">Threat Score</th>
                    <th className="p-3">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {securityLogs.bot_events?.map((ev) => (
                    <tr key={ev.id}>
                      <td className="p-3 font-bold text-brand-ink">{ev.event_type}</td>
                      <td className="p-3 font-mono text-ink-muted">{ev.ip_address}</td>
                      <td className="p-3 text-ink-muted">{ev.path || 'N/A'}</td>
                      <td className="p-3 font-semibold">{ev.score || 0}</td>
                      <td className="p-3 text-ink-muted">{new Date(ev.created_at).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* 11. AUDIT TRAIL TAB */}
        {/* ================================================================== */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            <div className="bg-white border border-surface-border rounded-lg shadow-card overflow-hidden">
              <div className="p-4 bg-surface-subtle border-b border-surface-border">
                <h2 className="text-xs font-bold uppercase tracking-wider text-brand-ink">
                  Immutable Staff Action Audit Log
                </h2>
              </div>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-surface-subtle border-b border-surface-border uppercase font-bold text-ink-muted">
                    <th className="p-3">Staff Member</th>
                    <th className="p-3">Action Performed</th>
                    <th className="p-3">Target Entity</th>
                    <th className="p-3">Details</th>
                    <th className="p-3">IP Address</th>
                    <th className="p-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-surface-subtle">
                      <td className="p-3 font-bold text-brand-ink">{log.staff_email}</td>
                      <td className="p-3 font-semibold text-brand-green uppercase">{log.action}</td>
                      <td className="p-3 text-ink-muted">
                        {log.target_model} {log.target_id ? `(#${log.target_id})` : ''}
                      </td>
                      <td className="p-3 text-ink-muted max-w-xs truncate">{log.details}</td>
                      <td className="p-3 font-mono text-ink-muted">{log.ip_address}</td>
                      <td className="p-3 text-ink-muted">{new Date(log.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {auditTotalPages > 1 && (
              <div className="flex items-center justify-between text-xs">
                <span>
                  Page {auditPage} of {auditTotalPages}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={auditPage <= 1}
                    onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={auditPage >= auditTotalPages}
                    onClick={() => setAuditPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ================================================================== */}
      {/* MODALS */}
      {/* ================================================================== */}

      {/* 1. Status Transition & Note Modal */}
      {transitionModalOpen && (
        <Modal
          isOpen={transitionModalOpen}
          onClose={() => setTransitionModalOpen(false)}
          title={`Update Order #${targetOrderNumber} Status`}
        >
          <div className="space-y-4 text-xs">
            <p className="text-ink-muted">
              Confirm status transition to{' '}
              <strong className="text-brand-ink uppercase font-bold">{targetOrderStatus}</strong>.
            </p>
            <div>
              <label className="block text-xs font-semibold text-brand-ink mb-1">
                Optional Audit Note
              </label>
              <textarea
                value={transitionNote}
                onChange={(e) => setTransitionNote(e.target.value)}
                placeholder="e.g. Courier tracking ID: LEOPARD-123456"
                rows="3"
                className="w-full bg-white border border-surface-border rounded-sm p-2 text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-surface-border">
              <Button variant="outline" size="sm" onClick={() => setTransitionModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleConfirmTransition}>
                Confirm Status Transition
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 2. Quick Edit Product Modal */}
      {editingProduct && (
        <Modal
          isOpen={!!editingProduct}
          onClose={() => setEditingProduct(null)}
          title={`Edit Product: ${editingProduct.name}`}
        >
          <div className="space-y-4 text-xs">
            <Input
              label="Product Title"
              name="title"
              value={editingProduct.name}
              onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Price in PKR"
                name="price"
                type="number"
                value={editingProduct.price}
                onChange={(e) => setEditingProduct({ ...editingProduct, price: e.target.value })}
                required
              />
              <Input
                label="Stock Units"
                name="stock"
                type="number"
                value={editingProduct.stock}
                onChange={(e) => setEditingProduct({ ...editingProduct, stock: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="SEO Meta Title"
                name="seoTitle"
                value={editingProduct.seo_title || ''}
                onChange={(e) => setEditingProduct({ ...editingProduct, seo_title: e.target.value })}
              />
              <Input
                label="SEO Meta Description"
                name="seoDesc"
                value={editingProduct.seo_description || ''}
                onChange={(e) => setEditingProduct({ ...editingProduct, seo_description: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-4 pt-2">
              <label className="flex items-center gap-2 font-semibold text-brand-ink cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingProduct.is_active}
                  onChange={(e) => setEditingProduct({ ...editingProduct, is_active: e.target.checked })}
                  className="h-4 w-4"
                />
                <span>Active &amp; Visible</span>
              </label>
              <label className="flex items-center gap-2 font-semibold text-brand-ink cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingProduct.is_featured}
                  onChange={(e) => setEditingProduct({ ...editingProduct, is_featured: e.target.checked })}
                  className="h-4 w-4"
                />
                <span>Featured Multivitamin</span>
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

      {/* 3. Add New Product Modal */}
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="new-product-type-select" className="block text-xs font-semibold text-brand-ink mb-1">Product Type</label>
                <select
                  id="new-product-type-select"
                  value={newProductData.product_type}
                  onChange={(e) => setNewProductData({ ...newProductData, product_type: e.target.value })}
                  className="w-full bg-white border border-surface-border rounded-sm p-2 text-xs"
                >
                  <option value="multivitamin">Multivitamin (Flagship Focus)</option>
                  <option value="skincare">Skincare Formulation</option>
                </select>
              </div>
              <div>
                <label htmlFor="new-product-category-select" className="block text-xs font-semibold text-brand-ink mb-1">Category</label>
                <select
                  id="new-product-category-select"
                  value={newProductData.category_id}
                  onChange={(e) => setNewProductData({ ...newProductData, category_id: e.target.value })}
                  className="w-full bg-white border border-surface-border rounded-sm p-2 text-xs"
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Input
              label="SEO Meta Title"
              name="seoTitle"
              value={newProductData.seo_title}
              onChange={(e) => setNewProductData({ ...newProductData, seo_title: e.target.value })}
              placeholder="e.g. Daily Multivitamin 60 Tablets | Supplivix Pakistan"
            />
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

      {/* 4. Product Images Gallery & Upload Modal */}
      {imageModalProduct && (
        <Modal
          isOpen={!!imageModalProduct}
          onClose={() => setImageModalProduct(null)}
          title={`Manage Images: ${imageModalProduct.name}`}
        >
          <div className="space-y-6 text-xs">
            {/* Upload form */}
            <form onSubmit={handleUploadProductImage} className="bg-surface-subtle p-3 rounded-md space-y-3">
              <span className="font-bold block uppercase tracking-wider text-ink-muted text-[10px]">
                Upload New Image (JPEG, PNG, WebP, SVG; Max 2 MB)
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                onChange={(e) => setUploadImageFile(e.target.files?.[0] || null)}
                className="text-xs"
                required
              />
              <Input
                label="Descriptive Alt Text"
                name="altText"
                value={uploadAltText}
                onChange={(e) => setUploadAltText(e.target.value)}
                placeholder="Product front packaging"
                required
              />
              <Button type="submit" variant="primary" size="sm" className="w-full">
                Upload Image
              </Button>
            </form>

            {/* Existing images list */}
            <div>
              <span className="font-bold block uppercase tracking-wider text-ink-muted text-[10px] mb-2">
                Existing Product Photos ({imageModalProduct.images?.length || 0})
              </span>
              <div className="space-y-2">
                {imageModalProduct.images?.map((img) => (
                  <div
                    key={img.id}
                    className="flex items-center justify-between p-2 border border-surface-border rounded-md"
                  >
                    <div className="flex items-center gap-3">
                      <img src={img.image} alt={img.alt_text} className="w-10 h-10 object-cover rounded-sm" />
                      <div>
                        <div className="font-semibold text-brand-ink">{img.alt_text}</div>
                        <span className="text-[10px] text-ink-muted font-mono">ID: {img.id}</span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteProductImage(img.id)}
                      className="text-[10px] py-1 px-2 text-red-600"
                    >
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-surface-border">
              <Button variant="outline" size="sm" onClick={() => setImageModalProduct(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 5. Product FAQs (AEO) Modal */}
      {faqModalProduct && (
        <Modal
          isOpen={!!faqModalProduct}
          onClose={() => setFaqModalProduct(null)}
          title={`Product FAQs & AEO: ${faqModalProduct.name}`}
        >
          <div className="space-y-6 text-xs">
            <form onSubmit={handleAddProductFAQ} className="bg-surface-subtle p-3 rounded-md space-y-3">
              <span className="font-bold block uppercase tracking-wider text-ink-muted text-[10px]">
                Add Question &amp; Answer (Feeds AEO &amp; Search Bots)
              </span>
              <Input
                label="Question"
                name="faqQuestion"
                value={newFaqQuestion}
                onChange={(e) => setNewFaqQuestion(e.target.value)}
                placeholder="What is the recommended daily dosage?"
                required
              />
              <div>
                <label className="block text-xs font-semibold text-brand-ink mb-1">Answer</label>
                <textarea
                  value={newFaqAnswer}
                  onChange={(e) => setNewFaqAnswer(e.target.value)}
                  placeholder="Take 1 tablet daily with a meal..."
                  rows="2"
                  className="w-full bg-white border border-surface-border rounded-sm p-2 text-xs"
                  required
                />
              </div>
              <Button type="submit" variant="primary" size="sm" className="w-full">
                Add FAQ
              </Button>
            </form>

            <div>
              <span className="font-bold block uppercase tracking-wider text-ink-muted text-[10px] mb-2">
                Existing FAQs ({faqModalProduct.faqs?.length || 0})
              </span>
              <div className="space-y-2">
                {faqModalProduct.faqs?.map((f) => (
                  <div key={f.id} className="p-3 border border-surface-border rounded-md">
                    <div className="flex items-start justify-between">
                      <strong className="block text-brand-ink font-semibold">{f.question}</strong>
                      <button
                        type="button"
                        onClick={() => handleDeleteProductFAQ(f.id)}
                        className="text-red-600 hover:underline text-[10px] ml-2"
                      >
                        Remove
                      </button>
                    </div>
                    <p className="text-ink-muted mt-1">{f.answer}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-surface-border">
              <Button variant="outline" size="sm" onClick={() => setFaqModalProduct(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 6. Invoice & Packing Slip Modal */}
      {selectedOrder && (
        <Modal
          isOpen={invoiceModalOpen}
          onClose={() => setInvoiceModalOpen(false)}
          title={`COD Invoice & Packing Slip - Order #${selectedOrder.order_number}`}
        >
          <div className="space-y-4 text-xs text-brand-ink print:p-0">
            <div className="border-b border-surface-border pb-3 flex justify-between items-start">
              <div>
                <strong className="block text-sm">Supplivix Beauty &amp; Wellness</strong>
                <span className="text-ink-muted text-[11px]">Official Cash on Delivery Invoice &amp; Slip</span>
                <div className="text-[10px] text-ink-muted mt-0.5">Clifton Block 4, Karachi, Pakistan</div>
              </div>
              <div className="text-right">
                <span className="font-bold block text-sm">#{selectedOrder.order_number}</span>
                <span className="text-[10px] text-ink-muted">
                  {new Date(selectedOrder.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="bg-surface-subtle p-3 rounded-md border border-surface-border text-[11px] space-y-1">
              <span className="font-bold block text-brand-ink">Delivery Recipient:</span>
              <div>{selectedOrder.recipient_name}</div>
              <div className="text-ink-muted">{selectedOrder.street_address}, {selectedOrder.city}, {selectedOrder.province}</div>
              <div className="font-mono">{selectedOrder.phone}</div>
            </div>

            {/* Order Items Table */}
            {selectedOrder.items && selectedOrder.items.length > 0 && (
              <div className="border border-surface-border rounded-md overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-surface-subtle border-b border-surface-border uppercase font-bold text-ink-muted text-[10px]">
                      <th className="p-2">Item</th>
                      <th className="p-2">Qty</th>
                      <th className="p-2 text-right">Price</th>
                      <th className="p-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {selectedOrder.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="p-2 font-medium">{it.product_name}</td>
                        <td className="p-2">{it.quantity}</td>
                        <td className="p-2 text-right">Rs. {Number(it.unit_price).toLocaleString()}</td>
                        <td className="p-2 text-right font-semibold">Rs. {Number(it.line_total).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="bg-white p-3 rounded-md border border-surface-border text-xs space-y-1.5">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>Rs. {Number(selectedOrder.subtotal || selectedOrder.grand_total).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping Fee:</span>
                <span>{selectedOrder.shipping_total === 0 ? 'FREE' : `Rs. ${selectedOrder.shipping_total}`}</span>
              </div>
              {selectedOrder.discount_total > 0 && (
                <div className="flex justify-between text-brand-green font-semibold">
                  <span>Discount Applied ({selectedOrder.coupon_code || 'PROMO'}):</span>
                  <span>- Rs. {Number(selectedOrder.discount_total).toLocaleString()}</span>
                </div>
              )}
              <div className="pt-2 flex justify-between font-bold text-sm border-t border-surface-border">
                <span>Payable to Courier Rider (Cash on Delivery):</span>
                <span className="text-brand-green">Rs. {Number(selectedOrder.grand_total).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-surface-border">
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Icon name="print" className="mr-1" />
                Print Invoice
              </Button>
              <Button variant="primary" size="sm" onClick={() => setInvoiceModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 7. Coupon Redemptions Modal */}
      {redemptionsModalOpen && (
        <Modal
          isOpen={redemptionsModalOpen}
          onClose={() => setRedemptionsModalOpen(false)}
          title={`Redemptions Log: ${activeCouponCode}`}
        >
          <div className="space-y-4 text-xs">
            <span className="text-ink-muted block">
              Orders placed using discount coupon <strong>{activeCouponCode}</strong> ({couponRedemptions.length} uses):
            </span>
            <div className="border border-surface-border rounded-md overflow-hidden max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-surface-subtle border-b border-surface-border uppercase font-bold text-ink-muted text-[10px]">
                    <th className="p-2">Order #</th>
                    <th className="p-2">Customer Email</th>
                    <th className="p-2">Discount</th>
                    <th className="p-2">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {couponRedemptions.length > 0 ? (
                    couponRedemptions.map((r) => (
                      <tr key={r.id}>
                        <td className="p-2 font-bold text-brand-ink">#{r.order_number}</td>
                        <td className="p-2">{r.email}</td>
                        <td className="p-2 text-brand-green font-semibold">
                          Rs. {Number(r.discount_amount).toLocaleString()}
                        </td>
                        <td className="p-2 text-ink-muted">{new Date(r.redeemed_at).toLocaleDateString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="p-3 text-center text-ink-muted">
                        No redemptions recorded for this coupon token yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end pt-2 border-t border-surface-border">
              <Button variant="outline" size="sm" onClick={() => setRedemptionsModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 8. Customer Order History Modal */}
      {customerOrdersModalOpen && (
        <Modal
          isOpen={customerOrdersModalOpen}
          onClose={() => setCustomerOrdersModalOpen(false)}
          title={`Order History: ${selectedCustomerInfo.email}`}
        >
          <div className="space-y-4 text-xs">
            <div className="border border-surface-border rounded-md overflow-hidden max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-surface-subtle border-b border-surface-border uppercase font-bold text-ink-muted text-[10px]">
                    <th className="p-2">Order #</th>
                    <th className="p-2">Grand Total</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Date Placed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {selectedCustomerInfo.orders.length > 0 ? (
                    selectedCustomerInfo.orders.map((o) => (
                      <tr key={o.id}>
                        <td className="p-2 font-bold text-brand-ink">#{o.order_number}</td>
                        <td className="p-2 font-semibold text-brand-green">
                          Rs. {Number(o.grand_total).toLocaleString()}
                        </td>
                        <td className="p-2">
                          <Badge variant="pill">{o.status}</Badge>
                        </td>
                        <td className="p-2 text-ink-muted">{new Date(o.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="p-3 text-center text-ink-muted">
                        No orders recorded for this customer.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end pt-2 border-t border-surface-border">
              <Button variant="outline" size="sm" onClick={() => setCustomerOrdersModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
