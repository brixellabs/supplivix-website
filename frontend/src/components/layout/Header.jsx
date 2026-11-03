import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../ui/Icon';
import logoImg from '../../assets/brand/logo.png';
import { useCart } from '../../context/CartContext';

export default function Header({ cartCount: propCartCount }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const cartContext = useCart();
  const cartCount = propCartCount !== undefined ? propCartCount : (cartContext?.totalCount || 0);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?q=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
  };

  return (
    <>
      {/* 1. Top Announcement Bar */}
      <div className="bg-brand-lavender text-brand-purple text-xs font-semibold text-center py-2 px-3">
        <div className="max-w-site mx-auto flex items-center justify-center gap-2">
          <Icon name="truck" className="text-xs" />
          <span>Free delivery on orders above Rs. 2,000</span>
          <span className="hidden sm:inline">|</span>
          <span className="hidden sm:inline">
            <Icon name="cod" className="mr-1 text-xs" />
            Cash on Delivery (COD) Across Pakistan
          </span>
        </div>
      </div>

      {/* 2. Main Sticky Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-surface-border">
        <div className="max-w-site mx-auto px-4 sm:px-6 h-[68px] flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0" aria-label="Supplivix Home">
            <img
              src={logoImg}
              alt="Supplivix"
              width="160"
              height="44"
              className="h-10 sm:h-11 w-auto object-contain cursor-pointer"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium tracking-wide">
            <Link to="/" className="hover:text-brand-green transition-colors">Home</Link>
            <Link to="/multivitamins" className="font-semibold text-brand-ink hover:text-brand-green transition-colors">
              Multivitamins
            </Link>
            <Link to="/shop" className="hover:text-brand-green transition-colors">All Products</Link>
            <Link to="/offers" className="hover:text-brand-green transition-colors">Offers</Link>
            <Link to="/about" className="hover:text-brand-green transition-colors">About Us</Link>
            <Link to="/contact" className="hover:text-brand-green transition-colors">Contact</Link>
            <Link to="/track" className="hover:text-brand-green transition-colors">Track Order</Link>
          </nav>

          {/* Search Bar (Desktop) */}
          <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center bg-surface-subtle border border-surface-border rounded-md px-3 py-1.5 w-60 focus-within:ring-2 focus-within:ring-brand-green">
            <input
              type="text"
              placeholder="Search vitamins, skin care..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-brand-ink w-full placeholder:text-ink-muted"
            />
            <button type="submit" aria-label="Search" className="text-ink-muted hover:text-brand-green ml-1">
              <Icon name="search" className="text-xs" />
            </button>
          </form>

          {/* Right Action Icons (User Account, Cart, Mobile Burger) */}
          <div className="flex items-center gap-3">
            <Link
              to="/account"
              aria-label="User Account"
              className="hidden sm:flex items-center justify-center p-2 text-brand-ink hover:text-brand-green rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green"
            >
              <Icon name="user" className="text-base" />
            </Link>

            <Link
              to="/cart"
              className="inline-flex items-center gap-2 bg-brand-ink text-white hover:bg-brand-green px-3.5 py-2 rounded-sm text-xs font-semibold uppercase tracking-wider transition-colors shadow-solid-sm"
            >
              <Icon name="cart" />
              <span>Cart</span>
              <span className="bg-brand-green text-white px-1.5 py-0.2 rounded-full text-[11px] font-bold">
                {cartCount}
              </span>
              <span className="sr-only">items</span>
            </Link>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-brand-ink hover:text-brand-green rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              <Icon name={mobileMenuOpen ? 'close' : 'bars'} className="text-xl" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Sheet (Solid background, NO glassmorphism) */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-surface-border px-6 py-4 shadow-md flex flex-col gap-3">
            <form onSubmit={handleSearchSubmit} className="flex items-center bg-surface-subtle border border-surface-border rounded-md px-3 py-2 mb-2">
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
              className="text-sm font-semibold py-2 border-b border-surface-border text-brand-ink hover:text-brand-green"
            >
              Home
            </Link>
            <Link
              to="/multivitamins"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-bold py-2 border-b border-surface-border text-brand-green"
            >
              Multivitamins Hub
            </Link>
            <Link
              to="/shop"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-semibold py-2 border-b border-surface-border text-brand-ink hover:text-brand-green"
            >
              All Products
            </Link>
            <Link
              to="/offers"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-semibold py-2 border-b border-surface-border text-brand-ink hover:text-brand-green"
            >
              Special Offers
            </Link>
            <Link
              to="/about"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-semibold py-2 border-b border-surface-border text-brand-ink hover:text-brand-green"
            >
              About Us
            </Link>
            <Link
              to="/contact"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-semibold py-2 border-b border-surface-border text-brand-ink hover:text-brand-green"
            >
              Contact Us
            </Link>
            <Link
              to="/track"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-semibold py-2 border-b border-surface-border text-brand-ink hover:text-brand-green"
            >
              Track Your Order
            </Link>
            <Link
              to="/account"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-semibold py-2 text-brand-ink hover:text-brand-green"
            >
              My Account / Orders
            </Link>
          </div>
        )}
      </header>
    </>
  );
}
