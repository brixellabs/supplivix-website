const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

function getSessionKey() {
  let key = localStorage.getItem('splv_session_key');
  if (!key) {
    key = 'sess_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('splv_session_key', key);
  }
  return key;
}

export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const headers = {
    'Content-Type': 'application/json',
    'X-Session-Key': getSessionKey(),
    ...(options.headers || {}),
  };

  if (options.body && options.body.constructor && options.body.constructor.name === 'FormData') {
    delete headers['Content-Type'];
  }

  const config = {
    ...options,
    headers,
    credentials: 'include',
  };

  const response = await fetch(url, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || 'API request failed');
    error.status = response.status;
    error.data = data;
    error.code = data.code;
    error.fields = data.fields || {};
    throw error;
  }

  return data;
}

export const api = {
  // Public settings
  getPublicSettings: () => apiRequest('/settings/public/'),

  // Waitlist
  joinWaitlist: (email, websiteHoneypot = '') =>
    apiRequest('/waitlist/', {
      method: 'POST',
      body: JSON.stringify({ email, website: websiteHoneypot }),
    }),

  // Contact
  submitContact: (payload) =>
    apiRequest('/contact/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Catalog
  getCategories: () => apiRequest('/categories/'),
  getProducts: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    const queryString = query.toString();
    return apiRequest(`/products/${queryString ? `?${queryString}` : ''}`);
  },
  getProduct: (slug) => apiRequest(`/products/${slug}/`),
  getProductReviews: (slug) => apiRequest(`/products/${slug}/reviews/`),
  createReview: (slug, payload) =>
    apiRequest(`/products/${slug}/reviews/create/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Cart
  getCart: () => apiRequest('/cart/'),
  addToCart: (productId, quantity = 1) =>
    apiRequest('/cart/items/', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId, quantity }),
    }),
  updateCartItem: (itemId, quantity) =>
    apiRequest(`/cart/items/${itemId}/`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    }),
  removeCartItem: (itemId) =>
    apiRequest(`/cart/items/${itemId}/`, {
      method: 'DELETE',
    }),
  applyCoupon: (code) =>
    apiRequest('/cart/coupon/', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
  removeCoupon: () =>
    apiRequest('/cart/coupon/delete/', {
      method: 'DELETE',
    }),
  mergeCart: (sessionKey) =>
    apiRequest('/cart/merge/', {
      method: 'POST',
      body: JSON.stringify({ session_key: sessionKey }),
    }),

  // Checkout and Orders
  getCheckoutQuote: (payload = {}) =>
    apiRequest('/checkout/quote/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  placeOrder: (payload) =>
    apiRequest('/orders/create/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getOrders: () => apiRequest('/orders/'),
  getOrder: (number) => apiRequest(`/orders/${number}/`),
  cancelOrder: (number) =>
    apiRequest(`/orders/${number}/cancel/`, {
      method: 'POST',
    }),
  trackOrder: (orderNumber, phone) =>
    apiRequest('/orders/track/', {
      method: 'POST',
      body: JSON.stringify({ order_number: orderNumber, phone }),
    }),

  // Auth
  register: (payload) =>
    apiRequest('/auth/register/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  login: (payload) =>
    apiRequest('/auth/login/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  logout: () =>
    apiRequest('/auth/logout/', {
      method: 'POST',
    }),
  getMe: () => apiRequest('/auth/me/'),
  changePassword: (payload) =>
    apiRequest('/auth/change-password/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  requestPasswordReset: (email) =>
    apiRequest('/auth/password-reset/request/', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  confirmPasswordReset: (payload) =>
    apiRequest('/auth/password-reset/confirm/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Admin Dashboard (/api/v1/admin/)
  getAdminOverview: () => apiRequest('/admin/overview/'),
  getAdminProducts: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiRequest(`/admin/products/${q ? `?${q}` : ''}`);
  },
  getAdminProductDetail: (id) => apiRequest(`/admin/products/${id}/`),
  createAdminProduct: (payload) =>
    apiRequest('/admin/products/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateAdminProduct: (id, payload) =>
    apiRequest(`/admin/products/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteAdminProduct: (id) =>
    apiRequest(`/admin/products/${id}/`, {
      method: 'DELETE',
    }),
  bulkUpdateProductStatus: (ids, is_active) =>
    apiRequest('/admin/products/bulk-status/', {
      method: 'POST',
      body: JSON.stringify({ ids, is_active }),
    }),
  importAdminProductsCSV: (formData) =>
    apiRequest('/admin/products/import-csv/', {
      method: 'POST',
      body: formData,
    }),
  uploadProductImage: (productId, formData) =>
    apiRequest(`/admin/products/${productId}/images/`, {
      method: 'POST',
      body: formData,
    }),
  deleteProductImage: (productId, imageId) =>
    apiRequest(`/admin/products/${productId}/images/${imageId}/`, {
      method: 'DELETE',
    }),
  addProductFAQ: (productId, payload) =>
    apiRequest(`/admin/products/${productId}/faqs/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteProductFAQ: (productId, faqId) =>
    apiRequest(`/admin/products/${productId}/faqs/${faqId}/`, {
      method: 'DELETE',
    }),

  // Categories
  getAdminCategories: () => apiRequest('/admin/categories/'),
  createAdminCategory: (payload) =>
    apiRequest('/admin/categories/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateAdminCategory: (id, payload) =>
    apiRequest(`/admin/categories/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteAdminCategory: (id) =>
    apiRequest(`/admin/categories/${id}/`, {
      method: 'DELETE',
    }),
  reorderAdminCategories: (order) =>
    apiRequest('/admin/categories/reorder/', {
      method: 'POST',
      body: JSON.stringify({ order }),
    }),

  // Orders
  getAdminOrders: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiRequest(`/admin/orders/${q ? `?${q}` : ''}`);
  },
  getAdminOrderDetail: (number) => apiRequest(`/admin/orders/${number}/`),
  transitionAdminOrder: (number, status, notes = '') =>
    apiRequest(`/admin/orders/${number}/transition/`, {
      method: 'POST',
      body: JSON.stringify({ status, notes }),
    }),
  markAdminOrderCODCollected: (number) =>
    apiRequest(`/admin/orders/${number}/mark-cod-collected/`, {
      method: 'POST',
    }),

  // Coupons
  getAdminCoupons: () => apiRequest('/admin/coupons/'),
  createAdminCoupon: (payload) =>
    apiRequest('/admin/coupons/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateAdminCoupon: (id, payload) =>
    apiRequest(`/admin/coupons/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteAdminCoupon: (id) =>
    apiRequest(`/admin/coupons/${id}/`, {
      method: 'DELETE',
    }),
  generateAdminCouponCode: (prefix = 'SPLV') =>
    apiRequest(`/admin/coupons/generate-code/?prefix=${prefix}`),
  getAdminCouponRedemptions: (id) =>
    apiRequest(`/admin/coupons/${id}/redemptions/`),

  // Shipping & Settings
  getAdminSettings: () => apiRequest('/admin/settings/'),
  updateAdminSettings: (payload) =>
    apiRequest('/admin/settings/', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  // Customers
  getAdminCustomers: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiRequest(`/admin/customers/${q ? `?${q}` : ''}`);
  },
  getAdminCustomerOrders: (id) =>
    apiRequest(`/admin/customers/${id}/orders/`),
  toggleAdminCustomer: (id) =>
    apiRequest(`/admin/customers/${id}/toggle-status/`, {
      method: 'POST',
    }),

  // Reviews
  getAdminReviews: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiRequest(`/admin/reviews/${q ? `?${q}` : ''}`);
  },
  moderateAdminReview: (id, approved) =>
    apiRequest(`/admin/reviews/${id}/moderate/`, {
      method: 'POST',
      body: JSON.stringify({ approved }),
    }),
  deleteAdminReview: (id) =>
    apiRequest(`/admin/reviews/${id}/`, {
      method: 'DELETE',
    }),

  // Messages & Waitlist
  getAdminMessages: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiRequest(`/admin/messages/${q ? `?${q}` : ''}`);
  },
  markAdminMessageRead: (id) =>
    apiRequest(`/admin/messages/${id}/mark-read/`, {
      method: 'POST',
    }),
  toggleAdminMessageHandled: (id) =>
    apiRequest(`/admin/messages/${id}/toggle-handled/`, {
      method: 'POST',
    }),
  getAdminWaitlist: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiRequest(`/admin/waitlist/${q ? `?${q}` : ''}`);
  },

  // Security & Audit Logs
  getAdminSecurityLogs: () => apiRequest('/admin/security/logs/'),
  blockAdminIP: (payload) =>
    apiRequest('/admin/security/block-ip/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  unblockAdminIP: (ip) =>
    apiRequest('/admin/security/unblock-ip/', {
      method: 'POST',
      body: JSON.stringify({ ip }),
    }),
  getAdminAuditLogs: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiRequest(`/admin/audit-logs/${q ? `?${q}` : ''}`);
  },
};
