import React from 'react';
import { Link } from 'react-router-dom';
import Breadcrumbs from '../components/layout/Breadcrumbs';
import Icon from '../components/ui/Icon';
import Button from '../components/ui/Button';
import SEOHead from '../components/seo/SEOHead';

export default function AboutPage() {
  return (
    <div className="bg-white min-h-screen">
      <SEOHead
        title="About Supplivix | Pure Multivitamins & Skincare"
        description="Learn about Supplivix: high-absorption bioavailable multivitamins, chelated minerals, clean skincare, and dependable Cash on Delivery across Pakistan."
        canonical="/about"
      />
      <Breadcrumbs items={[{ label: 'About Us', href: '/about' }]} />

      {/* Hero Section */}
      <section className="bg-surface-subtle border-b border-surface-border py-14 md:py-20">
        <div className="max-w-site mx-auto px-4 sm:px-6 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-green mb-2 block">
            Our Mission & Standards
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold uppercase tracking-tight text-brand-ink max-w-2xl mx-auto leading-tight mb-4">
            Formulated for Everyday Vitality & Healthy Skin
          </h1>
          <p className="text-sm md:text-base text-ink-muted max-w-xl mx-auto leading-relaxed">
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

      {/* 4 Pillars Grid */}
      <section className="py-12 md:py-16 bg-surface-subtle border-b border-surface-border">
        <div className="max-w-site mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white border border-surface-border rounded-lg p-6 shadow-card text-center">
              <div className="w-12 h-12 bg-brand-green text-white rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="capsules" className="text-lg" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-brand-ink mb-2">
                Bioavailable Forms
              </h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Higher absorption rates gentle on sensitive digestive systems.
              </p>
            </div>

            <div className="bg-white border border-surface-border rounded-lg p-6 shadow-card text-center">
              <div className="w-12 h-12 bg-brand-green text-white rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="shield" className="text-lg" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-brand-ink mb-2">
                Purity Standards
              </h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Zero harmful fillers, certified halal components, verified potency.
              </p>
            </div>

            <div className="bg-white border border-surface-border rounded-lg p-6 shadow-card text-center">
              <div className="w-12 h-12 bg-brand-green text-white rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="cod" className="text-lg" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-brand-ink mb-2">
                Cash on Delivery
              </h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Inspect your parcel and pay cash at your doorstep nationwide.
              </p>
            </div>

            <div className="bg-white border border-surface-border rounded-lg p-6 shadow-card text-center">
              <div className="w-12 h-12 bg-brand-green text-white rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="whatsapp" className="text-lg" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-brand-ink mb-2">
                Expert Support
              </h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Direct guidance on routine timing and formulation selection via WhatsApp.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Regulatory Health Notice */}
      <section className="py-8 bg-white border-b border-surface-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="p-4 bg-surface-subtle border border-surface-border rounded-md text-xs text-ink-muted leading-relaxed">
            <span className="font-bold text-brand-ink block mb-1">Regulatory Health Disclaimer:</span>
            These statements have not been evaluated by a regulator. This product is not intended to diagnose, treat, cure or prevent any disease. Dietary supplements should accompany a balanced diet and active lifestyle.
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
