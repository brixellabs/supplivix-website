import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Breadcrumbs from '../components/layout/Breadcrumbs';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import Accordion from '../components/ui/Accordion';
import { useToast } from '../components/ui/Toast';
import { api } from '../services/api';
import SEOHead from '../components/seo/SEOHead';
import { BRAND_FAQS, NEW_CUSTOMER_FAQS } from '../data/faqs';

export default function ContactPage() {
  const { showToast } = useToast();
  const [faqTab, setFaqTab] = useState('trust');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [honeypot, setHoneypot] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const errs = {};
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      errs.name = 'Please provide your name (at least 2 characters).';
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      errs.email = 'Please provide a valid email address.';
    }
    if (!formData.subject.trim()) {
      errs.subject = 'Please choose or provide a subject.';
    }
    if (!formData.message.trim() || formData.message.trim().length < 10) {
      errs.message = 'Please provide a message (minimum 10 characters).';
    }
    setErrors(errs);
    const keys = Object.keys(errs);
    if (keys.length > 0) {
      const firstEl = document.querySelector(`[name="${keys[0]}"], #${keys[0]}`);
      if (firstEl && typeof firstEl.focus === 'function') {
        firstEl.focus();
      }
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await api.submitContact({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        subject: formData.subject.trim(),
        message: formData.message.trim(),
        website: honeypot, // Honeypot trap
      });
      setSubmitted(true);
      showToast('Thank you! Your message has been received.');
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (err) {
      if (err.fields) {
        setErrors(err.fields);
      }
      showToast(err.message || 'Unable to submit message. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white min-h-screen pb-16">
      <SEOHead
        title="Contact Supplivix Care | Nationwide COD Support"
        description="Get in touch with Supplivix customer care. Phone, WhatsApp (0302-5222405), and email support for all Cash on Delivery orders across Pakistan."
        canonical="/contact"
        schema={{
          '@type': 'ContactPage',
          name: 'Contact Supplivix Care',
          url: 'https://supplivix.com/contact/',
          description: 'Official customer support and inquiry channel for Supplivix in Pakistan.',
        }}
      />
      <Breadcrumbs items={[{ label: 'Contact Us', href: '/contact' }]} />

      {/* Hero Header Banner with Panoramic Wellness Background */}
      <section className="relative overflow-hidden bg-surface-subtle border-b border-surface-border py-14 md:py-20 text-center">
        {/* Panoramic Background Photography */}
        <div
          className="absolute inset-0 bg-cover bg-center pointer-events-none opacity-85 transition-opacity duration-300"
          style={{
            backgroundImage: "url('/media/contact-hero-bg.jpg')",
          }}
          aria-hidden="true"
        />

        {/* Soft center gradient wash ensuring 100% WCAG contrast for centered typography */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-[#faf9f6]/40 via-[#faf9f6]/92 via-50% to-[#faf9f6]/40 pointer-events-none"
          aria-hidden="true"
        />

        <div className="max-w-site mx-auto px-4 sm:px-6 relative z-10">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-green mb-2 block">
            Nationwide Customer Care • Fast Assistance
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold uppercase tracking-tight text-brand-ink mb-3">
            Get in Touch
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-ink-muted max-w-xl mx-auto leading-relaxed">
            Have questions about multivitamin dosage, routine timing, or Cash on Delivery? Our dedicated team is here to assist you.
          </p>
        </div>
      </section>

      <div className="max-w-site mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Direct Contact Info */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-surface-subtle border border-surface-border rounded-lg p-6 shadow-card space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-brand-ink pb-3 border-b border-surface-border">
                Direct Contact Channels
              </h2>

              <div className="space-y-4 text-xs text-ink-muted">
                <a
                  href="https://wa.me/923025222405"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 group transition-colors cursor-pointer"
                  title="Chat on WhatsApp (0302-5222405)"
                >
                  <div className="w-8 h-8 rounded-full bg-brand-green text-white flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-[#128C7E] transition-colors">
                    <Icon name="phone" className="text-xs" />
                  </div>
                  <div>
                    <span className="font-bold text-brand-ink block group-hover:text-brand-green transition-colors">
                      Phone Inquiries
                    </span>
                    <span className="text-ink-muted group-hover:text-brand-green group-hover:underline transition-colors">
                      0302-5222405
                    </span>
                  </div>
                </a>

                <a
                  href="https://mail.google.com/mail/?view=cm&fs=1&to=supplivix@gmail.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 group transition-colors cursor-pointer"
                  title="Open Gmail to email supplivix@gmail.com"
                >
                  <div className="w-8 h-8 rounded-full bg-brand-green text-white flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-[#075E54] transition-colors">
                    <Icon name="envelope" className="text-xs" />
                  </div>
                  <div>
                    <span className="font-bold text-brand-ink block group-hover:text-brand-green transition-colors">
                      Email Support
                    </span>
                    <span className="text-ink-muted group-hover:text-brand-green group-hover:underline transition-colors">
                      supplivix@gmail.com
                    </span>
                  </div>
                </a>

                <a
                  href="https://www.instagram.com/supp.livix?utm_source=qr&xtok=YWhramgxNjNqOGI2"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 group transition-colors cursor-pointer"
                  title="Follow & DM on Instagram (@supp.livix)"
                >
                  <div className="w-8 h-8 rounded-full bg-brand-green text-white flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-[#c13584] transition-colors">
                    <Icon name="instagram" className="text-xs" />
                  </div>
                  <div>
                    <span className="font-bold text-brand-ink block group-hover:text-brand-green transition-colors">
                      Instagram Official
                    </span>
                    <span className="text-ink-muted group-hover:text-brand-green group-hover:underline transition-colors">
                      @supp.livix
                    </span>
                  </div>
                </a>

                <a
                  href="https://www.google.com/maps/search/?api=1&query=Chak+No.+79+NB,+Sillanwali+Road,+near+bypass,+Sargodha,+Punjab,+Pakistan"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 group transition-colors cursor-pointer"
                  title="View on Google Maps"
                >
                  <div className="w-8 h-8 rounded-full bg-brand-green text-white flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-[#075E54] transition-colors">
                    <Icon name="location" className="text-xs" />
                  </div>
                  <div>
                    <span className="font-bold text-brand-ink block group-hover:text-brand-green transition-colors">
                      Corporate Office
                    </span>
                    <span className="text-ink-muted group-hover:text-brand-green group-hover:underline transition-colors">
                      Chak No. 79 NB, Sillanwali Road, near bypass, Sargodha, Punjab, Pakistan
                    </span>
                  </div>
                </a>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-green text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon name="clock" className="text-xs" />
                  </div>
                  <div>
                    <span className="font-bold text-brand-ink block">Operational Hours</span>
                    <span>Monday through Saturday: 9:00 AM – 6:00 PM PKT</span>
                  </div>
                </div>
              </div>

              {/* Instant WhatsApp Action */}
              <div className="pt-4 border-t border-surface-border">
                <a
                  href="https://wa.me/923025222405"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#075E54] hover:bg-[#128C7E] text-white py-3 px-4 rounded-sm text-xs font-bold uppercase tracking-wider transition-colors shadow-solid-sm"
                >
                  <Icon name="whatsapp" className="text-base" />
                  <span>Chat on WhatsApp (Instant Response)</span>
                </a>
              </div>
            </div>

            {/* COD Reminder Note */}
            <div className="bg-white border border-surface-border rounded-lg p-5 shadow-card text-xs">
              <div className="flex items-center gap-2 font-bold text-brand-green mb-1">
                <Icon name="cod" />
                <span>Cash on Delivery Verification</span>
              </div>
              <p className="text-ink-muted leading-relaxed">
                If your inquiry concerns an existing Cash on Delivery shipment, please keep your order reference number handy.
              </p>
            </div>
          </div>

          {/* Right Column: Contact Message Form */}
          <div className="lg:col-span-7">
            <div className="bg-surface-subtle border border-surface-border rounded-lg p-6 sm:p-8 shadow-card">
              <h2 className="text-sm font-bold uppercase tracking-wider text-brand-ink pb-3 border-b border-surface-border mb-6">
                Send Us a Message
              </h2>

              {submitted && (
                <div className="mb-6 p-4 bg-green-50 border border-brand-green rounded-md text-xs text-brand-green font-medium">
                  Your message has been successfully transmitted.
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {/* Honeypot field */}
                <input
                  type="text"
                  name="website"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                  className="hidden"
                  aria-hidden="true"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Full Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    error={errors.name}
                    placeholder="e.g. Ayesha Khan"
                    required
                  />

                  <Input
                    label="Email Address"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    error={errors.email}
                    placeholder="ayesha@example.com"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Mobile Number (Optional)"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="03XXXXXXXXX"
                  />

                  <div>
                    <label htmlFor="contact-subject" className="block text-xs font-semibold text-brand-ink mb-1">
                      Subject <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="contact-subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      className={`w-full bg-white border ${
                        errors.subject ? 'border-red-500' : 'border-surface-border'
                      } rounded-sm p-2 text-xs text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-green`}
                      required
                    >
                      <option value="">Select an inquiry topic</option>
                      <option value="Product Guidance">Multivitamins Guidance / Dosage</option>
                      <option value="Order Tracking">Cash on Delivery Order Tracking</option>
                      <option value="Order Issue">Order Issue / Damaged Item</option>
                      <option value="Wholesale / Bulk">Wholesale / Corporate Inquiry</option>
                      <option value="Other">Other Inquiry</option>
                    </select>
                    {errors.subject && <p className="text-[11px] text-red-600 mt-1">{errors.subject}</p>}
                  </div>
                </div>

                <div>
                  <label htmlFor="contact-message" className="block text-xs font-semibold text-brand-ink mb-1">
                    Your Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="contact-message"
                    name="message"
                    rows={4}
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="How can we assist you today? Please provide complete details..."
                    className={`w-full bg-white border ${
                      errors.message ? 'border-red-500' : 'border-surface-border'
                    } rounded-sm p-2.5 text-xs text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-green`}
                    required
                  />
                  {errors.message && <p className="text-[11px] text-red-600 mt-1">{errors.message}</p>}
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={loading}
                  className="w-full sm:w-auto h-[42px] px-8"
                >
                  Send Inquiry
                </Button>
              </form>
            </div>
          </div>
        </div>

        {/* Frequently Asked Questions Section - Full Width Centered Below Grid */}
        <section className="mt-16 pt-12 border-t border-surface-border">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <span className="text-xs font-bold uppercase tracking-widest text-brand-green mb-2 block">
                Common Inquiries &amp; Customer Confidence
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-brand-ink mb-2">
                Frequently Asked Questions
              </h2>
              <p className="text-xs sm:text-sm text-ink-muted mb-6 max-w-xl mx-auto leading-relaxed">
                Quick answers to common questions about Supplivix Beauty &amp; Wellness formulations, new customer trust, and nationwide fulfillment.
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
                  <span>Explore All 20 Questions in Knowledge Base</span>
                  <Icon name="arrow-right" className="text-xs" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
