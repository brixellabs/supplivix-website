import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Breadcrumbs from '../components/layout/Breadcrumbs';
import SEOHead from '../components/seo/SEOHead';
import Accordion from '../components/ui/Accordion';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import { BRAND_FAQS, NEW_CUSTOMER_FAQS, ALL_FAQS } from '../data/faqs';

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const filteredFaqs = useMemo(() => {
    let pool = ALL_FAQS;
    if (activeTab === 'brand') {
      pool = BRAND_FAQS;
    } else if (activeTab === 'trust') {
      pool = NEW_CUSTOMER_FAQS;
    }

    if (!searchQuery.trim()) return pool;
    const q = searchQuery.toLowerCase().trim();
    return pool.filter(
      (item) =>
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q)
    );
  }, [searchQuery, activeTab]);

  const faqSchema = {
    '@type': 'FAQPage',
    mainEntity: ALL_FAQS.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <div className="bg-white min-h-screen">
      <SEOHead
        title="Frequently Asked Questions (FAQs) | Supplivix Beauty Wellness"
        description="Find answers to common questions about Supplivix nutritional supplements, multivitamins, skincare, product quality, payment methods, and nationwide delivery across Pakistan."
        canonical="/faq"
        schema={faqSchema}
      />

      <Breadcrumbs items={[{ label: 'FAQs', href: '/faq' }]} />

      {/* Header Banner */}
      <section className="bg-surface-subtle border-b border-surface-border py-12 md:py-16 text-center">
        <div className="max-w-site mx-auto px-4 sm:px-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-surface-border rounded-full text-xs font-bold uppercase tracking-widest text-brand-green mb-3">
            <span>TRUST • QUALITY • CUSTOMER CONFIDENCE</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold uppercase tracking-tight text-brand-ink mb-3">
            Frequently Asked Questions
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted max-w-xl mx-auto leading-relaxed mb-6">
            Everything you need to know about Supplivix Beauty &amp; Wellness formulations, new customer trust, product authenticity, and delivery across Pakistan.
          </p>

          {/* Search Box */}
          <div className="max-w-md mx-auto">
            <Input
              name="faq-search"
              type="text"
              placeholder="Search by keyword (e.g. quality, price, delivery, return)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search FAQs"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md border transition-colors ${
                activeTab === 'all'
                  ? 'bg-brand-green text-white border-brand-green'
                  : 'bg-white text-brand-ink border-surface-border hover:bg-surface-subtle'
              }`}
            >
              All Questions ({ALL_FAQS.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('brand')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md border transition-colors ${
                activeTab === 'brand'
                  ? 'bg-brand-green text-white border-brand-green'
                  : 'bg-white text-brand-ink border-surface-border hover:bg-surface-subtle'
              }`}
            >
              Brand &amp; Products ({BRAND_FAQS.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('trust')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md border transition-colors ${
                activeTab === 'trust'
                  ? 'bg-brand-green text-white border-brand-green'
                  : 'bg-white text-brand-ink border-surface-border hover:bg-surface-subtle'
              }`}
            >
              New Customer &amp; Trust ({NEW_CUSTOMER_FAQS.length})
            </button>
          </div>
        </div>
      </section>

      {/* Main FAQ List */}
      <section className="py-12 md:py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          {filteredFaqs.length > 0 ? (
            activeTab === 'all' && !searchQuery.trim() ? (
              <div className="space-y-10">
                {/* Section 1: New Customer Q&A */}
                <div>
                  <div className="border-b border-surface-border pb-3 mb-6">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-brand-green block">
                      Trust • Quality • Customer Confidence
                    </span>
                    <h2 className="text-lg font-bold uppercase tracking-tight text-brand-ink">
                      New Customer Questions &amp; Answers
                    </h2>
                  </div>
                  <Accordion items={NEW_CUSTOMER_FAQS} defaultOpen={false} />
                </div>

                {/* Section 2: Brand & Product FAQs */}
                <div>
                  <div className="border-b border-surface-border pb-3 mb-6">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-brand-green block">
                      Formulations &amp; Service Standards
                    </span>
                    <h2 className="text-lg font-bold uppercase tracking-tight text-brand-ink">
                      Brand &amp; Product FAQs
                    </h2>
                  </div>
                  <Accordion items={BRAND_FAQS} defaultOpen={false} />
                </div>
              </div>
            ) : (
              <Accordion items={filteredFaqs} defaultOpen={false} />
            )
          ) : (
            <div className="text-center py-12 border border-surface-border rounded-lg bg-surface-subtle p-6">
              <p className="text-sm font-semibold text-brand-ink mb-2">No matching questions found</p>
              <p className="text-xs text-ink-muted mb-4">
                Try searching with different keywords or contact our team directly.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setActiveTab('all');
                }}
              >
                Clear Search &amp; Filters
              </Button>
            </div>
          )}

          {/* Contact Support Card */}
          <div className="mt-12 p-6 bg-surface-subtle border border-surface-border rounded-lg text-center space-y-3 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-brand-ink">
              Still have questions?
            </h2>
            <p className="text-xs text-ink-muted max-w-md mx-auto leading-relaxed">
              Our Pakistan customer care team is available to assist you Monday through Saturday from 9:00 AM to 6:00 PM PKT.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <a href="https://wa.me/923025222405" target="_blank" rel="noopener noreferrer">
                <Button variant="primary" size="sm" className="inline-flex items-center gap-2">
                  <Icon name="whatsapp" className="text-xs" />
                  <span>WhatsApp 0302-5222405</span>
                </Button>
              </a>
              <Link to="/contact">
                <Button variant="outline" size="sm" className="inline-flex items-center gap-2">
                  <Icon name="envelope" className="text-xs" />
                  <span>Contact Page</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
