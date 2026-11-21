import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import SEOHead from '../../components/seo/SEOHead';
import Icon from '../../components/ui/Icon';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { api } from '../../services/api';
import AdminSaleEventsTab from './AdminSaleEventsTab';
import AdminBundlesTab from './AdminBundlesTab';
import AdminHeroBannersTab from './AdminHeroBannersTab';

const ADMIN_TABS = [
  { key: 'overview', label: 'Overview', icon: 'chart' },
  { key: 'orders', label: 'Orders (COD)', icon: 'cod' },
  { key: 'products', label: 'Products', icon: 'box' },
  { key: 'categories', label: 'Categories', icon: 'tag' },
  { key: 'hero_banners', label: 'Hero Banners', icon: 'image' },
  { key: 'sale_events', label: 'Sale Events', icon: 'tag' },
  { key: 'bundles', label: 'Promotional Bundles', icon: 'tag' },
  { key: 'settings', label: 'Shipping & Settings', icon: 'sliders' },
  { key: 'customers', label: 'Customers', icon: 'user' },
  { key: 'reviews', label: 'Reviews', icon: 'star' },
  { key: 'messages', label: 'Messages & Waitlist', icon: 'envelope' },
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
  const [isTranslatingUrdu, setIsTranslatingUrdu] = useState(false);
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
    directions: '',
    ingredients: '',
    description_ur: '',
    directions_ur: '',
    ingredients_ur: '',
    seo_title: '',
    seo_description: '',
  });

  // Product Images & FAQs sub-modals
  const [imageModalProduct, setImageModalProduct] = useState(null);
  const [uploadImageFile, setUploadImageFile] = useState(null);
  const [uploadAltText, setUploadAltText] = useState('');
  const [newProductImages, setNewProductImages] = useState([]);
  const [newProductImagesAlt, setNewProductImagesAlt] = useState('');
  const [isSubmittingNewProduct, setIsSubmittingNewProduct] = useState(false);
  const [faqModalProduct, setFaqModalProduct] = useState(null);
  const [newFaqQuestion, setNewFaqQuestion] = useState('');
  const [newFaqAnswer, setNewFaqAnswer] = useState('');

  // 4. Categories state
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategorySlug, setNewCategorySlug] = useState('');
  const [newCategoryParent, setNewCategoryParent] = useState('');
  const [newCategoryOrder, setNewCategoryOrder] = useState('0');

  // 5. Settings state
  const [settingsData, setSettingsData] = useState({
    free_shipping_threshold: '2000',
    flat_shipping_fee: '200',
    announcement_bar_enabled: true,
    announcement_text_primary: 'Free delivery on orders above Rs. {threshold}',
    announcement_text_secondary: 'Cash on Delivery (COD) Across Pakistan',
    deals_enabled: true,
    deal_banner_1_badge: 'Special Bundle',
    deal_banner_1_title: 'Complete Daily Glow Duo',
    deal_banner_1_desc: 'Pair our daily multivitamin with pure clarifying serum for comprehensive internal nutrition and external skin radiance.',
    deal_banner_1_price: '3499',
    deal_banner_1_original_price: '4350',
    deal_banner_1_button_text: 'Shop The Duo',
    deal_banner_1_link: '/shop?bundle=glow-duo',
    deal_banner_2_badge: 'Family Pack',
    deal_banner_2_title: '3-Month Wellness Supply',
    deal_banner_2_desc: 'Ensure daily vitamin consistency with our bulk family package. Includes free nationwide COD shipping.',
    deal_banner_2_highlight: 'Free Nationwide Delivery',
    deal_banner_2_button_text: 'View Family Pack',
    deal_banner_2_link: '/multivitamins',
    store_phone: '0302-5222405',
    store_email: 'supplivix@gmail.com',
    corporate_address: 'Chak No. 79 NB, Sillanwali Road, near bypass, Sargodha, Pakistan',
    instagram_url: 'https://www.instagram.com/supp.livix?utm_source=qr&xtok=YWhramgxNjNqOGI2',
    facebook_url: 'https://facebook.com',
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

  // 10. Audit logs state
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
      } else if (activeTab === 'settings') {
        const data = await api.getAdminSettings();
        setSettingsData({
          free_shipping_threshold: String(data.free_shipping_threshold || 2000),
          flat_shipping_fee: String(data.flat_shipping_fee || 200),
          announcement_bar_enabled: data.announcement_bar_enabled !== 'false' && data.announcement_bar_enabled !== false,
          announcement_text_primary: data.announcement_text_primary !== undefined ? String(data.announcement_text_primary) : 'Free delivery on orders above Rs. {threshold}',
          announcement_text_secondary: data.announcement_text_secondary !== undefined ? String(data.announcement_text_secondary) : 'Cash on Delivery (COD) Across Pakistan',
          deals_enabled: data.deals_enabled !== 'false' && data.deals_enabled !== false,
          deal_banner_1_badge: data.deal_banner_1_badge || 'Special Bundle',
          deal_banner_1_title: data.deal_banner_1_title || 'Complete Daily Glow Duo',
          deal_banner_1_desc: data.deal_banner_1_desc || '',
          deal_banner_1_price: String(data.deal_banner_1_price || '3499'),
          deal_banner_1_original_price: String(data.deal_banner_1_original_price || '4350'),
          deal_banner_1_button_text: data.deal_banner_1_button_text || 'Shop The Duo',
          deal_banner_1_link: data.deal_banner_1_link || '/shop?bundle=glow-duo',
          deal_banner_2_badge: data.deal_banner_2_badge || 'Family Pack',
          deal_banner_2_title: data.deal_banner_2_title || '3-Month Wellness Supply',
          deal_banner_2_desc: data.deal_banner_2_desc || '',
          deal_banner_2_highlight: data.deal_banner_2_highlight || 'Free Nationwide Delivery',
          deal_banner_2_button_text: data.deal_banner_2_button_text || 'View Family Pack',
          deal_banner_2_link: data.deal_banner_2_link || '/multivitamins',
          store_phone: data.store_phone || '0302-5222405',
          store_email: data.store_email || 'supplivix@gmail.com',
          corporate_address: data.corporate_address || 'Chak No. 79 NB, Sillanwali Road, near bypass, Sargodha, Pakistan',
          instagram_url: data.instagram_url || 'https://www.instagram.com/supp.livix?utm_source=qr&xtok=YWhramgxNjNqOGI2',
          facebook_url: data.facebook_url || 'https://facebook.com',
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

  const handleNewProductImagesChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const maxFiles = 3;
    if (newProductImages.length + files.length > maxFiles) {
      showToast(`A maximum of ${maxFiles} images can be added per product.`, 'error');
    }

    const availableSlots = Math.max(0, maxFiles - newProductImages.length);
    const filesToConsider = files.slice(0, availableSlots);
    const validFiles = [];

    for (const file of filesToConsider) {
      if (file.size > 2 * 1024 * 1024) {
        showToast(`Image "${file.name}" exceeds 2 MB limit.`, 'error');
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setNewProductImages((prev) => [...prev, ...validFiles]);
    }
    e.target.value = '';
  };

  const handleRemoveNewProductImage = (idxToRemove) => {
    setNewProductImages((prev) => prev.filter((_, idx) => idx !== idxToRemove));
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setIsSubmittingNewProduct(true);
    try {
      const payload = {
        ...newProductData,
        price: Number(newProductData.price),
        compare_at_price: newProductData.compare_at_price ? Number(newProductData.compare_at_price) : null,
        stock: Number(newProductData.stock),
        category_id: newProductData.category_id ? Number(newProductData.category_id) : null,
      };
      const res = await api.createAdminProduct(payload);
      const createdId = res?.id || res?.data?.id;

      let uploadedCount = 0;
      if (createdId && newProductImages.length > 0) {
        for (let i = 0; i < newProductImages.length; i++) {
          const imgFile = newProductImages[i];
          const formData = new window.FormData();
          formData.append('image', imgFile);
          const alt = newProductImagesAlt.trim() || `${newProductData.name || 'Product'} photo ${i + 1}`;
          formData.append('alt_text', alt);
          try {
            await api.uploadProductImage(createdId, formData);
            uploadedCount++;
          } catch (uploadErr) {
            console.error('Failed to upload image:', uploadErr);
          }
        }
      }

      if (uploadedCount > 0) {
        showToast(`Product created with ${uploadedCount} image(s) successfully.`);
      } else {
        showToast('Product created successfully.');
      }

      setNewProductModalOpen(false);
      setNewProductImages([]);
      setNewProductImagesAlt('');
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
    } finally {
      setIsSubmittingNewProduct(false);
    }
  };

  const handleAutoTranslateUrdu = async (target, setTarget) => {
    const desc = target.description || '';
    const dirs = target.directions || '';
    const ings = target.ingredients || '';

    if (!desc && !dirs && !ings) {
      showToast('Please enter English description, directions, or ingredients first.', 'error');
      return;
    }

    try {
      setIsTranslatingUrdu(true);
      const res = await api.translateProductToUrdu({
        description: desc,
        directions: dirs,
        ingredients: ings,
      });

      setTarget((prev) => ({
        ...prev,
        description_ur: res.description_ur || prev.description_ur || '',
        directions_ur: res.directions_ur || prev.directions_ur || '',
        ingredients_ur: res.ingredients_ur || prev.ingredients_ur || '',
      }));
      showToast('Draft Urdu translation generated. Please review and save.');
    } catch (err) {
      showToast(err.message || 'Auto-translation failed.', 'error');
    } finally {
      setIsTranslatingUrdu(false);
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
        description: editingProduct.description || '',
        directions: editingProduct.directions || '',
        ingredients: editingProduct.ingredients || '',
        description_ur: editingProduct.description_ur || '',
        directions_ur: editingProduct.directions_ur || '',
        ingredients_ur: editingProduct.ingredients_ur || '',
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
  // SETTINGS HANDLERS
  // ============================================================================
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      await api.updateAdminSettings({
        free_shipping_threshold: Number(settingsData.free_shipping_threshold),
        flat_shipping_fee: Number(settingsData.flat_shipping_fee),
        announcement_bar_enabled: Boolean(settingsData.announcement_bar_enabled),
        announcement_text_primary: settingsData.announcement_text_primary || '',
        announcement_text_secondary: settingsData.announcement_text_secondary || '',
        deals_enabled: Boolean(settingsData.deals_enabled),
        deal_banner_1_badge: settingsData.deal_banner_1_badge || '',
        deal_banner_1_title: settingsData.deal_banner_1_title || '',
        deal_banner_1_desc: settingsData.deal_banner_1_desc || '',
        deal_banner_1_price: settingsData.deal_banner_1_price || '',
        deal_banner_1_original_price: settingsData.deal_banner_1_original_price || '',
        deal_banner_1_button_text: settingsData.deal_banner_1_button_text || '',
        deal_banner_1_link: settingsData.deal_banner_1_link || '',
        deal_banner_2_badge: settingsData.deal_banner_2_badge || '',
        deal_banner_2_title: settingsData.deal_banner_2_title || '',
        deal_banner_2_desc: settingsData.deal_banner_2_desc || '',
        deal_banner_2_highlight: settingsData.deal_banner_2_highlight || '',
        deal_banner_2_button_text: settingsData.deal_banner_2_button_text || '',
        deal_banner_2_link: settingsData.deal_banner_2_link || '',
        store_phone: settingsData.store_phone.trim(),
        store_email: settingsData.store_email.trim(),
        corporate_address: settingsData.corporate_address.trim(),
        instagram_url: (settingsData.instagram_url || '').trim(),
        facebook_url: (settingsData.facebook_url || '').trim(),
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
      <SEOHead title="Staff Admin Panel" noindex={true} />
      {/* Top Admin Header */}
      <header className="bg-brand-ink text-white border-b border-surface-border sticky top-0 z-30">
        <div className="max-w-site mx-auto px-4 sm:px-6 h-14 min-h-[56px] flex items-center justify-between">
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
        <div className="flex items-center gap-1.5 border-b border-surface-border pb-3 overflow-x-auto mb-8 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
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
        {/* HERO BANNERS MANAGEMENT TAB */}
        {/* ================================================================== */}
        {activeTab === 'hero_banners' && <AdminHeroBannersTab />}

        {/* ================================================================== */}
        {/* SALE EVENTS & CAMPAIGNS TAB */}
        {/* ================================================================== */}
        {activeTab === 'sale_events' && <AdminSaleEventsTab />}

        {/* ================================================================== */}
        {/* PROMOTIONAL BUNDLES & DEALS TAB */}
        {/* ================================================================== */}
        {activeTab === 'bundles' && <AdminBundlesTab />}

        {/* ================================================================== */}
        {/* 6. SHIPPING & SETTINGS TAB */}
        {/* ================================================================== */}
        {activeTab === 'settings' && (
          <div className="w-full max-w-5xl space-y-6">
            {/* Tab Header Banner */}
            <div className="bg-white border border-surface-border rounded-lg p-5 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Icon name="sliders" className="text-brand-purple text-base" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-brand-ink">
                    Store Logistics &amp; Public Settings
                  </h2>
                </div>
                <p className="text-xs text-ink-muted mt-1">
                  Manage nationwide shipping rates, the storefront announcement banner, homepage deals, and official contacts.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-brand-green bg-green-50 border border-green-200 px-3 py-1 rounded">
                  Live Sync Active
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-6 text-xs">
              {/* Card 1: Logistics & Delivery Rates */}
              <div className="bg-surface-subtle border border-surface-border rounded-lg p-6 shadow-card space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-surface-border">
                  <Icon name="truck" className="text-brand-green" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-brand-ink">
                    Nationwide Delivery &amp; Shipping Rates
                  </h3>
                </div>
                <p className="text-xs text-ink-muted">
                  Set the free delivery threshold and standard flat rate for Cash on Delivery orders across all cities in Pakistan.
                </p>
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
                <div className="p-3 bg-white border border-surface-border rounded text-[11px] text-ink-muted flex items-start gap-2">
                  <Icon name="info" className="text-brand-purple mt-0.5 shrink-0" />
                  <span>
                    Orders with subtotal equal to or above <strong>Rs. {Number(settingsData.free_shipping_threshold || 0).toLocaleString()}</strong> will automatically receive free nationwide delivery. Orders below this threshold are charged a flat delivery fee of <strong>Rs. {Number(settingsData.flat_shipping_fee || 0).toLocaleString()}</strong>.
                  </span>
                </div>
              </div>

              {/* Card 2: Top Announcement Bar Settings & Live Preview */}
              <div className="bg-white border border-surface-border rounded-lg p-6 shadow-card space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-surface-border">
                  <div className="flex items-center gap-2">
                    <Icon name="bolt" className="text-brand-purple" />
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-brand-ink">
                        Top Announcement Bar (Header Banner)
                      </h3>
                      <p className="text-[11px] text-ink-muted mt-0.5">
                        Top header marquee banner displayed on all storefront pages.
                      </p>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-brand-purple bg-brand-lavender/40 px-3 py-1.5 rounded border border-brand-purple/20">
                    <input
                      type="checkbox"
                      checked={Boolean(settingsData.announcement_bar_enabled)}
                      onChange={(e) => setSettingsData({ ...settingsData, announcement_bar_enabled: e.target.checked })}
                      className="rounded text-brand-purple focus:ring-brand-purple"
                    />
                    <span>Active on Storefront</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Input
                      label="Primary Announcement Text"
                      name="announcementPrimary"
                      value={settingsData.announcement_text_primary}
                      onChange={(e) => setSettingsData({ ...settingsData, announcement_text_primary: e.target.value })}
                      placeholder="Free delivery on orders above Rs. {threshold}"
                    />
                    <p className="text-[11px] text-ink-muted mt-1.5">
                      Use <code className="bg-gray-100 px-1.5 py-0.5 rounded text-brand-ink font-mono text-[10px]">{'{threshold}'}</code> to dynamically display your shipping limit.
                    </p>
                  </div>
                  <div>
                    <Input
                      label="Secondary / Tagline Text"
                      name="announcementSecondary"
                      value={settingsData.announcement_text_secondary}
                      onChange={(e) => setSettingsData({ ...settingsData, announcement_text_secondary: e.target.value })}
                      placeholder="Cash on Delivery (COD) Across Pakistan"
                    />
                    <p className="text-[11px] text-ink-muted mt-1.5">
                      Displayed on the right side of the announcement bar or separated by a divider.
                    </p>
                  </div>
                </div>

                {/* Live Preview */}
                <div className="pt-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted block mb-1.5">
                    Storefront Live Preview:
                  </span>
                  {settingsData.announcement_bar_enabled ? (
                    <div className="p-3 bg-brand-lavender text-brand-purple text-xs font-semibold text-center rounded border border-brand-purple/20 flex items-center justify-center gap-3 flex-wrap">
                      <span className="inline-flex items-center gap-1.5">
                        <Icon name="truck" className="text-xs" />
                        <span>
                          {(settingsData.announcement_text_primary || 'Free delivery on orders above Rs. {threshold}')
                            .replace('{threshold}', Number(settingsData.free_shipping_threshold || 2000).toLocaleString())}
                        </span>
                      </span>
                      <span className="opacity-40">|</span>
                      <span className="inline-flex items-center gap-1.5">
                        <Icon name="cod" className="text-xs" />
                        <span>{settingsData.announcement_text_secondary || 'Cash on Delivery (COD) Across Pakistan'}</span>
                      </span>
                    </div>
                  ) : (
                    <div className="p-3 bg-gray-100 text-gray-500 text-xs italic text-center rounded border border-gray-200">
                      Announcement bar is currently hidden on storefront.
                    </div>
                  )}
                </div>
              </div>

              {/* Card 3: Homepage Promotional Deals & Banners */}
              <div className="bg-white border border-surface-border rounded-lg p-6 shadow-card space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-surface-border gap-3">
                  <div>
                    <div className="font-bold text-brand-ink text-xs flex items-center gap-1.5">
                      <Icon name="tag" className="text-brand-green" />
                      <span>Homepage Promotional Deals &amp; Bundles</span>
                    </div>
                    <p className="text-[11px] text-ink-muted mt-0.5">
                      Storefront homepage promotional deals section visibility and bundle management.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-brand-green bg-green-50 px-3 py-1.5 rounded border border-green-200">
                      <input
                        type="checkbox"
                        checked={Boolean(settingsData.deals_enabled)}
                        onChange={(e) => setSettingsData({ ...settingsData, deals_enabled: e.target.checked })}
                        className="rounded text-brand-green focus:ring-brand-green"
                      />
                      <span>Show Deals on Homepage</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setActiveTab('bundles')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-ink text-white text-xs font-semibold rounded hover:bg-black transition-colors"
                    >
                      <Icon name="tag" className="text-xs" />
                      <span>Manage Bundles (Add / Remove) &rarr;</span>
                    </button>
                  </div>
                </div>

                {settingsData.deals_enabled && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                    {/* Deal Card 1 Form & Live Preview */}
                    <div className="p-4 bg-surface-subtle border border-surface-border rounded-lg space-y-4">
                      <div className="flex items-center justify-between border-b border-surface-border pb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-brand-ink">
                          Deal Card 1 (Bundle / Discount Offer)
                        </span>
                        <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                          Left Card
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input
                          label="Badge / Tag Text"
                          name="deal1Badge"
                          value={settingsData.deal_banner_1_badge}
                          onChange={(e) => setSettingsData({ ...settingsData, deal_banner_1_badge: e.target.value })}
                          placeholder="Special Bundle"
                        />
                        <Input
                          label="Deal Title"
                          name="deal1Title"
                          value={settingsData.deal_banner_1_title}
                          onChange={(e) => setSettingsData({ ...settingsData, deal_banner_1_title: e.target.value })}
                          placeholder="Complete Daily Glow Duo"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-brand-ink mb-1">
                          Deal Description
                        </label>
                        <textarea
                          rows="2"
                          value={settingsData.deal_banner_1_desc}
                          onChange={(e) => setSettingsData({ ...settingsData, deal_banner_1_desc: e.target.value })}
                          placeholder="Pair our daily multivitamin with pure clarifying serum..."
                          className="w-full bg-white border border-surface-border rounded-sm p-2 text-xs focus:ring-1 focus:ring-brand-purple focus:border-brand-purple outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          label="Sale Price (PKR)"
                          name="deal1Price"
                          type="number"
                          value={settingsData.deal_banner_1_price}
                          onChange={(e) => setSettingsData({ ...settingsData, deal_banner_1_price: e.target.value })}
                          placeholder="3499"
                        />
                        <Input
                          label="Original Price (PKR)"
                          name="deal1OrigPrice"
                          type="number"
                          value={settingsData.deal_banner_1_original_price}
                          onChange={(e) => setSettingsData({ ...settingsData, deal_banner_1_original_price: e.target.value })}
                          placeholder="4350"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          label="Button Text"
                          name="deal1BtnText"
                          value={settingsData.deal_banner_1_button_text}
                          onChange={(e) => setSettingsData({ ...settingsData, deal_banner_1_button_text: e.target.value })}
                          placeholder="Shop The Duo"
                        />
                        <Input
                          label="Button Link"
                          name="deal1Link"
                          value={settingsData.deal_banner_1_link}
                          onChange={(e) => setSettingsData({ ...settingsData, deal_banner_1_link: e.target.value })}
                          placeholder="/shop?bundle=glow-duo"
                        />
                      </div>

                      {/* Live Preview for Card 1 */}
                      <div className="pt-3 border-t border-surface-border">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted block mb-2">
                          Card 1 Live Preview:
                        </span>
                        <div className="border border-surface-border rounded-lg p-5 bg-white shadow-card">
                          {settingsData.deal_banner_1_badge && (
                            <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-red-600 text-white mb-2">
                              {settingsData.deal_banner_1_badge}
                            </span>
                          )}
                          <h4 className="text-base font-bold uppercase tracking-tight text-brand-ink mb-1">
                            {settingsData.deal_banner_1_title || 'Deal Title'}
                          </h4>
                          {settingsData.deal_banner_1_desc && (
                            <p className="text-[11px] text-ink-muted mb-3 line-clamp-2">
                              {settingsData.deal_banner_1_desc}
                            </p>
                          )}
                          <div className="text-sm font-bold text-brand-ink mb-3">
                            Rs. {Number(settingsData.deal_banner_1_price || 0).toLocaleString()}{' '}
                            {settingsData.deal_banner_1_original_price && Number(settingsData.deal_banner_1_original_price) > Number(settingsData.deal_banner_1_price) && (
                              <span className="text-[11px] text-ink-muted line-through font-normal ml-1">
                                Rs. {Number(settingsData.deal_banner_1_original_price).toLocaleString()}
                              </span>
                            )}
                          </div>
                          <div className="inline-block bg-brand-ink text-white text-[11px] font-bold px-4 py-1.5 rounded uppercase">
                            {settingsData.deal_banner_1_button_text || 'Shop The Deal'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Deal Card 2 Form & Live Preview */}
                    <div className="p-4 bg-surface-subtle border border-surface-border rounded-lg space-y-4">
                      <div className="flex items-center justify-between border-b border-surface-border pb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-brand-ink">
                          Deal Card 2 (Highlight / Family Pack Offer)
                        </span>
                        <span className="text-[10px] font-bold text-brand-green bg-green-50 border border-green-200 px-2 py-0.5 rounded">
                          Right Card
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input
                          label="Badge / Tag Text"
                          name="deal2Badge"
                          value={settingsData.deal_banner_2_badge}
                          onChange={(e) => setSettingsData({ ...settingsData, deal_banner_2_badge: e.target.value })}
                          placeholder="Family Pack"
                        />
                        <Input
                          label="Deal Title"
                          name="deal2Title"
                          value={settingsData.deal_banner_2_title}
                          onChange={(e) => setSettingsData({ ...settingsData, deal_banner_2_title: e.target.value })}
                          placeholder="3-Month Wellness Supply"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-brand-ink mb-1">
                          Deal Description
                        </label>
                        <textarea
                          rows="2"
                          value={settingsData.deal_banner_2_desc}
                          onChange={(e) => setSettingsData({ ...settingsData, deal_banner_2_desc: e.target.value })}
                          placeholder="Ensure daily vitamin consistency with our bulk family package..."
                          className="w-full bg-white border border-surface-border rounded-sm p-2 text-xs focus:ring-1 focus:ring-brand-purple focus:border-brand-purple outline-none"
                        />
                      </div>
                      <Input
                        label="Highlight / Perk Text"
                        name="deal2Highlight"
                        value={settingsData.deal_banner_2_highlight}
                        onChange={(e) => setSettingsData({ ...settingsData, deal_banner_2_highlight: e.target.value })}
                        placeholder="Free Nationwide Delivery"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          label="Button Text"
                          name="deal2BtnText"
                          value={settingsData.deal_banner_2_button_text}
                          onChange={(e) => setSettingsData({ ...settingsData, deal_banner_2_button_text: e.target.value })}
                          placeholder="View Family Pack"
                        />
                        <Input
                          label="Button Link"
                          name="deal2Link"
                          value={settingsData.deal_banner_2_link}
                          onChange={(e) => setSettingsData({ ...settingsData, deal_banner_2_link: e.target.value })}
                          placeholder="/multivitamins"
                        />
                      </div>

                      {/* Live Preview for Card 2 */}
                      <div className="pt-3 border-t border-surface-border">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted block mb-2">
                          Card 2 Live Preview:
                        </span>
                        <div className="border border-brand-green/30 rounded-lg p-5 bg-green-50/50 shadow-card">
                          {settingsData.deal_banner_2_badge && (
                            <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-brand-lavender text-brand-purple mb-2">
                              {settingsData.deal_banner_2_badge}
                            </span>
                          )}
                          <h4 className="text-base font-bold uppercase tracking-tight text-brand-ink mb-1">
                            {settingsData.deal_banner_2_title || 'Deal Title'}
                          </h4>
                          {settingsData.deal_banner_2_desc && (
                            <p className="text-[11px] text-ink-muted mb-3 line-clamp-2">
                              {settingsData.deal_banner_2_desc}
                            </p>
                          )}
                          {settingsData.deal_banner_2_highlight && (
                            <div className="text-sm font-bold text-brand-green mb-3">
                              {settingsData.deal_banner_2_highlight}
                            </div>
                          )}
                          <div className="inline-block bg-brand-ink text-white text-[11px] font-bold px-4 py-1.5 rounded uppercase">
                            {settingsData.deal_banner_2_button_text || 'View Deal'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Card 4: Store Helpline, Official Email & Operations */}
              <div className="bg-surface-subtle border border-surface-border rounded-lg p-6 shadow-card space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-surface-border">
                  <Icon name="phone" className="text-brand-purple" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-brand-ink">
                    Store Helpline, Official Email &amp; Operational Mode
                  </h3>
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
                  <Input
                    label="Official Instagram Profile URL"
                    name="instagramUrl"
                    type="url"
                    value={settingsData.instagram_url}
                    onChange={(e) => setSettingsData({ ...settingsData, instagram_url: e.target.value })}
                    placeholder="https://www.instagram.com/supp.livix"
                  />
                  <Input
                    label="Official Facebook Page URL"
                    name="facebookUrl"
                    type="url"
                    value={settingsData.facebook_url}
                    onChange={(e) => setSettingsData({ ...settingsData, facebook_url: e.target.value })}
                    placeholder="https://facebook.com/supplivix"
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
                    className="w-full bg-white border border-surface-border rounded-sm p-2.5 text-xs focus:ring-1 focus:ring-brand-purple focus:border-brand-purple outline-none"
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
                      className="w-full bg-white border border-surface-border rounded-sm p-2 text-xs focus:ring-1 focus:ring-brand-purple focus:border-brand-purple outline-none"
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
              </div>

              {/* Bottom Actions Bar */}
              <div className="bg-white border border-surface-border rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-card">
                <span className="text-xs text-ink-muted">
                  Changes take effect across the storefront, cart calculations, and checkout immediately after saving.
                </span>
                <Button type="submit" variant="primary" size="md" className="w-full sm:w-auto px-6 font-bold uppercase tracking-wider">
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
        {/* 10. AUDIT TRAIL TAB */}
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
          hideFooter={true}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-4 text-xs">
            {/* Quick Urdu Banner & Translate Shortcut */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-md">
              <div className="flex items-center gap-2">
                <Icon name="language" className="text-emerald-700 text-base" />
                <div>
                  <span className="font-bold text-emerald-950 block">Urdu Localization Active • اردو سپورٹ</span>
                  <span className="text-[11px] text-emerald-800">Translate English description, directions, and ingredients to Urdu</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleAutoTranslateUrdu(editingProduct, setEditingProduct)}
                disabled={isTranslatingUrdu}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#016a38] hover:bg-[#01542c] disabled:opacity-50 text-white rounded text-xs font-bold shadow-sm transition-colors cursor-pointer self-start sm:self-auto"
                title="Auto-generate draft Urdu translation from English fields"
              >
                <Icon name="language" className="text-xs" />
                <span>{isTranslatingUrdu ? 'Translating to Urdu...' : 'Auto-Translate to Urdu'}</span>
              </button>
            </div>

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

            {/* English Product Content (Description, Directions, Ingredients) */}
            <div className="pt-3 border-t border-surface-border space-y-3">
              <span className="font-bold text-brand-ink block">English Product Content</span>
              <div>
                <label className="block text-xs font-semibold text-brand-ink mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  placeholder="Detailed product description in English..."
                  className="w-full bg-white border border-surface-border rounded-sm p-2 text-xs focus:border-brand-green focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-brand-ink mb-1">Directions / Daily Use</label>
                  <textarea
                    rows={2}
                    value={editingProduct.directions || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, directions: e.target.value })}
                    placeholder="Take 1 tablet daily with a meal..."
                    className="w-full bg-white border border-surface-border rounded-sm p-2 text-xs focus:border-brand-green focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-brand-ink mb-1">Ingredients / Matrix</label>
                  <textarea
                    rows={2}
                    value={editingProduct.ingredients || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, ingredients: e.target.value })}
                    placeholder="Active nutritional matrix ingredients..."
                    className="w-full bg-white border border-surface-border rounded-sm p-2 text-xs focus:border-brand-green focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Urdu Language Section with Auto-Translate Button (Nutrifactor Style) */}
            <div className="pt-3 border-t border-surface-border space-y-3 bg-[#fdfdfc] p-3 rounded-md border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-border pb-2.5">
                <div>
                  <span className="font-bold text-brand-ink flex items-center gap-2">
                    <span className="text-base text-brand-green font-urdu font-bold">اردو تفصیلات</span>
                    <span className="text-xs text-ink-muted">(Urdu Product Details)</span>
                  </span>
                  <span className="text-[11px] text-ink-muted">Feeds the /ur/products/&lt;slug&gt; page and Urdu switcher pill</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleAutoTranslateUrdu(editingProduct, setEditingProduct)}
                  disabled={isTranslatingUrdu}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#016a38] hover:bg-[#01542c] disabled:opacity-50 text-white rounded text-xs font-semibold shadow-sm transition-colors cursor-pointer self-start sm:self-auto"
                  title="Auto-generate draft Urdu translation from English fields above"
                >
                  <Icon name="language" className="text-sm" />
                  <span>{isTranslatingUrdu ? 'Translating to Urdu...' : 'Auto-Translate to Urdu'}</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-ink mb-1 flex items-center justify-between">
                  <span>Urdu Description (مصنوعات کی تفصیل)</span>
                  <span className="font-urdu text-[11px] text-brand-green">RTL • Noto Nastaliq</span>
                </label>
                <textarea
                  dir="rtl"
                  rows={3}
                  value={editingProduct.description_ur || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description_ur: e.target.value })}
                  placeholder="مصنوعات کی مکمل تفصیل اردو میں درج کریں..."
                  className="w-full bg-white border border-surface-border rounded-sm p-2.5 text-sm font-urdu leading-relaxed focus:border-brand-green focus:outline-none text-right"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-brand-ink mb-1 flex items-center justify-between">
                    <span>Urdu Directions (ہدایاتِ استعمال)</span>
                    <span className="font-urdu text-[11px] text-brand-green">RTL</span>
                  </label>
                  <textarea
                    dir="rtl"
                    rows={3}
                    value={editingProduct.directions_ur || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, directions_ur: e.target.value })}
                    placeholder="استعمال کی ہدایات درج کریں..."
                    className="w-full bg-white border border-surface-border rounded-sm p-2.5 text-sm font-urdu leading-relaxed focus:border-brand-green focus:outline-none text-right"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-brand-ink mb-1 flex items-center justify-between">
                    <span>Urdu Ingredients (اجزاء کی تفصیل)</span>
                    <span className="font-urdu text-[11px] text-brand-green">RTL</span>
                  </label>
                  <textarea
                    dir="rtl"
                    rows={3}
                    value={editingProduct.ingredients_ur || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, ingredients_ur: e.target.value })}
                    placeholder="اجزاء کی تفصیل درج کریں..."
                    className="w-full bg-white border border-surface-border rounded-sm p-2.5 text-sm font-urdu leading-relaxed focus:border-brand-green focus:outline-none text-right"
                  />
                </div>
              </div>
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
          onClose={() => {
            setNewProductModalOpen(false);
            setNewProductImages([]);
            setNewProductImagesAlt('');
          }}
          title="Add New Catalog Product"
          hideFooter={true}
          maxWidth="max-w-3xl"
        >
          <form onSubmit={handleCreateProduct} className="space-y-3.5 text-xs">
            {/* Quick Urdu Banner & Translate Shortcut */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-md">
              <div className="flex items-center gap-2">
                <Icon name="language" className="text-emerald-700 text-base" />
                <div>
                  <span className="font-bold text-emerald-950 block">Urdu Localization Active • اردو سپورٹ</span>
                  <span className="text-[11px] text-emerald-800">Auto-translates English description, directions, and ingredients into Urdu</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleAutoTranslateUrdu(newProductData, setNewProductData)}
                disabled={isTranslatingUrdu}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#016a38] hover:bg-[#01542c] disabled:opacity-50 text-white rounded text-xs font-bold shadow-sm transition-colors cursor-pointer self-start sm:self-auto"
                title="Auto-generate draft Urdu translation from English fields"
              >
                <Icon name="language" className="text-xs" />
                <span>{isTranslatingUrdu ? 'Translating to Urdu...' : 'Auto-Translate to Urdu'}</span>
              </button>
            </div>

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

            {/* Product Images Upload Section */}
            <div className="pt-2 border-t border-surface-border space-y-2">
              <label className="block text-xs font-bold text-brand-ink">
                Product Images <span className="font-normal text-ink-muted">(Optional, up to 3 images • Max 2 MB each)</span>
              </label>

              <div className="bg-surface-subtle border-2 border-dashed border-surface-border hover:border-brand-green/60 rounded-md p-3 text-center transition-colors">
                <input
                  type="file"
                  id="new-product-images-input"
                  accept="image/jpeg,image/png,image/webp,image/svg+xml"
                  multiple
                  onChange={handleNewProductImagesChange}
                  className="hidden"
                  disabled={newProductImages.length >= 3}
                />
                <label
                  htmlFor="new-product-images-input"
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs font-semibold cursor-pointer transition-colors ${
                    newProductImages.length >= 3
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-white border border-surface-border hover:border-brand-green text-brand-ink hover:text-brand-green shadow-solid-sm'
                  }`}
                >
                  <Icon name="upload" className="text-xs text-brand-green" />
                  <span>
                    {newProductImages.length >= 3 ? 'Max 3 Images Selected' : '+ Choose Product Photos'}
                  </span>
                </label>
                <p className="text-[10px] text-ink-muted mt-1">
                  Accepts JPEG, PNG, WebP, SVG. Will automatically upload with product.
                </p>
              </div>

              {/* Previews of Selected Images */}
              {newProductImages.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-brand-ink">
                    <span>Selected Images ({newProductImages.length}/3):</span>
                    <button
                      type="button"
                      onClick={() => setNewProductImages([])}
                      className="text-red-600 hover:underline text-[10px]"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {newProductImages.map((file, idx) => {
                      const objectUrl = typeof window !== 'undefined' && typeof window.URL?.createObjectURL === 'function'
                        ? window.URL.createObjectURL(file)
                        : '';
                      return (
                        <div
                          key={idx}
                          className="relative flex items-center gap-2 p-1.5 bg-white border border-surface-border rounded-md shadow-sm"
                        >
                          {objectUrl ? (
                            <img
                              src={objectUrl}
                              alt={`Preview ${idx + 1}`}
                              className="w-10 h-10 object-cover rounded-sm border border-surface-border flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-100 rounded-sm border border-surface-border flex items-center justify-center flex-shrink-0 text-ink-muted">
                              <Icon name="upload" className="text-xs" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-medium text-brand-ink truncate" title={file.name}>
                              {file.name}
                            </p>
                            <span className="text-[9px] text-ink-muted">
                              {(file.size / 1024).toFixed(0)} KB {idx === 0 && '• Primary'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveNewProductImage(idx)}
                            className="p-1 text-ink-muted hover:text-red-600 transition-colors"
                            title="Remove image"
                          >
                            <Icon name="close" className="text-[10px]" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-1">
                    <Input
                      label="Images Alt Text (Optional)"
                      name="imageAlt"
                      value={newProductImagesAlt}
                      onChange={(e) => setNewProductImagesAlt(e.target.value)}
                      placeholder="e.g. Front packaging & bioavailable capsules"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* English Product Content */}
            <div className="pt-2 border-t border-surface-border space-y-3">
              <span className="font-bold text-brand-ink block">English Product Content</span>
              <div>
                <label className="block text-xs font-semibold text-brand-ink mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newProductData.description || ''}
                  onChange={(e) => setNewProductData({ ...newProductData, description: e.target.value })}
                  placeholder="Detailed product description in English..."
                  className="w-full bg-white border border-surface-border rounded-sm p-2 text-xs focus:border-brand-green focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-brand-ink mb-1">Directions / Daily Use</label>
                  <textarea
                    rows={2}
                    value={newProductData.directions || ''}
                    onChange={(e) => setNewProductData({ ...newProductData, directions: e.target.value })}
                    placeholder="Take 1 tablet daily with a meal..."
                    className="w-full bg-white border border-surface-border rounded-sm p-2 text-xs focus:border-brand-green focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-brand-ink mb-1">Ingredients / Matrix</label>
                  <textarea
                    rows={2}
                    value={newProductData.ingredients || ''}
                    onChange={(e) => setNewProductData({ ...newProductData, ingredients: e.target.value })}
                    placeholder="Active nutritional matrix ingredients..."
                    className="w-full bg-white border border-surface-border rounded-sm p-2 text-xs focus:border-brand-green focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Urdu Language Section with Auto-Translate Button (Nutrifactor Style) */}
            <div className="pt-3 border-t border-surface-border space-y-3 bg-[#fdfdfc] p-3 rounded-md border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-border pb-2.5">
                <div>
                  <span className="font-bold text-brand-ink flex items-center gap-2">
                    <span className="text-base text-brand-green font-urdu font-bold">اردو تفصیلات</span>
                    <span className="text-xs text-ink-muted">(Urdu Product Details)</span>
                  </span>
                  <span className="text-[11px] text-ink-muted">Feeds the /ur/products/&lt;slug&gt; page and Urdu switcher pill</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleAutoTranslateUrdu(newProductData, setNewProductData)}
                  disabled={isTranslatingUrdu}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#016a38] hover:bg-[#01542c] disabled:opacity-50 text-white rounded text-xs font-semibold shadow-sm transition-colors cursor-pointer self-start sm:self-auto"
                  title="Auto-generate draft Urdu translation from English fields above"
                >
                  <Icon name="language" className="text-sm" />
                  <span>{isTranslatingUrdu ? 'Translating to Urdu...' : 'Auto-Translate to Urdu'}</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-ink mb-1 flex items-center justify-between">
                  <span>Urdu Description (مصنوعات کی تفصیل)</span>
                  <span className="font-urdu text-[11px] text-brand-green">RTL • Noto Nastaliq</span>
                </label>
                <textarea
                  dir="rtl"
                  rows={3}
                  value={newProductData.description_ur || ''}
                  onChange={(e) => setNewProductData({ ...newProductData, description_ur: e.target.value })}
                  placeholder="مصنوعات کی مکمل تفصیل اردو میں درج کریں..."
                  className="w-full bg-white border border-surface-border rounded-sm p-2.5 text-sm font-urdu leading-relaxed focus:border-brand-green focus:outline-none text-right"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-brand-ink mb-1 flex items-center justify-between">
                    <span>Urdu Directions (ہدایاتِ استعمال)</span>
                    <span className="font-urdu text-[11px] text-brand-green">RTL</span>
                  </label>
                  <textarea
                    dir="rtl"
                    rows={3}
                    value={newProductData.directions_ur || ''}
                    onChange={(e) => setNewProductData({ ...newProductData, directions_ur: e.target.value })}
                    placeholder="استعمال کی ہدایات درج کریں..."
                    className="w-full bg-white border border-surface-border rounded-sm p-2.5 text-sm font-urdu leading-relaxed focus:border-brand-green focus:outline-none text-right"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-brand-ink mb-1 flex items-center justify-between">
                    <span>Urdu Ingredients (اجزاء کی تفصیل)</span>
                    <span className="font-urdu text-[11px] text-brand-green">RTL</span>
                  </label>
                  <textarea
                    dir="rtl"
                    rows={3}
                    value={newProductData.ingredients_ur || ''}
                    onChange={(e) => setNewProductData({ ...newProductData, ingredients_ur: e.target.value })}
                    placeholder="اجزاء کی تفصیل درج کریں..."
                    className="w-full bg-white border border-surface-border rounded-sm p-2.5 text-sm font-urdu leading-relaxed focus:border-brand-green focus:outline-none text-right"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-surface-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setNewProductModalOpen(false);
                  setNewProductImages([]);
                  setNewProductImagesAlt('');
                }}
                disabled={isSubmittingNewProduct}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={isSubmittingNewProduct}
              >
                {newProductImages.length > 0 ? `Create Product (+${newProductImages.length} Photo${newProductImages.length > 1 ? 's' : ''})` : 'Create Product'}
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

      {/* 7. Customer Order History Modal */}
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
