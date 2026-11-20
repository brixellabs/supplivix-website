import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import Icon from '../ui/Icon';

export const DEFAULT_CERTIFICATES = [
  {
    id: 1,
    name: 'GMP Certified',
    badge_code: 'gmp',
    subtitle: 'Good Manufacturing Practice',
    issuer: 'WHO / cGMP Standard',
    image_url: '/media/certificates/gmp.webp',
    description: 'Manufactured in strict adherence to Good Manufacturing Practice standards for dietary supplements, ensuring consistent purity, strength, and composition.',
    sort_order: 1,
    is_active: true,
  },
  {
    id: 2,
    name: 'HACCP Certified',
    badge_code: 'haccp',
    subtitle: 'Hazard Analysis & Critical Control Point',
    issuer: 'RICI International',
    image_url: '/media/certificates/haccp.webp',
    description: 'Systematic preventative food safety certification ensuring biological, chemical, and physical hazards are identified and controlled at every formulation step.',
    sort_order: 2,
    is_active: true,
  },
  {
    id: 3,
    name: 'ISO 9001:2015 Certified',
    badge_code: 'iso',
    subtitle: 'Quality Management Systems',
    issuer: 'ISO International',
    image_url: '/media/certificates/iso.webp',
    description: 'Certified quality management standard demonstrating consistent product safety, rigorous batch inspection, and international regulatory compliance.',
    sort_order: 3,
    is_active: true,
  },
  {
    id: 4,
    name: 'U.S. FDA Registered Facility',
    badge_code: 'fda',
    subtitle: 'Registration #18061715604',
    issuer: 'U.S. Food & Drug Administration',
    image_url: '/media/certificates/fda.webp',
    description: 'Formulated and produced in facilities registered with the U.S. FDA, meeting stringent international facility, equipment, and sanitation requirements.',
    sort_order: 4,
    is_active: true,
  },
  {
    id: 5,
    name: 'USA Lab Tested',
    badge_code: 'usa-lab',
    subtitle: '3rd Party Certification for Purity & Efficacy',
    issuer: 'Accredited Independent USA Labs',
    image_url: '/media/certificates/usa-lab.webp',
    description: 'Every production lot undergoes independent third-party laboratory verification for raw ingredient purity, bio-potency, and heavy metal screening.',
    sort_order: 5,
    is_active: true,
  },
  {
    id: 6,
    name: 'DRAP Registered Facility',
    badge_code: 'drap',
    subtitle: 'Drug Regulatory Authority of Pakistan',
    issuer: 'DRAP (Government of Pakistan)',
    image_url: '/media/certificates/drap.webp',
    description: 'Produced in full compliance with Drug Regulatory Authority of Pakistan (DRAP) health and wellness facility standards for consumable supplements.',
    sort_order: 6,
    is_active: true,
  },
  {
    id: 7,
    name: 'Halal Certified (حلال)',
    badge_code: 'halal',
    subtitle: '100% Halal Formulations',
    issuer: 'Recognized Halal Accreditation Authority',
    image_url: '/media/certificates/halal.webp',
    description: '100% Halal certified ingredients, plant-derived vegetarian capsules, zero porcine gelatin, and strict adherence to Islamic dietary jurisprudence.',
    sort_order: 7,
    is_active: true,
  },
];

