import React, { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import CookieNotice from '../ui/CookieNotice';
import Icon from '../ui/Icon';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export default function Layout() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    api.getPublicSettings()
      .then((settings) => {
        if (!isMounted) return;
        if (settings && settings.site_mode === 'coming_soon') {
          // Exemptions: /privacy-policy, /admin-panel, and staff users previewing
          const isExempt = location.pathname === '/privacy-policy' || location.pathname.startsWith('/admin-panel');
          const isStaff = Boolean(user && user.is_staff);
          if (!isExempt && !isStaff) {
            navigate('/coming-soon', { replace: true });
          }
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [location.pathname, user, navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-white text-brand-ink font-sans">
      {/* Skip to Content for WCAG 2.1 AA Keyboard Accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:bg-brand-ink focus:text-white focus:px-4 focus:py-2 focus:rounded-sm focus:shadow-md text-xs font-semibold uppercase tracking-wider"
      >
        Skip to main content
      </a>

      {/* Primary Sticky Header & Announcement Bar */}
      <Header />

      {/* Main Outlet */}
      <main id="main-content" className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <Footer />

      {/* Cookie Consent Notice */}
      <CookieNotice />

      {/* Floating WhatsApp Quick Contact Button (Accessible, zero emojis) */}
      <a
        href="https://wa.me/923000000000"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Order or get assistance via WhatsApp"
        className="fixed bottom-5 right-5 z-40 bg-[#25D366] hover:bg-[#128C7E] text-white p-3.5 rounded-full shadow-hover flex items-center justify-center transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#25D366]"
      >
        <Icon name="whatsapp" className="text-2xl text-white" />
      </a>
    </div>
  );
}
