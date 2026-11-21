import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Icon from '../ui/Icon';
import logoImg from '../../assets/brand/logo.png';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export default function Header({ cartCount: propCartCount }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [drawerMultiOpen, setDrawerMultiOpen] = useState(false);
  const [drawerShopOpen, setDrawerShopOpen] = useState(false);
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

  // Close open popovers and drawer on route change
  useEffect(() => {
    setActiveDropdown(null);
    setSearchFocused(false);
    setMobileMenuOpen(false);
    setMobileSearchOpen(false);
    setDrawerMultiOpen(false);
    setDrawerShopOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // Escape key listener to close drawer and search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setMobileSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
      setMobileSearchOpen(false);
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
        {/* A. Mobile View Navbar (lg:hidden) - Exactly like Nutrifactor reference */}
        <div className="lg:hidden max-w-site mx-auto px-3 h-[60px] flex items-center justify-between">
          {/* Left: Hamburger Button + Search Button */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 text-brand-ink hover:text-brand-green rounded-md focus:outline-none transition-colors"
              aria-label="Toggle navigation menu"
            >
              <Icon name="bars" className="text-xl" />
            </button>
            <button
              type="button"
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className="p-2 text-brand-ink hover:text-brand-green rounded-md focus:outline-none transition-colors"
              aria-label="Toggle search bar"
            >
              <Icon name={mobileSearchOpen ? 'close' : 'search'} className="text-lg" />
            </button>
          </div>

          {/* Center: Brand Logo */}
          <Link to="/" className="flex items-center justify-center py-1" aria-label="Supplivix Home">
            <img
              src={logoImg}
              alt="Supplivix"
              width="160"
              height="44"
              className="h-8 sm:h-10 md:h-11 w-auto object-contain cursor-pointer"
            />
          </Link>

          {/* Right: Cart Button */}
          <Link
            to="/cart"
            className="relative p-2 text-brand-ink hover:text-brand-green transition-colors flex items-center justify-center"
            aria-label="Shopping Cart"
          >
            <Icon name="cart" className="text-xl" />
            <span
              className={`absolute top-1 right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[10px] font-bold text-white transition-transform ${
                cartCount > 0 ? 'bg-brand-green scale-100' : 'bg-brand-ink scale-95'
              }`}
            >
              {cartCount}
            </span>
          </Link>
        </div>

        {/* Mobile Search Bar Dropdown */}
        {mobileSearchOpen && (
          <div className="lg:hidden bg-surface-subtle border-t border-surface-border px-4 py-2.5 shadow-sm animate-fadeIn">
            <form
              onSubmit={handleSearchSubmit}
              className="flex items-center bg-white border border-surface-border rounded-md px-3 py-1.5 focus-within:ring-2 focus-within:ring-brand-green"
            >
              <input
                type="text"
                placeholder="Search vitamins, skin care..."
                value={searchQuery}
                autoFocus
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-xs text-brand-ink w-full placeholder:text-ink-muted"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="text-ink-muted hover:text-brand-ink mr-2 focus:outline-none"
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
          </div>
        )}

        {/* B. Desktop View Navbar (hidden lg:flex) */}
        <div className="hidden lg:flex max-w-site mx-auto px-4 xl:px-6 h-[80px] xl:h-[84px] items-center justify-between gap-3 xl:gap-4">
          {/* Logo on Left */}
          <Link to="/" className="flex-shrink-0" aria-label="Supplivix Home">
            <img
              src={logoImg}
              alt="Supplivix - Pure Science & Wellness"
              width="210"
              height="70"
              className="h-16 xl:h-[70px] w-auto object-contain cursor-pointer transition-transform duration-150 hover:scale-[1.02]"
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

          </div>
        </div>
      </header>

      {/* 3. Mobile Off-Canvas Side Drawer */}
      {/* Backdrop Overlay */}
      <div
        className={`fixed inset-0 bg-black/60 z-50 transition-opacity duration-300 lg:hidden ${
          mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden="true"
      />

      {/* Side Drawer Panel */}
      <aside
        className={`fixed top-0 bottom-0 left-0 w-[300px] sm:w-[340px] max-w-[85vw] bg-white z-50 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out lg:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Navigation Drawer"
        aria-hidden={!mobileMenuOpen}
      >
        {/* Drawer Header with Logo & Close Button */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center"
            aria-label="Supplivix Home"
          >
            <img
              src={logoImg}
              alt="Supplivix Drawer Logo"
              width="150"
              height="48"
              className="h-10 w-auto object-contain cursor-pointer"
            />
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 text-ink-muted hover:text-brand-ink rounded-md transition-colors"
            aria-label="Close menu drawer"
          >
            <Icon name="close" className="text-lg" />
          </button>
        </div>

        {/* Drawer Search Bar */}
        <div className="p-4 border-b border-surface-border bg-surface-subtle">
          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center bg-white border border-surface-border rounded-md px-3 py-2 focus-within:ring-2 focus-within:ring-brand-green"
          >
            <input
              type="text"
              placeholder="Search vitamins, skin care..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-brand-ink w-full placeholder:text-ink-muted"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="text-ink-muted hover:text-brand-ink mr-2 focus:outline-none"
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
        </div>

        {/* Scrollable Navigation Menu */}
        <nav className="flex-1 overflow-y-auto px-4 py-3 divide-y divide-surface-border text-sm">
          {/* Home */}
          <div className="py-2.5">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`block font-semibold transition-colors ${
                isActive('/') ? 'text-brand-green font-bold' : 'text-brand-ink hover:text-brand-green'
              }`}
            >
              Home
            </Link>
          </div>

          {/* Multivitamins (Collapsible Accordion) */}
          <div className="py-2.5">
            <div className="flex items-center justify-between">
              <Link
                to="/multivitamins"
                onClick={() => setMobileMenuOpen(false)}
                className={`font-semibold transition-colors ${
                  isActive('/multivitamins') ? 'text-brand-green font-bold' : 'text-brand-ink hover:text-brand-green'
                }`}
              >
                Multivitamins Hub
              </Link>
              <button
                type="button"
                onClick={() => setDrawerMultiOpen(!drawerMultiOpen)}
                className="p-1.5 text-ink-muted hover:text-brand-green transition-transform"
                aria-label="Toggle multivitamins submenu"
              >
                <Icon
                  name="chevron-down"
                  className={`text-xs transition-transform duration-200 ${
                    drawerMultiOpen ? 'rotate-180 text-brand-green' : ''
                  }`}
                />
              </button>
            </div>
            {drawerMultiOpen && (
              <div className="mt-2 ml-2 pl-3 border-l-2 border-brand-green/30 space-y-1.5 pt-1 text-xs text-ink-muted animate-fadeIn">
                <Link
                  to="/multivitamins"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block hover:text-brand-green py-1 font-semibold text-brand-green"
                >
                  Overview & Formulations
                </Link>
                <Link
                  to="/shop?q=immunity"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block hover:text-brand-green py-1"
                >
                  Immune Shield (Vitamin C + Zinc)
                </Link>
                <Link
                  to="/shop?q=multivitamin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block hover:text-brand-green py-1"
                >
                  Complete Daily Multi 60s
                </Link>
                <Link
                  to="/shop?q=biotin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block hover:text-brand-green py-1"
                >
                  Biotin Glow Complex
                </Link>
              </div>
            )}
          </div>

          {/* All Products (Collapsible Accordion) */}
          <div className="py-2.5">
            <div className="flex items-center justify-between">
              <Link
                to="/shop"
                onClick={() => setMobileMenuOpen(false)}
                className={`font-semibold transition-colors ${
                  isActive('/shop') ? 'text-brand-green font-bold' : 'text-brand-ink hover:text-brand-green'
                }`}
              >
                All Products
              </Link>
              <button
                type="button"
                onClick={() => setDrawerShopOpen(!drawerShopOpen)}
                className="p-1.5 text-ink-muted hover:text-brand-green transition-transform"
                aria-label="Toggle all products submenu"
              >
                <Icon
                  name="chevron-down"
                  className={`text-xs transition-transform duration-200 ${
                    drawerShopOpen ? 'rotate-180 text-brand-green' : ''
                  }`}
                />
              </button>
            </div>
            {drawerShopOpen && (
              <div className="mt-2 ml-2 pl-3 border-l-2 border-brand-green/30 space-y-1.5 pt-1 text-xs text-ink-muted animate-fadeIn">
                <Link
                  to="/shop"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block hover:text-brand-green py-1 font-semibold text-brand-ink"
                >
                  Browse Entire Catalog
                </Link>
                {navCategories.map((c) => (
                  <Link
                    key={c.slug}
                    to={c.slug === 'multivitamins' ? '/multivitamins' : `/shop?category=${c.slug}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block hover:text-brand-green py-1"
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Special Offers */}
          {dealsEnabled && (
            <div className="py-2.5">
              <Link
                to="/offers"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between font-semibold transition-colors ${
                  isActive('/offers') ? 'text-brand-green font-bold' : 'text-brand-ink hover:text-brand-green'
                }`}
              >
                <span>Special Offers</span>
                <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full uppercase">
                  Deals
                </span>
              </Link>
            </div>
          )}

          {/* About Us */}
          <div className="py-2.5">
            <Link
              to="/about"
              onClick={() => setMobileMenuOpen(false)}
              className={`block font-semibold transition-colors ${
                isActive('/about') ? 'text-brand-green font-bold' : 'text-brand-ink hover:text-brand-green'
              }`}
            >
              About Us
            </Link>
          </div>

          {/* Contact Us */}
          <div className="py-2.5">
            <Link
              to="/contact"
              onClick={() => setMobileMenuOpen(false)}
              className={`block font-semibold transition-colors ${
                isActive('/contact') ? 'text-brand-green font-bold' : 'text-brand-ink hover:text-brand-green'
              }`}
            >
              Contact Us
            </Link>
          </div>

          {/* Track Order */}
          <div className="py-2.5">
            <Link
              to="/track"
              onClick={() => setMobileMenuOpen(false)}
              className={`block font-semibold transition-colors ${
                isActive('/track') ? 'text-brand-green font-bold' : 'text-brand-ink hover:text-brand-green'
              }`}
            >
              Track Your Order
            </Link>
          </div>

          {/* Customer Account / Sign In */}
          <div className="py-3">
            {user ? (
              <div className="space-y-1.5">
                <span className="text-[10px] text-ink-muted uppercase block font-semibold">
                  Signed in as {user.full_name || user.email}
                </span>
                {user.is_staff ? (
                  <Link
                    to="/admin-panel"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-brand-green font-bold hover:underline"
                  >
                    Admin Dashboard
                  </Link>
                ) : (
                  <Link
                    to="/account"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-brand-ink hover:text-brand-green font-medium"
                  >
                    Account Dashboard
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (logout) logout();
                    setMobileMenuOpen(false);
                  }}
                  className="text-xs text-status-error font-medium hover:underline pt-1 block"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 pt-1">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center py-2 px-3 bg-brand-green text-white rounded-sm text-xs font-bold hover:bg-brand-ink transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center py-2 px-3 border border-surface-border text-brand-ink rounded-sm text-xs font-semibold hover:bg-surface-subtle transition-colors"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </nav>

        {/* Drawer Footer with Quick Contact */}
        <div className="p-4 bg-surface-subtle border-t border-surface-border text-xs space-y-2.5">
          <a
            href="https://wa.me/923025222405"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-brand-ink hover:text-brand-green font-semibold"
          >
            <Icon name="whatsapp" className="text-base text-[#25D366]" />
            <span>WhatsApp Care: 0302-5222405</span>
          </a>
          <a
            href="https://www.instagram.com/supp.livix?utm_source=qr&xtok=YWhramgxNjNqOGI2"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-brand-ink hover:text-brand-green font-semibold"
          >
            <Icon name="instagram" className="text-base text-[#E4405F]" />
            <span>Follow @supp.livix</span>
          </a>
          <p className="text-[11px] text-ink-muted leading-tight pt-1">
            Chak No. 79 NB, Sillanwali Road, near bypass, Sargodha
          </p>
        </div>
      </aside>
    </>
  );
}
