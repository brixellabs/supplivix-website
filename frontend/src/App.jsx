import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ToastProvider } from './components/ui/Toast';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Layout from './components/layout/Layout';
import ScrollToTop from './components/common/ScrollToTop';
import { startHeartbeat } from './services/heartbeat';

// Pages
import HomePage from './pages/HomePage';
import ShopPage from './pages/ShopPage';
import OffersPage from './pages/OffersPage';
import SaleEventDetailPage from './pages/SaleEventDetailPage';
import MultivitaminsHubPage from './pages/MultivitaminsHubPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import TrackOrderPage from './pages/TrackOrderPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import FAQPage from './pages/FAQPage';
import ComingSoonPage from './pages/ComingSoonPage';
import StyleguidePage from './pages/StyleguidePage';
import NotFoundPage from './pages/NotFoundPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

// Account Pages
import AccountDashboardPage from './pages/account/AccountDashboardPage';

// Policy Pages
import PrivacyPolicyPage from './pages/policies/PrivacyPolicyPage';
import TermsPage from './pages/policies/TermsPage';
import ShippingPolicyPage from './pages/policies/ShippingPolicyPage';

export default function App() {
  useEffect(() => {
    const stop = startHeartbeat();
    return () => {
      if (typeof stop === 'function') stop();
    };
  }, []);

  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          <ScrollToTop />
          <Routes>
            {/* Standalone Coming Soon page */}
            <Route path="/coming-soon" element={<ComingSoonPage />} />

            {/* Standalone Staff Admin Panel */}
            <Route path="/admin-panel" element={<AdminDashboardPage />} />

            {/* Main Application with Shared Header, Layout & Footer */}
            <Route path="/" element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="shop" element={<ShopPage />} />
              <Route path="offers" element={<OffersPage />} />
              <Route path="sale/:slug" element={<SaleEventDetailPage />} />
              <Route path="multivitamins" element={<MultivitaminsHubPage />} />
              <Route path="products/:slug" element={<ProductDetailPage />} />
              <Route path="ur/products/:slug" element={<ProductDetailPage />} />
              <Route path="cart" element={<CartPage />} />
              <Route path="checkout" element={<CheckoutPage />} />
              <Route path="track" element={<TrackOrderPage />} />
              <Route path="track-order" element={<TrackOrderPage />} />
              <Route path="about" element={<AboutPage />} />
              <Route path="contact" element={<ContactPage />} />
              <Route path="faq" element={<FAQPage />} />
              <Route path="faqs" element={<FAQPage />} />

              {/* Customer Account & Auth */}
              <Route path="login" element={<LoginPage />} />
              <Route path="register" element={<RegisterPage />} />
              <Route path="forgot-password" element={<ForgotPasswordPage />} />
              <Route path="reset-password" element={<ResetPasswordPage />} />
              <Route path="account" element={<AccountDashboardPage />} />

              {/* Policy Pages */}
              <Route path="privacy-policy" element={<PrivacyPolicyPage />} />
              <Route path="privacy_policy" element={<PrivacyPolicyPage />} />
              <Route path="terms" element={<TermsPage />} />
              <Route path="shipping-policy" element={<ShippingPolicyPage />} />
              <Route path="shipping_policy" element={<ShippingPolicyPage />} />

              {/* Design System Styleguide */}
              <Route path="styleguide" element={<StyleguidePage />} />

              {/* Catch-all 404 */}
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
