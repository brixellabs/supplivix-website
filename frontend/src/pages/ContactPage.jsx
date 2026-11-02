import React, { useState } from 'react';
import Breadcrumbs from '../components/layout/Breadcrumbs';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import { useToast } from '../components/ui/Toast';
import { api } from '../services/api';

export default function ContactPage() {
  const { showToast } = useToast();

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
    return Object.keys(errs).length === 0;
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
      <Breadcrumbs items={[{ label: 'Contact Us', href: '/contact' }]} />

      <div className="max-w-site mx-auto px-4 sm:px-6 py-10">
        <div className="text-center max-w-xl mx-auto mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-green">
            Customer Support
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-brand-ink mt-1">
            Get in Touch
          </h1>
          <p className="text-xs text-ink-muted mt-2">
            Have questions about multivitamin dosage, routine timing, or Cash on Delivery? Our dedicated team is here to assist you.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Direct Contact Info */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-surface-subtle border border-surface-border rounded-lg p-6 shadow-card space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-brand-ink pb-3 border-b border-surface-border">
                Direct Contact Channels
              </h2>

              <div className="space-y-4 text-xs text-ink-muted">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-green text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon name="phone" className="text-xs" />
                  </div>
                  <div>
                    <span className="font-bold text-brand-ink block">Phone Inquiries</span>
                    <a href="tel:+923000000000" className="hover:text-brand-green">
                      0300-0000000
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-green text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon name="envelope" className="text-xs" />
                  </div>
                  <div>
                    <span className="font-bold text-brand-ink block">Email Support</span>
                    <a href="mailto:info@supplivix.com" className="hover:text-brand-green">
                      info@supplivix.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-green text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon name="location" className="text-xs" />
                  </div>
                  <div>
                    <span className="font-bold text-brand-ink block">Corporate Office</span>
                    <span>Kohinoor City, Jaranwala Road, Faisalabad, Punjab, Pakistan</span>
                  </div>
                </div>

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
                  href="https://wa.me/923000000000"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white py-3 px-4 rounded-sm text-xs font-bold uppercase tracking-wider transition-colors shadow-solid-sm"
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
                  Your message has been successfully transmitted. Our customer support team will get in touch with you within 24 business hours.
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
                    <label className="block text-xs font-semibold text-brand-ink mb-1">
                      Subject <span className="text-red-500">*</span>
                    </label>
                    <select
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
                      <option value="Returns & Exchanges">Returns or Exchanges</option>
                      <option value="Wholesale / Bulk">Wholesale / Corporate Inquiry</option>
                      <option value="Other">Other Inquiry</option>
                    </select>
                    {errors.subject && <p className="text-[11px] text-red-600 mt-1">{errors.subject}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-brand-ink mb-1">
                    Your Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
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
      </div>
    </div>
  );
}
