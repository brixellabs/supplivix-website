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
};
