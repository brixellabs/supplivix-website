import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Breadcrumbs from '../components/layout/Breadcrumbs';
import Icon from '../components/ui/Icon';
import Button from '../components/ui/Button';
import SEOHead from '../components/seo/SEOHead';
import Accordion from '../components/ui/Accordion';
import CertificatesSection from '../components/common/CertificatesSection';
import { BRAND_FAQS, NEW_CUSTOMER_FAQS } from '../data/faqs';

export default function AboutPage() {
  const [faqTab, setFaqTab] = useState('trust');
  return (
    <div className="bg-white min-h-screen">
      <SEOHead
        title="About Supplivix | Pure Multivitamins & Skincare"
        description="Learn about Supplivix: high-absorption bioavailable multivitamins, chelated minerals, clean skincare, and dependable Cash on Delivery across Pakistan."
        canonical="/about"
      />
      <Breadcrumbs items={[{ label: 'About Us', href: '/about' }]} />

      {/* Hero Section with Seamless Blended Background Photography */}
      <section className="relative overflow-hidden bg-surface-subtle border-b border-surface-border py-16 md:py-24">
        {/* Blended Background Photography: Skincare on Left & Multivitamins on Right */}
        <div
          className="absolute inset-0 bg-cover bg-center pointer-events-none opacity-85 transition-opacity duration-300"
          style={{
            backgroundImage: "url('/media/about-hero-bg.jpg')",
          }}
          aria-hidden="true"
        />

        {/* Soft center gradient wash ensuring 100% WCAG contrast for centered text */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-[#faf9f6]/30 via-[#faf9f6]/90 via-50% to-[#faf9f6]/30 pointer-events-none"
          aria-hidden="true"
        />

        <div className="max-w-site mx-auto px-4 sm:px-6 text-center relative z-10">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-green mb-2 block">
            Quality • Trust • Wellness
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold uppercase tracking-tight text-brand-ink max-w-3xl mx-auto leading-tight mb-4">
            Your Beauty. Your Wellness. Our Commitment.
          </h1>
          <p className="text-sm md:text-base font-semibold text-brand-ink max-w-xl mx-auto leading-relaxed mb-3">
            We believe that true beauty begins with wellness, and quality should always come first.
          </p>
          <p className="text-xs sm:text-sm text-ink-muted max-w-xl mx-auto leading-relaxed">
            Supplivix was created to provide pure, bioavailable nutritional supplements and science-backed skincare crafted specifically for Pakistani lifestyles and dietary needs.
          </p>
        </div>
      </section>

      {/* Brand Story */}
      <section className="py-12 md:py-16 bg-white border-b border-surface-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-xs sm:text-sm text-ink-muted leading-relaxed space-y-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-brand-ink mb-3">
              Why Multivitamins are Our Core Focus
            </h2>
            <p>
              Modern nutritional surveys indicate widespread deficiencies in key micronutrients across urban Pakistan, notably Vitamin D3, Vitamin B12, Zinc, and active Folate. Many commercial options rely on low-absorption mineral salts or artificial additives that irritate digestion.
            </p>
            <p className="mt-3">
              At Supplivix, we formulate our multivitamin tablets and vegetable capsules with chelated minerals (such as zinc bisglycinate and magnesium glycinate) and methylated vitamins, ensuring superior cellular absorption and optimal bioavailability.
            </p>
          </div>

          <div className="pt-6 border-t border-surface-border">
            <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-brand-ink mb-3">
              Pure Ingredients, Zero Compromises
            </h2>
            <p>
              We believe daily supplements should contain only what benefits your wellness. Our products are manufactured without artificial chemical dyes, harsh binders, gluten, or animal gelatin. Every batch undergoes rigorous quality verification.
            </p>
          </div>

          <div className="pt-6 border-t border-surface-border">
            <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-brand-ink mb-3">
              Nationwide Cash on Delivery
            </h2>
            <p>
              Trust is the foundation of our relationship with customers. We operate on a Cash on Delivery (COD) basis throughout Pakistan. You only pay the courier rider once your package arrives safely at your doorstep.
            </p>
          </div>
        </div>
      </section>

      {/* Why Supplivix: More Than Beauty. More Than Wellness. */}
      <section className="py-12 md:py-16 bg-surface-subtle border-b border-surface-border">
        <div className="max-w-site mx-auto px-4 sm:px-6">
          <div className="text-center max-w-xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-green block mb-1">
              More Than Beauty. More Than Wellness.
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-brand-ink">
              WHY SUPPLIVIX?
            </h2>
            <p className="text-xs sm:text-sm text-ink-muted mt-2">
              Our core values guide every step of our formulation, quality testing, and customer service.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white border border-surface-border rounded-lg p-6 shadow-card text-center hover:shadow-hover transition-shadow">
              <div className="w-12 h-12 bg-brand-green text-white rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="flask" className="text-lg" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-brand-ink mb-2">
                Thoughtful Formulations
              </h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Carefully considered product formulations.
              </p>
            </div>

            <div className="bg-white border border-surface-border rounded-lg p-6 shadow-card text-center hover:shadow-hover transition-shadow">
              <div className="w-12 h-12 bg-brand-green text-white rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="shield" className="text-lg" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-brand-ink mb-2">
                Quality Focus
              </h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                A commitment to quality and product integrity.
              </p>
            </div>

            <div className="bg-white border border-surface-border rounded-lg p-6 shadow-card text-center hover:shadow-hover transition-shadow">
              <div className="w-12 h-12 bg-brand-green text-white rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="star" className="text-lg" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-brand-ink mb-2">
                Premium Experience
              </h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Premium products and presentation.
              </p>
            </div>

            <div className="bg-white border border-surface-border rounded-lg p-6 shadow-card text-center hover:shadow-hover transition-shadow">
              <div className="w-12 h-12 bg-brand-green text-white rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="heart" className="text-lg" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-brand-ink mb-2">
                Customer First
              </h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Building lasting customer relationships.
              </p>
            </div>
          </div>

          <div className="mt-10 text-center">
            <div className="inline-block px-6 py-2.5 bg-white border border-surface-border rounded-full shadow-sm">
              <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-brand-green">
                Choose Quality. Choose SUPPLIVIX.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Verified Accreditations & Compliance Certificates */}
      <CertificatesSection bg="white" />

      {/* Regulatory Health Notice */}
      <section className="py-8 bg-white border-b border-surface-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="p-4 bg-surface-subtle border border-surface-border rounded-md text-xs text-ink-muted leading-relaxed">
            <span className="font-bold text-brand-ink block mb-1">Regulatory Health Disclaimer:</span>
            These statements have not been evaluated by a regulator. This product is not intended to diagnose, treat, cure or prevent any disease. Dietary supplements should accompany a balanced diet and active lifestyle.
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions Section */}
      <section className="py-12 md:py-16 bg-white border-b border-surface-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-green mb-2 block">
              Everything You Need to Know
            </span>
            <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-brand-ink mb-2">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-ink-muted mb-6">
              Learn more about our standards, ingredients, product suitability, and delivery across Pakistan.
            </p>

            {/* Category Toggle Pills */}
            <div className="inline-flex p-1 bg-surface-subtle border border-surface-border rounded-lg gap-1">
              <button
                type="button"
                onClick={() => setFaqTab('trust')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  faqTab === 'trust'
                    ? 'bg-brand-green text-white shadow-sm'
                    : 'text-brand-ink hover:text-brand-green'
                }`}
              >
                Trust &amp; Customer Confidence ({NEW_CUSTOMER_FAQS.length})
              </button>
              <button
                type="button"
                onClick={() => setFaqTab('brand')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  faqTab === 'brand'
                    ? 'bg-brand-green text-white shadow-sm'
                    : 'text-brand-ink hover:text-brand-green'
                }`}
              >
                Brand &amp; Products ({BRAND_FAQS.length})
              </button>
            </div>
          </div>

          <Accordion items={faqTab === 'trust' ? NEW_CUSTOMER_FAQS : BRAND_FAQS} />

          <div className="text-center mt-8">
            <Link to="/faq">
              <Button variant="outline" size="sm" className="inline-flex items-center gap-2">
                <span>View All 20 Knowledge Base FAQs</span>
                <Icon name="arrow-right" className="text-xs" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 bg-surface-subtle text-center">
        <div className="max-w-md mx-auto px-4">
          <h2 className="text-xl font-bold uppercase tracking-tight text-brand-ink mb-3">
            Ready to Support Your Daily Wellness?
          </h2>
          <p className="text-xs text-ink-muted mb-6">
            Explore our flagship multivitamins and targeted skincare formulations with nationwide Cash on Delivery.
          </p>
          <Link to="/shop">
            <Button variant="primary" size="md" className="px-8">
              Explore Catalog
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
