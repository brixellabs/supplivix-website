import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Icon from '../ui/Icon';
import logoImg from '../../assets/brand/logo.png';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export default function Header({ cartCount: propCartCount }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const cartContext = useCart();
  const authContext = useAuth();
  const user = authContext?.user;
  const logout = authContext?.logout;

  const cartCount = propCartCount !== undefined ? propCartCount : (cartContext?.totalCount || 0);

  const searchContainerRef = useRef(null);
  const accountMenuRef = useRef(null);
  const navMenuRef = useRef(null);

  const [shippingThreshold, setShippingThreshold] = useState(2000);
  const [dealsEnabled, setDealsEnabled] = useState(true);
  const [announcementBarEnabled, setAnnouncementBarEnabled] = useState(true);
  const [announcementTextPrimary, setAnnouncementTextPrimary] = useState('');
  const [announcementTextSecondary, setAnnouncementTextSecondary] = useState('');

  const [navCategories, setNavCategories] = useState([
    { name: 'Multivitamins Category', slug: 'multivitamins' },
    { name: 'Skincare & Serums', slug: 'skincare' },
  ]);

  useEffect(() => {
    let active = true;
    api.getPublicSettings?.()
      .then((res) => {
        if (!active) return;
        const val = Number(res?.free_shipping_threshold || res?.data?.free_shipping_threshold);
        if (val > 0) setShippingThreshold(val);
        if (res?.deals_enabled !== undefined) {
          setDealsEnabled(Boolean(res.deals_enabled));
        }
        if (res?.announcement_bar_enabled !== undefined) {
          setAnnouncementBarEnabled(Boolean(res.announcement_bar_enabled));
        }
        if (res?.announcement_text_primary !== undefined) {
          setAnnouncementTextPrimary(String(res.announcement_text_primary));
        }
        if (res?.announcement_text_secondary !== undefined) {
          setAnnouncementTextSecondary(String(res.announcement_text_secondary));
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    api.getCategories()
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data) ? data : (data?.results || []);
        if (list.length > 0) {
          const flat = [];
          const seen = new Set();
          const addC = (c) => {
            if (!c || !c.slug || seen.has(c.slug)) return;
            seen.add(c.slug);
            flat.push({ name: c.name, slug: c.slug });
          };
          for (const item of list) {
            addC(item);
            if (item.children && Array.isArray(item.children)) {
              for (const child of item.children) addC(child);
            }
          }
          if (flat.length > 0) setNavCategories(flat);
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  // Close open popovers on route change
  useEffect(() => {
    setActiveDropdown(null);
    setSearchFocused(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Click outside listener for interactive dropdowns
  useEffect(() => {
    function handleClickOutside(event) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) {
        setActiveDropdown((prev) => (prev === 'account' ? null : prev));
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setSearchFocused(false);
      }
      if (navMenuRef.current && !navMenuRef.current.contains(event.target)) {
        setActiveDropdown((prev) => (prev === 'multi' || prev === 'shop' ? null : prev));
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchFocused(false);
      setMobileMenuOpen(false);
    }
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <>
      {/* 1. Top Announcement Bar */}
      {announcementBarEnabled && (
        <div className="bg-brand-lavender text-brand-purple text-[11px] sm:text-xs font-semibold text-center py-2 px-3">
          <div className="max-w-site mx-auto flex items-center justify-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5">
              <Icon name="truck" className="text-xs" />
              <span>
                {announcementTextPrimary
                  ? announcementTextPrimary.replace('{threshold}', shippingThreshold.toLocaleString())
                  : `Free delivery on orders above Rs. ${shippingThreshold.toLocaleString()}`}
              </span>
            </span>
            {(announcementTextSecondary !== '' ? announcementTextSecondary : 'Cash on Delivery (COD) Across Pakistan') && (
              <>
                <span className="hidden sm:inline opacity-60">|</span>
                <span className="hidden sm:inline-flex items-center gap-1">
                  <Icon name="cod" className="text-xs" />
                  <span>
                    {announcementTextSecondary !== '' ? announcementTextSecondary : 'Cash on Delivery (COD) Across Pakistan'}
                  </span>
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* 2. Main Sticky Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-surface-border">
        <div className="max-w-site mx-auto px-3 sm:px-6 h-[58px] sm:h-[68px] flex items-center justify-between gap-2 sm:gap-3 xl:gap-4">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0" aria-label="Supplivix Home">
            <img
              src={logoImg}
              alt="Supplivix"
              width="160"
              height="44"
              className="h-8 sm:h-10 md:h-11 w-auto object-contain cursor-pointer transition-transform duration-150 hover:scale-[1.02]"
            />
          </Link>

          {/* Desktop Navigation with Interactive Links & Dropdowns */}
          <nav
            ref={navMenuRef}
            className="hidden lg:flex items-center gap-3.5 xl:gap-5 text-[13px] xl:text-sm font-medium tracking-wide whitespace-nowrap"
          >
            <Link
              to="/"
              className={`whitespace-nowrap transition-colors py-1 border-b-2 ${
                isActive('/')
                  ? 'text-brand-green font-bold border-brand-green'
                  : 'text-brand-ink hover:text-brand-green border-transparent hover:border-brand-green/30'
              }`}
            >
              Home
            </Link>

            {/* Multivitamins Menu with Interactive Dropdown */}
            <div
              className="relative group py-2"
              onMouseEnter={() => setActiveDropdown('multi')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <Link
                to="/multivitamins"
                className={`inline-flex items-center gap-1 whitespace-nowrap transition-colors py-1 border-b-2 ${
                  isActive('/multivitamins')
                    ? 'text-brand-green font-bold border-brand-green'
                    : 'text-brand-ink hover:text-brand-green border-transparent hover:border-brand-green/30'
                }`}
              >
                <span>Multivitamins</span>
                <Icon
                  name="chevron-down"
                  className={`text-[9px] transition-transform duration-150 ${
                    activeDropdown === 'multi' ? 'rotate-180 text-brand-green' : 'text-ink-muted'
                  }`}
                />
              </Link>

              {activeDropdown === 'multi' && (
                <div className="absolute left-0 top-full w-64 bg-white border border-surface-border rounded-md shadow-solid-md p-2 z-50">
                  <Link
                    to="/multivitamins"
                    className="block px-3 py-2 rounded-sm hover:bg-surface-subtle transition-colors text-xs font-bold text-brand-green border-b border-surface-border mb-1"
                  >
                    Multivitamins Hub Overview
                    <span className="block text-[10px] font-normal text-ink-muted">
                      Bioavailable daily nutrition for Pakistan
                    </span>
                  </Link>
                  <Link
                    to="/shop?q=immunity"
                    className="block px-3 py-1.5 rounded-sm hover:bg-surface-subtle transition-colors text-xs text-brand-ink hover:text-brand-green"
                  >
                    Immune Shield (Vitamin C + Zinc)
                  </Link>
                  <Link
                    to="/shop?q=multivitamin"
                    className="block px-3 py-1.5 rounded-sm hover:bg-surface-subtle transition-colors text-xs text-brand-ink hover:text-brand-green"
                  >
                    Complete Daily Multi 60s
                  </Link>
                  <Link
                    to="/shop?q=biotin"
                    className="block px-3 py-1.5 rounded-sm hover:bg-surface-subtle transition-colors text-xs text-brand-ink hover:text-brand-green"
                  >
                    Biotin Glow Complex
                  </Link>
                </div>
              )}
            </div>

            {/* All Products Menu with Interactive Dropdown */}
            <div
              className="relative group py-2"
              onMouseEnter={() => setActiveDropdown('shop')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <Link
                to="/shop"
                className={`inline-flex items-center gap-1 whitespace-nowrap transition-colors py-1 border-b-2 ${
                  isActive('/shop')
                    ? 'text-brand-green font-bold border-brand-green'
                    : 'text-brand-ink hover:text-brand-green border-transparent hover:border-brand-green/30'
                }`}
              >
                <span>All Products</span>
                <Icon
                  name="chevron-down"
                  className={`text-[9px] transition-transform duration-150 ${
                    activeDropdown === 'shop' ? 'rotate-180 text-brand-green' : 'text-ink-muted'
                  }`}
                />
              </Link>

              {activeDropdown === 'shop' && (
                <div className="absolute left-0 top-full w-56 bg-white border border-surface-border rounded-md shadow-solid-md p-2 z-50 max-h-80 overflow-y-auto">
                  <Link
                    to="/shop"
                    className="block px-3 py-2 rounded-sm hover:bg-surface-subtle transition-colors text-xs font-bold text-brand-ink border-b border-surface-border mb-1"
                  >
                    Browse All Formulations
                  </Link>
                  {navCategories.map((c) => (
                    <Link
                      key={c.slug}
                      to={c.slug === 'multivitamins' ? '/multivitamins' : `/shop?category=${c.slug}`}
                      className="block px-3 py-1.5 rounded-sm hover:bg-surface-subtle transition-colors text-xs text-brand-ink hover:text-brand-green"
                    >
                      {c.name}
                    </Link>
                  ))}
                  {dealsEnabled && (
                    <Link
                      to="/offers"
                      className="block px-3 py-1.5 rounded-sm hover:bg-surface-subtle transition-colors text-xs font-medium text-brand-purple border-t border-surface-border mt-1 pt-1.5"
                    >
                      Special Offers & Bundles
                    </Link>
                  )}
                </div>
              )}
            </div>

            {dealsEnabled && (
              <Link
                to="/offers"
                className={`whitespace-nowrap transition-colors py-1 border-b-2 ${
                  isActive('/offers')
                    ? 'text-brand-green font-bold border-brand-green'
                    : 'text-brand-ink hover:text-brand-green border-transparent hover:border-brand-green/30'
                }`}
              >
                Offers
              </Link>
            )}
            <Link
              to="/about"
              className={`whitespace-nowrap transition-colors py-1 border-b-2 ${
                isActive('/about')
                  ? 'text-brand-green font-bold border-brand-green'
                  : 'text-brand-ink hover:text-brand-green border-transparent hover:border-brand-green/30'
              }`}
            >
              About Us
            </Link>
            <Link
              to="/contact"
              className={`whitespace-nowrap transition-colors py-1 border-b-2 ${
                isActive('/contact')
                  ? 'text-brand-green font-bold border-brand-green'
                  : 'text-brand-ink hover:text-brand-green border-transparent hover:border-brand-green/30'
              }`}
            >
              Contact
            </Link>
            <Link
              to="/track"
              className={`whitespace-nowrap transition-colors py-1 border-b-2 ${
                isActive('/track')
                  ? 'text-brand-green font-bold border-brand-green'
                  : 'text-brand-ink hover:text-brand-green border-transparent hover:border-brand-green/30'
              }`}
            >
              Track Order
            </Link>
          </nav>

          {/* Interactive Search Bar (Desktop) with Live Suggestions */}
          <div ref={searchContainerRef} className="relative hidden md:block">
            <form
              onSubmit={handleSearchSubmit}
              className={`flex items-center bg-surface-subtle border rounded-md px-3 py-1.5 w-44 lg:w-48 xl:w-56 shrink transition-all duration-150 ${
                searchFocused
                  ? 'border-brand-green ring-2 ring-brand-green bg-white shadow-sm'
                  : 'border-surface-border'
              }`}
            >
              <input
                type="text"
                placeholder="Search vitamins, skin care..."
                value={searchQuery}
                onFocus={() => setSearchFocused(true)}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-xs text-brand-ink w-full placeholder:text-ink-muted"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="text-ink-muted hover:text-brand-ink mr-1 focus:outline-none"
                >
                  <Icon name="close" className="text-[10px]" />
                </button>
              )}
              <button
                type="submit"
                aria-label="Search"
                className="text-ink-muted hover:text-brand-green ml-1 focus:outline-none"
              >
                <Icon name="search" className="text-xs" />
              </button>
            </form>

            {/* Quick Suggestions Popover */}
            {searchFocused && (
              <div className="absolute right-0 top-full mt-1.5 w-64 bg-white border border-surface-border rounded-md shadow-solid-md p-2 z-50 text-xs">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-ink-muted px-2 py-1">
                  Popular Searches
                </span>
                {[
                  { label: 'Multivitamins Hub', path: '/multivitamins' },
                  { label: 'Immunity Shield (Zinc + C)', path: '/shop?q=immunity' },
                  { label: 'Retinol Youth Serum 30ml', path: '/shop?q=retinol' },
                  { label: 'Mineral Sunscreen SPF 50', path: '/shop?q=sunscreen' },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onMouseDown={() => {
                      navigate(item.path);
                      setSearchFocused(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-sm hover:bg-surface-subtle text-brand-ink hover:text-brand-green flex items-center justify-between transition-colors"
                  >
                    <span>{item.label}</span>
                    <Icon name="chevron-right" className="text-[10px] text-ink-muted" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Action Icons (User Account Popover, Cart, Mobile Burger) */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* User Account Popover */}
            <div ref={accountMenuRef} className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === 'account' ? null : 'account')}
                aria-label="User Account"
                className={`flex items-center justify-center p-2 rounded-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green ${
                  activeDropdown === 'account' || isActive('/account')
                    ? 'text-brand-green bg-surface-subtle'
                    : 'text-brand-ink hover:text-brand-green'
                }`}
              >
                <Icon name="user" className="text-base" />
              </button>

              {activeDropdown === 'account' && (
                <div className="absolute right-0 top-full mt-1.5 w-56 bg-white border border-surface-border rounded-md shadow-solid-md p-2 z-50 text-xs">
                  {user ? (
                    <>
                      <div className="px-3 py-2 border-b border-surface-border mb-1">
                        <span className="text-[10px] text-ink-muted uppercase block font-semibold">
                          {user.is_staff ? 'Staff Admin' : 'Signed In'}
                        </span>
                        <span className="font-bold text-brand-ink truncate block">
                          {user.full_name || user.email}
                        </span>
                      </div>
                      {user.is_staff ? (
                        <Link
                          to="/admin-panel"
                          onClick={() => setActiveDropdown(null)}
                          className="block px-3 py-1.5 rounded-sm bg-surface-subtle hover:bg-surface-accent text-brand-green font-bold"
                        >
                          Admin Dashboard
                        </Link>
                      ) : (
                        <Link
                          to="/account"
                          onClick={() => setActiveDropdown(null)}
                          className="block px-3 py-1.5 rounded-sm hover:bg-surface-subtle text-brand-ink hover:text-brand-green font-medium"
                        >
                          Account Dashboard
                        </Link>
                      )}
                      <Link
                        to="/track"
                        onClick={() => setActiveDropdown(null)}
                        className="block px-3 py-1.5 rounded-sm hover:bg-surface-subtle text-brand-ink hover:text-brand-green"
                      >
                        Track Orders
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          if (logout) logout();
                          setActiveDropdown(null);
                        }}
                        className="w-full text-left px-3 py-1.5 rounded-sm hover:bg-red-50 text-status-error font-medium border-t border-surface-border mt-1"
                      >
                        Sign Out
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="px-3 py-1.5 border-b border-surface-border mb-1">
                        <span className="font-bold text-brand-ink block">Customer Account</span>
                        <span className="text-[10px] text-ink-muted block">
                          Sign in for faster checkouts
                        </span>
                      </div>
                      <Link
                        to="/login"
                        onClick={() => setActiveDropdown(null)}
                        className="block px-3 py-1.5 rounded-sm bg-brand-green text-white font-bold text-center mb-1 hover:bg-brand-ink transition-colors"
                      >
                        Sign In
                      </Link>
                      <Link
                        to="/register"
                        onClick={() => setActiveDropdown(null)}
                        className="block px-3 py-1.5 rounded-sm hover:bg-surface-subtle text-brand-ink text-center font-medium"
                      >
                        Create Account
                      </Link>
                      <Link
                        to="/track"
                        onClick={() => setActiveDropdown(null)}
                        className="block px-3 py-1.5 rounded-sm hover:bg-surface-subtle text-brand-ink text-center text-ink-muted border-t border-surface-border mt-1"
                      >
                        Track Order
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Cart Button with Micro-Interaction */}
            <Link
              to="/cart"
              className="inline-flex items-center gap-1.5 sm:gap-2 bg-brand-ink text-white hover:bg-brand-green active:scale-95 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-sm text-xs font-semibold uppercase tracking-wider transition-all duration-150 shadow-solid-sm hover:shadow-solid-md"
            >
              <Icon name="cart" />
              <span className="hidden sm:inline">Cart</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold transition-transform ${
                  cartCount > 0 ? 'bg-brand-green text-white scale-105' : 'bg-gray-700 text-gray-300'
                }`}
              >
                {cartCount}
              </span>
              <span className="sr-only">items in cart</span>
            </Link>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 sm:p-2 text-brand-ink hover:text-brand-green rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green transition-colors"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              <Icon name={mobileMenuOpen ? 'close' : 'bars'} className="text-xl" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Sheet (Solid background, NO glassmorphism) */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-surface-border px-6 py-4 shadow-md flex flex-col gap-3 animate-fadeIn">
            <form
              onSubmit={handleSearchSubmit}
              className="flex items-center bg-surface-subtle border border-surface-border rounded-md px-3 py-2 mb-2 focus-within:ring-2 focus-within:ring-brand-green"
            >
              <input
                type="text"
                placeholder="Search vitamins, skin care..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-sm text-brand-ink w-full"
              />
              <button type="submit" aria-label="Search" className="text-ink-muted hover:text-brand-green ml-2">
                <Icon name="search" />
              </button>
            </form>

            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`text-sm font-semibold py-2 border-b border-surface-border transition-colors ${
                isActive('/') ? 'text-brand-green font-bold' : 'text-brand-ink hover:text-brand-green'
              }`}
            >
              Home
            </Link>
            <Link
              to="/multivitamins"
              onClick={() => setMobileMenuOpen(false)}
              className={`text-sm py-2 border-b border-surface-border transition-colors ${
                isActive('/multivitamins') ? 'text-brand-green font-bold' : 'text-brand-ink hover:text-brand-green'
              }`}
            >
              Multivitamins Hub
            </Link>
            <Link
              to="/shop"
              onClick={() => setMobileMenuOpen(false)}
              className={`text-sm font-semibold py-2 border-b border-surface-border transition-colors ${
                isActive('/shop') ? 'text-brand-green font-bold' : 'text-brand-ink hover:text-brand-green'
              }`}
            >
              All Products
            </Link>
            {dealsEnabled && (
              <Link
                to="/offers"
                onClick={() => setMobileMenuOpen(false)}
                className={`text-sm font-semibold py-2 border-b border-surface-border transition-colors ${
                  isActive('/offers') ? 'text-brand-green font-bold' : 'text-brand-ink hover:text-brand-green'
                }`}
              >
                Special Offers
              </Link>
            )}
            <Link
              to="/about"
              onClick={() => setMobileMenuOpen(false)}
              className={`text-sm font-semibold py-2 border-b border-surface-border transition-colors ${
                isActive('/about') ? 'text-brand-green font-bold' : 'text-brand-ink hover:text-brand-green'
              }`}
            >
              About Us
            </Link>
            <Link
              to="/contact"
              onClick={() => setMobileMenuOpen(false)}
              className={`text-sm font-semibold py-2 border-b border-surface-border transition-colors ${
                isActive('/contact') ? 'text-brand-green font-bold' : 'text-brand-ink hover:text-brand-green'
              }`}
            >
              Contact Us
            </Link>
            <Link
              to="/track"
              onClick={() => setMobileMenuOpen(false)}
              className={`text-sm font-semibold py-2 border-b border-surface-border transition-colors ${
                isActive('/track') ? 'text-brand-green font-bold' : 'text-brand-ink hover:text-brand-green'
              }`}
            >
              Track Your Order
            </Link>
            {user?.is_staff ? (
              <Link
                to="/admin-panel"
                onClick={() => setMobileMenuOpen(false)}
                className={`text-sm font-bold py-2 transition-colors ${
                  isActive('/admin-panel') ? 'text-brand-green font-bold' : 'text-brand-green hover:underline'
                }`}
              >
                Admin Dashboard
              </Link>
            ) : (
              <Link
                to="/account"
                onClick={() => setMobileMenuOpen(false)}
                className={`text-sm font-semibold py-2 transition-colors ${
                  isActive('/account') ? 'text-brand-green font-bold' : 'text-brand-ink hover:text-brand-green'
                }`}
              >
                My Account / Orders
              </Link>
            )}

            {/* Mobile Drawer Social Links */}
            <div className="pt-3 border-t border-surface-border flex items-center justify-between text-xs text-ink-muted">
              <span className="font-semibold text-brand-ink">Follow Us:</span>
              <div className="flex items-center gap-3 text-base text-brand-ink">
                <a
                  href="https://www.instagram.com/supp.livix?utm_source=qr&xtok=YWhramgxNjNqOGI2"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Supplivix on Instagram (@supp.livix)"
                  className="hover:text-brand-green transition-colors flex items-center gap-1.5 text-xs font-semibold"
                >
                  <Icon name="instagram" className="text-base text-brand-green" />
                  <span>@supp.livix</span>
                </a>
                <a
                  href="https://wa.me/923025222405"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  className="hover:text-brand-green transition-colors"
                >
                  <Icon name="whatsapp" className="text-base text-brand-green" />
                </a>
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