export default function CertificatesSection({
  bg = 'white',
  title = 'ENGINEERED BY SCIENCE, CRAFTED FOR PURITY',
  subtitle = 'At Supplivix, every multivitamin and skincare formulation is developed in DRAP and cGMP-certified sterile facilities. Under strict oversight by certified healthcare pharmacologists, we verify raw ingredient purity, eliminate synthetic binders, and guarantee 100% Halal bioavailable nutrients for your daily vitality.',
  buttonText = 'EXPLORE OUR STANDARDS',
  buttonLink = '/about',
  illustrationUrl = '/media/science-lab-illustration.webp',
}) {
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
      if (e.key === 'Escape') {
        setSelectedCert(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCert]);

  // Divide certificates into two matching rows matching reference image
  const row1Codes = ['gmp', 'haccp', 'iso', 'fda'];
  const row2Codes = ['usa-lab', 'drap', 'halal'];

  const row1Badges = certificates.filter((c) => row1Codes.includes(c.badge_code))
    .sort((a, b) => row1Codes.indexOf(a.badge_code) - row1Codes.indexOf(b.badge_code));

  const row2Badges = certificates.filter((c) => row2Codes.includes(c.badge_code))
    .sort((a, b) => row2Codes.indexOf(a.badge_code) - row2Codes.indexOf(b.badge_code));

  // If dynamic API returned non-standard codes, fallback gracefully
  const displayRow1 = row1Badges.length > 0 ? row1Badges : certificates.slice(0, 4);
  const displayRow2 = row2Badges.length > 0 ? row2Badges : certificates.slice(4);

  const bgClasses = bg === 'subtle' ? 'bg-surface-subtle' : 'bg-white';

  const renderBadge = (cert) => {
    const webpSrc = `/media/certificates/${cert.badge_code}.webp`;
    const pngFallback = `/media/certificates/${cert.badge_code}.png`;
    const imgSrc = cert.image_url || cert.image || webpSrc;
    return (
      <button
        key={cert.id || cert.badge_code}
        type="button"
        onClick={() => setSelectedCert(cert)}
        title={`${cert.name} - ${cert.subtitle || ''} (Click to view full accreditation)`}
        aria-label={`${cert.name} accreditation details`}
        className="w-16 h-16 sm:w-20 sm:h-20 lg:w-[86px] lg:h-[86px] flex items-center justify-center p-0.5 rounded-full hover:scale-108 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-green/40 cursor-pointer bg-transparent group"
      >
        <picture>
          <source srcSet={webpSrc} type="image/webp" />
          <img
            src={imgSrc}
            alt={`${cert.name} Accreditation Seal`}
            width="86"
            height="86"
            className="w-full h-full object-contain filter drop-shadow-xs group-hover:drop-shadow-md transition-all duration-200"
            loading="eager"
            decoding="async"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = pngFallback;
            }}
          />
        </picture>
      </button>
    );
  };

  return (
    <section
      aria-labelledby="certificates-section-heading"
      className={`py-12 md:py-16 lg:py-20 border-b border-surface-border ${bgClasses}`}
    >
      <div className="max-w-site mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Scientists Laboratory Illustration */}
          <div className="lg:col-span-6 flex justify-center items-center">
            <div className="relative w-full max-w-[520px]">
              <picture>
                <source srcSet="/media/science-lab-illustration.webp" type="image/webp" />
                <img
                  src={illustrationUrl}
                  alt="Supplivix Backed by Science Laboratory"
                  width="520"
                  height="388"
                  className="w-full h-auto object-contain select-none rounded-lg shadow-sm"
                  loading="eager"
                  decoding="async"
                />
              </picture>
            </div>
          </div>

          {/* Right Column: Heading, Paragraph, Action, Badges */}
          <div className="lg:col-span-6 flex flex-col justify-center items-start text-left">
            <h2
              id="certificates-section-heading"
              className="text-2xl sm:text-3xl lg:text-[32px] font-extrabold uppercase tracking-tight text-brand-ink leading-tight mb-3"
            >
              {title}
            </h2>
            <p className="text-sm sm:text-[15px] text-[#4a4a4a] leading-relaxed mb-6 max-w-xl">
              {subtitle}
            </p>

            <Link
              to={buttonLink}
              className="inline-flex items-center justify-center bg-[#232323] hover:bg-brand-green text-white font-bold text-xs uppercase tracking-widest px-8 py-3 rounded-[3px] shadow-solid-sm hover:shadow-solid-md transition-all duration-200 mb-8 cursor-pointer"
            >
              {buttonText}
            </Link>

            {/* Accreditation Badges Rows */}
            <div className="w-full space-y-3 sm:space-y-4">
              {/* Row 1: GMP, HACCP, ISO, U.S. FDA */}
              <div className="flex items-center gap-3 sm:gap-4 md:gap-5 flex-wrap">
                {displayRow1.map((cert) => renderBadge(cert))}
              </div>

              {/* Row 2: USA Lab Tested, DRAP, Halal */}
              <div className="flex items-center gap-3 sm:gap-4 md:gap-5 flex-wrap">
                {displayRow2.map((cert) => renderBadge(cert))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Accreditation Details Modal */}
      {selectedCert && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cert-modal-title"
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
              id="cert-modal-title"
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
