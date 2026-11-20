import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../ui/Icon';
import logoImg from '../../assets/brand/logo.png';
import { api } from '../../services/api';

export default function Footer() {
  const [dealsEnabled, setDealsEnabled] = useState(true);
  const [instagramUrl, setInstagramUrl] = useState('https://www.instagram.com/supp.livix?utm_source=qr&xtok=YWhramgxNjNqOGI2');
  const [facebookUrl, setFacebookUrl] = useState('https://facebook.com');

  useEffect(() => {
    let active = true;
    api.getPublicSettings?.()
      .then((res) => {
        if (!active) return;
        if (res?.deals_enabled !== undefined) {
          setDealsEnabled(Boolean(res.deals_enabled));
        }
        if (res?.instagram_url) {
          setInstagramUrl(res.instagram_url);
        }
        if (res?.facebook_url) {
          setFacebookUrl(res.facebook_url);
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);
  return (
    <footer className="bg-surface-subtle border-t border-surface-border text-brand-ink">
      {/* Upper Footer: 4-Column Grid */}
      <div className="max-w-site mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Column 1: Brand & Contact Info */}
          <div>
            <Link to="/" aria-label="Supplivix Home" className="inline-block mb-4">
              <img
                src={logoImg}
                alt="Supplivix"
                width="200"
                height="56"
                loading="lazy"
                className="h-12 sm:h-14 w-auto object-contain"
              />
            </Link>
            <p className="text-xs font-bold uppercase tracking-wide text-brand-ink mt-2 mb-1">
              Your Beauty. Your Wellness. Our Commitment.
            </p>
            <p className="text-[11px] font-semibold text-brand-green mb-1.5">
              Quality • Trust • Wellness
            </p>
            <p className="text-xs text-ink-muted leading-relaxed mb-2">
              We believe that true beauty begins with wellness, and quality should always come first. More Than Beauty. More Than Wellness.
            </p>
            <p className="text-[11px] font-bold text-brand-ink uppercase tracking-wider mb-4">
              Choose Quality. Choose SUPPLIVIX.
            </p>
            <div className="space-y-2 text-xs text-ink-muted">
              <a
                href="https://wa.me/923025222405"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 group cursor-pointer hover:text-brand-green transition-colors"
                title="Chat on WhatsApp (0302-5222405)"
              >
                <Icon name="phone" className="text-brand-green text-xs group-hover:scale-110 transition-transform" />
                <span className="group-hover:underline">0302-5222405</span>
              </a>

              <a
                href="https://mail.google.com/mail/?view=cm&fs=1&to=supplivix@gmail.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 group cursor-pointer hover:text-brand-green transition-colors"
                title="Open Gmail to email supplivix@gmail.com"
              >
                <Icon name="envelope" className="text-brand-green text-xs group-hover:scale-110 transition-transform" />
                <span className="group-hover:underline">supplivix@gmail.com</span>
              </a>

              <a
                href="https://www.google.com/maps/search/?api=1&query=Kohinoor+City,+Jaranwala+Road,+Faisalabad,+Punjab,+Pakistan"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 group cursor-pointer hover:text-brand-green transition-colors"
                title="View on Google Maps"
              >
                <Icon name="location" className="text-brand-green text-xs mt-0.5 group-hover:scale-110 transition-transform" />
                <span className="group-hover:underline">Kohinoor City, Jaranwala Road, Faisalabad, Pakistan</span>
              </a>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-ink mb-4">
              Explore Catalog
            </h3>
            <ul className="space-y-2.5 text-xs text-ink-muted font-medium">
              <li>
                <Link to="/multivitamins" className="hover:text-brand-green transition-colors">
                  Multivitamins Hub
                </Link>
              </li>
              <li>
                <Link to="/shop" className="hover:text-brand-green transition-colors">
                  All Products
                </Link>
              </li>
              <li>
                <Link to="/shop?category=skincare" className="hover:text-brand-green transition-colors">
                  Skin Care Formulations
                </Link>
              </li>
              {dealsEnabled && (
                <li>
                  <Link to="/offers" className="hover:text-brand-green transition-colors">
                    Value Bundles & Deals
                  </Link>
                </li>
              )}
              <li>
                <Link to="/track" className="hover:text-brand-green transition-colors">
                  Track Your Order
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Customer Care & Policies */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-ink mb-4">
              Customer Care
            </h3>
            <ul className="space-y-2.5 text-xs text-ink-muted font-medium">
              <li>
                <Link to="/shipping-policy" className="hover:text-brand-green transition-colors">
                  Cash on Delivery & Shipping
                </Link>
              </li>
              <li>
                <Link to="/privacy-policy" className="hover:text-brand-green transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-brand-green transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-brand-green transition-colors">
                  Help & Contact Us
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-brand-green transition-colors">
                  FAQs & Knowledge Base
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Payment & Social */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-ink mb-4">
              Payment & Delivery
            </h3>
            <div className="bg-white border border-surface-border p-3.5 rounded-md mb-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold text-brand-green mb-1">
                <Icon name="cod" className="text-sm" />
                <span>Cash on Delivery Only</span>
              </div>
              <p className="text-[11px] text-ink-muted leading-relaxed">
                Shop with complete peace of mind. Verify your parcel and pay cash to the courier rider upon delivery.
              </p>
            </div>
            <div className="flex items-center gap-3 text-lg text-brand-ink">
              <a
                href={facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Supplivix on Facebook"
                className="hover:text-brand-green transition-colors"
              >
                <Icon name="facebook" />
              </a>
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Supplivix on Instagram (@supp.livix)"
                className="hover:text-brand-green transition-colors"
                title="Follow Supplivix on Instagram (@supp.livix)"
              >
                <Icon name="instagram" />
              </a>
              <a
                href="https://wa.me/923025222405"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Chat with Supplivix on WhatsApp (0302-5222405)"
                className="hover:text-brand-green transition-colors"
              >
                <Icon name="whatsapp" />
              </a>
            </div>
          </div>
        </div>

        {/* Regulatory Health Disclaimer (Non-negotiable compliance rule 5) */}
        <div className="mt-10 pt-6 border-t border-surface-border">
          <div className="bg-white border border-surface-border rounded-md p-4 text-[11px] text-ink-muted leading-relaxed">
            <span className="font-bold text-brand-ink block mb-1">Regulatory Health Notice:</span>
            These statements have not been evaluated by a regulator. This product is not intended to diagnose, treat, cure or prevent any disease. Dietary supplements should not replace a balanced diet and healthy lifestyle.
          </div>
        </div>
      </div>

      {/* Bottom Sub-Footer Bar */}
      <div className="bg-white border-t border-surface-border py-4">
        <div className="max-w-site mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-ink-muted gap-2 text-center sm:text-left">
          <div>
            © 2026 Supplivix. All rights reserved. Registered in Pakistan.
          </div>
          <div className="flex flex-wrap justify-center sm:justify-end items-center gap-3 sm:gap-4">
            <Link to="/privacy-policy" className="hover:text-brand-green underline">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-brand-green underline">
              Terms
            </Link>
            <Link to="/shipping-policy" className="hover:text-brand-green underline">
              Shipping
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
