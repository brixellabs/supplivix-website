import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

export const DEFAULT_CERTIFICATES = [
  {
    id: 1,
    name: 'GMP Certified',
    badge_code: 'gmp',
    subtitle: 'Good Manufacturing Practice',
    issuer: 'WHO / cGMP Standard',
    image_url: '/media/certificates/gmp.png',
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
    image_url: '/media/certificates/haccp.png',
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
    image_url: '/media/certificates/iso.png',
    description: 'Certified quality management standard demonstrating consistent product safety, rigorous batch inspection, and international regulatory compliance.',
    sort_order: 3,
    is_active: true,
  },
  {
    id: 4,
    name: 'U.S. FDA Registered Facility',
    badge_code: 'fda',
    subtitle: 'Registration #18061715504',
    issuer: 'U.S. Food & Drug Administration',
    image_url: '/media/certificates/fda.png',
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
    image_url: '/media/certificates/usa-lab.png',
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
    image_url: '/media/certificates/drap.png',
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
    image_url: '/media/certificates/halal.png',
    description: '100% Halal certified ingredients, plant-derived vegetarian capsules, zero porcine gelatin, and strict adherence to Islamic dietary jurisprudence.',
    sort_order: 7,
    is_active: true,
  },
];

export default function CertificatesSection({
  bg = 'white',
  showHeader = true,
  title = 'Certified Quality & Compliance Standards',
  subtitle = 'Every Supplivix formula is produced and tested in compliance with globally recognized health, safety, and regulatory authorities.',
  badge = 'Accreditations & Certifications',
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

  const bgClasses = bg === 'subtle' ? 'bg-surface-subtle' : 'bg-white';

  return (
    <section
      aria-labelledby="certificates-section-heading"
      className={`py-12 md:py-16 border-b border-surface-border ${bgClasses}`}
    >
      <div className="max-w-site mx-auto px-4 sm:px-6">
        {showHeader && (
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-green block mb-2">
              {badge}
            </span>
            <h2
              id="certificates-section-heading"
              className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-brand-ink"
            >
              {title}
            </h2>
            <p className="text-xs sm:text-sm text-ink-muted mt-2 leading-relaxed">
              {subtitle}
            </p>
          </div>
        )}

        {/* Certificate Badges Flex Grid (Centered) */}
        <div className="flex flex-wrap justify-center gap-5">
          {certificates.map((cert) => {
            const imgSrc = cert.image_url || cert.image || `/media/certificates/${cert.badge_code}.png`;
            const widthClass =
              certificates.length === 3
                ? 'w-full sm:w-[calc(50%-10px)] md:w-[calc(33.333%-14px)] lg:w-[calc(33.333%-14px)] max-w-sm'
                : 'w-full sm:w-[calc(50%-10px)] md:w-[calc(33.333%-14px)] lg:w-[calc(25%-15px)] max-w-sm';
            return (
              <div
                key={cert.id || cert.badge_code}
                onClick={() => setSelectedCert(selectedCert?.id === cert.id ? null : cert)}
                className={`${widthClass} flex-shrink-0 bg-white border border-surface-border rounded-lg p-5 shadow-card hover:shadow-hover hover:border-brand-green/40 transition-all flex flex-col items-center text-center group cursor-pointer`}
              >
                <div className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center p-2 mb-3 bg-white rounded-md">
                  <img
                    src={imgSrc}
                    alt={`${cert.name} Accreditation Seal`}
                    className="max-w-full max-h-full object-contain filter drop-shadow-sm group-hover:scale-105 transition-transform duration-200"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = `/media/certificates/${cert.badge_code}.png`;
                    }}
                  />
                </div>

                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-green block mb-1">
                  {cert.issuer || 'Certified Standard'}
                </span>

                <h3 className="text-sm font-bold uppercase tracking-wide text-brand-ink mb-1 group-hover:text-brand-green transition-colors">
                  {cert.name}
                </h3>

                {cert.subtitle && (
                  <p className="text-[11px] font-medium text-brand-ink/80 mb-2">
                    {cert.subtitle}
                  </p>
                )}

                {cert.description && (
                  <p className="text-xs text-ink-muted leading-relaxed line-clamp-3 mt-auto pt-2 border-t border-surface-border/60 w-full">
                    {cert.description}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Trust Assurance Strip */}
        <div className="mt-10 p-4 sm:p-5 bg-surface-subtle border border-surface-border rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wide text-brand-ink block">
              100% Authentic, Lab-Verified &amp; DRAP Compliant
            </span>
            <p className="text-[11px] text-ink-muted">
              Supplivix adheres strictly to Good Manufacturing Practices, third-party purity testing, and Islamic Halal formulation guidelines.
            </p>
          </div>
          <span className="inline-flex items-center px-4 py-2 bg-brand-green text-white text-xs font-bold uppercase tracking-wider rounded-sm shadow-sm whitespace-nowrap">
            Zero Compromise Quality
          </span>
        </div>
      </div>
    </section>
  );
}

