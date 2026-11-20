import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import Icon from '../ui/Icon';
import { DEFAULT_CERTIFICATES } from './CertificatesSection';

export default function CertificatesScrollStrip() {
  const [certificates, setCertificates] = useState(DEFAULT_CERTIFICATES);
  const [selectedCert, setSelectedCert] = useState(null);

  useEffect(() => {
    let isMounted = true;
    api.getCertificates()
      .then((data) => {
        if (!isMounted) return;
        const list = Array.isArray(data) ? data : (data?.results || []);
        if (list && list.length > 0) {
          const activeList = list.filter((c) => c.is_active !== false);
          if (activeList.length > 0) {
            setCertificates(activeList);
          }
        }
      })
      .catch(() => {
        // Fallback to DEFAULT_CERTIFICATES
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Close modal on Escape key
  useEffect(() => {
    if (!selectedCert) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setSelectedCert(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCert]);

  // Labels underneath each circular badge (matching reference Nutrifactor mobile format)
  const getBadgeLabel = (code, fallbackName) => {
    switch (code) {
      case 'gmp':
        return 'GMP Certified';
      case 'haccp':
        return 'HACCP Safety';
      case 'iso':
        return 'ISO 9001:2015';
      case 'fda':
        return 'U.S. FDA Reg.';
      case 'usa-lab':
        return 'USA Lab Tested';
      case 'drap':
        return 'DRAP Pakistan';
      case 'halal':
        return '100% Halal (حلال)';
      default:
        return fallbackName;
    }
  };

  // Duplicate for seamless 60fps infinite marquee scroll
  const marqueeItems = [...certificates, ...certificates, ...certificates];

  return (
    <section
      aria-label="Quality and Regulatory Accreditations"
      className="bg-white border-b border-surface-border py-4 sm:py-6 overflow-hidden relative"
    >
      {/* Infinite Scrolling Horizontal Marquee */}
      <div className="relative w-full overflow-hidden py-3 group">
        {/* Soft edge gradient fades */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-r from-white to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-l from-white to-transparent z-10" />

        <div className="animate-marquee-scroll flex items-center gap-8 sm:gap-12 md:gap-16">
          {marqueeItems.map((cert, index) => {
            const imgSrc = cert.image_url || cert.image || `/media/certificates/${cert.badge_code}.png`;
            const label = getBadgeLabel(cert.badge_code, cert.name);
            return (
              <button
                key={`${cert.id || cert.badge_code}-${index}`}
                type="button"
                onClick={() => setSelectedCert(cert)}
                title={`${cert.name} - ${cert.subtitle || ''} (Click to view full accreditation)`}
                aria-label={`${cert.name} accreditation details`}
                className="flex-shrink-0 flex flex-col items-center justify-center text-center group/item cursor-pointer focus:outline-none transition-transform duration-200"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-[84px] md:h-[84px] rounded-full flex items-center justify-center p-1 bg-white transition-all duration-200 group-hover/item:scale-110 drop-shadow-xs group-hover/item:drop-shadow-md">
                  <img
                    src={imgSrc}
                    alt={`${cert.name} Accreditation Seal`}
                    className="w-full h-full object-contain filter"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = `/media/certificates/${cert.badge_code}.png`;
                    }}
                  />
                </div>
                <span className="mt-2 text-[11px] sm:text-xs font-bold uppercase tracking-tight text-brand-ink group-hover/item:text-brand-green transition-colors whitespace-nowrap">
                  {label}
                </span>
                <span className="text-[10px] text-ink-muted hidden sm:block whitespace-nowrap">
                  {cert.issuer || 'Certified Standard'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Nutrifactor Reference-Style Regulatory Authority Banner */}
      <div className="max-w-site mx-auto px-4 sm:px-6 mt-4 sm:mt-6">
        <div className="bg-gradient-to-r from-brand-green via-brand-green-dark to-[#083b1d] text-white rounded-lg px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left shadow-sm">
          <div>
            <span className="text-base sm:text-lg md:text-xl font-black uppercase tracking-tight block text-white leading-tight">
              7+ Certificates &amp; Global Accreditations
            </span>
            <p className="text-xs sm:text-sm text-white/90 font-medium mt-0.5">
              From Global &amp; National Regulatory Authorities: DRAP, U.S. FDA Registered, ISO 9001:2015 &amp; Halal Certified
            </p>
          </div>
          <Link
            to="/about"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-brand-green hover:bg-[#f2faf5] font-bold text-xs uppercase tracking-wider rounded-xs shadow-sm transition-all whitespace-nowrap cursor-pointer flex-shrink-0"
          >
            <span>Our Quality Standards</span>
            <Icon name="arrow-right" className="text-[10px]" />
          </Link>
        </div>
      </div>

      {/* Interactive Accreditation Details Modal */}
      {selectedCert && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="scroll-cert-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setSelectedCert(null)}
        >
          <div
            className="bg-white rounded-lg p-6 sm:p-8 max-w-md w-full shadow-2xl relative border border-surface-border text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedCert(null)}
              aria-label="Close certificate details"
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface-subtle hover:bg-surface-border flex items-center justify-center text-ink-muted hover:text-brand-ink transition-colors cursor-pointer"
            >
              <Icon name="close" className="w-4 h-4" />
            </button>

            <div className="w-24 h-24 sm:w-28 sm:h-28 mx-auto mb-4 flex items-center justify-center">
              <img
                src={selectedCert.image_url || `/media/certificates/${selectedCert.badge_code}.png`}
                alt={`${selectedCert.name} Seal`}
                className="max-w-full max-h-full object-contain"
              />
            </div>

            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-green block mb-1">
              {selectedCert.issuer || 'Official Accreditation'}
            </span>

            <h3
              id="scroll-cert-modal-title"
              className="text-lg sm:text-xl font-bold uppercase tracking-wide text-brand-ink mb-1"
            >
              {selectedCert.name}
            </h3>

            {selectedCert.subtitle && (
              <p className="text-xs font-medium text-brand-ink/75 mb-4">
                {selectedCert.subtitle}
              </p>
            )}

            {selectedCert.description && (
              <p className="text-xs sm:text-sm text-ink-muted leading-relaxed bg-surface-subtle p-3.5 rounded border border-surface-border/60 text-left mb-5">
                {selectedCert.description}
              </p>
            )}

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-surface-border">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-green">
                <Icon name="check" className="w-3.5 h-3.5 text-brand-green" />
                Active Verified Standard
              </span>
              <button
                type="button"
                onClick={() => setSelectedCert(null)}
                className="px-4 py-2 bg-brand-ink hover:bg-brand-green text-white text-xs font-bold uppercase tracking-wider rounded-xs transition-colors cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

