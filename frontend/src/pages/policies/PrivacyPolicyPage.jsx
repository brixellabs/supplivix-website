import React from 'react';
import PolicyLayout from './PolicyLayout';

const SECTIONS = [
  { id: 'who-we-are', title: '1. Who We Are' },
  { id: 'data-we-collect', title: '2. Data We Collect' },
  { id: 'how-we-use-data', title: '3. Why We Process Your Data' },
  { id: 'courier-sharing', title: '4. COD & Courier Data Sharing' },
  { id: 'retention-periods', title: '5. Data Retention Periods' },
  { id: 'cookies', title: '6. Cookies & Tracking Technologies' },
  { id: 'security-measures', title: '7. Information Security Measures' },
  { id: 'user-rights', title: '8. Your Rights & Access Requests' },
  { id: 'children', title: '9. Children\'s Privacy' },
  { id: 'policy-changes', title: '10. Changes to this Policy' },
  { id: 'contact', title: '11. Contact Details' },
];

export default function PrivacyPolicyPage() {
  return (
    <PolicyLayout
      title="Privacy Policy"
      canonical="/privacy-policy"
      lastUpdated="November 2, 2026"
      sections={SECTIONS}
    >
      <div className="bg-surface-subtle border border-surface-border rounded-lg p-6 sm:p-7 shadow-sm space-y-3">
        <section id="who-we-are">
          <h2 className="text-base sm:text-lg font-bold text-brand-ink uppercase tracking-wide mb-2">1. Who We Are</h2>
          <p className="leading-relaxed">
            Supplivix ("we", "us", or "our") operates the e-commerce platform dedicated to providing premium multivitamins and skincare formulations across Pakistan. We operate on a Cash on Delivery (COD) fulfillment model with full commitment to your personal information privacy.
          </p>
        </section>
      </div>

      <div className="bg-surface-subtle border border-surface-border rounded-lg p-6 sm:p-7 shadow-sm space-y-3">
        <section id="data-we-collect">
          <h2 className="text-base sm:text-lg font-bold text-brand-ink uppercase tracking-wide mb-2">2. Data We Collect</h2>
          <p className="leading-relaxed">When you interact with our platform, we collect the minimum necessary data to process orders and protect platform integrity:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-xs sm:text-sm">
            <li><strong>Account Data:</strong> Name, verified email address, phone number, and encrypted passwords.</li>
            <li><strong>Order & Delivery Data:</strong> Delivery recipient name, Pakistani mobile number, street address, city, province, postal code, and ordered products.</li>
            <li><strong>Communication Data:</strong> Inquiries submitted via our contact forms or waitlist subscriptions.</li>
            <li><strong>Security & Bot Signals:</strong> IP address, user-agent headers, and interaction timing to detect automated scraping and credential stuffing.</li>
          </ul>
        </section>
      </div>

      <div className="bg-surface-subtle border border-surface-border rounded-lg p-6 sm:p-7 shadow-sm space-y-3">
        <section id="how-we-use-data">
          <h2 className="text-base sm:text-lg font-bold text-brand-ink uppercase tracking-wide mb-2">3. Why We Process Your Data</h2>
          <p className="leading-relaxed">
            We use your data solely to fulfill COD orders, send delivery tracking updates, calculate accurate shipping and coupon qualifications, respond to customer inquiries, and protect against bot attacks. We do not sell or rent personal information to any third parties.
          </p>
        </section>
      </div>

      <div className="bg-surface-subtle border border-surface-border rounded-lg p-6 sm:p-7 shadow-sm space-y-3">
        <section id="courier-sharing">
          <h2 className="text-base sm:text-lg font-bold text-brand-ink uppercase tracking-wide mb-2">4. COD & Courier Data Sharing</h2>
          <p className="leading-relaxed">
            To facilitate Cash on Delivery delivery across Pakistan, we share necessary recipient details (full name, delivery address, contact phone number, and payable cash amount) with our authorized nationwide logistics and courier partners (such as TCS, Leopards, or Trax). These partners are strictly bound to use this information only for package delivery and cash collection.
          </p>
        </section>
      </div>

      <div className="bg-surface-subtle border border-surface-border rounded-lg p-6 sm:p-7 shadow-sm space-y-3">
        <section id="retention-periods">
          <h2 className="text-base sm:text-lg font-bold text-brand-ink uppercase tracking-wide mb-2">5. Data Retention Periods</h2>
          <p className="leading-relaxed">
            Order records are retained for statutory accounting and warranty verification purposes for up to five years. Customer accounts remain active until deletion is requested. Anonymous security telemetry (such as bot logs) is purged after 90 days.
          </p>
        </section>
      </div>

      <div className="bg-surface-subtle border border-surface-border rounded-lg p-6 sm:p-7 shadow-sm space-y-3">
        <section id="cookies">
          <h2 className="text-base sm:text-lg font-bold text-brand-ink uppercase tracking-wide mb-2">6. Cookies & Tracking Technologies</h2>
          <p className="leading-relaxed">
            We utilize essential HTTP cookies to maintain shopping cart sessions, authenticate user logins, and protect against Cross-Site Request Forgery (CSRF). We do not deploy third-party advertising cookies without consent.
          </p>
        </section>
      </div>

      <div className="bg-surface-subtle border border-surface-border rounded-lg p-6 sm:p-7 shadow-sm space-y-3">
        <section id="security-measures">
          <h2 className="text-base sm:text-lg font-bold text-brand-ink uppercase tracking-wide mb-2">7. Information Security Measures</h2>
          <p className="leading-relaxed">
            All communications are encrypted using Transport Layer Security (HTTPS/TLS). Passwords are cryptographically hashed using Argon2. We implement strict Content Security Policies, rate limiting, and serverless database encryption at rest.
          </p>
        </section>
      </div>

      <div className="bg-surface-subtle border border-surface-border rounded-lg p-6 sm:p-7 shadow-sm space-y-3">
        <section id="user-rights">
          <h2 className="text-base sm:text-lg font-bold text-brand-ink uppercase tracking-wide mb-2">8. Your Rights & Access Requests</h2>
          <p className="leading-relaxed">
            Under applicable data protection principles, you possess the right to inspect, correct, or request deletion of your personal data held in our systems. To exercise these rights, email us at <a href="https://mail.google.com/mail/?view=cm&fs=1&to=supplivix@gmail.com" target="_blank" rel="noopener noreferrer" className="text-brand-green underline font-medium">supplivix@gmail.com</a>.
          </p>
        </section>
      </div>

      <div className="bg-surface-subtle border border-surface-border rounded-lg p-6 sm:p-7 shadow-sm space-y-3">
        <section id="children">
          <h2 className="text-base sm:text-lg font-bold text-brand-ink uppercase tracking-wide mb-2">9. Children's Privacy</h2>
          <p className="leading-relaxed">
            Our platform is intended for individuals aged 18 and older. While we offer formulated multivitamins for children, purchases must be conducted by adult parents or guardians.
          </p>
        </section>
      </div>

      <div className="bg-surface-subtle border border-surface-border rounded-lg p-6 sm:p-7 shadow-sm space-y-3">
        <section id="policy-changes">
          <h2 className="text-base sm:text-lg font-bold text-brand-ink uppercase tracking-wide mb-2">10. Changes to this Policy</h2>
          <p className="leading-relaxed">
            Any modifications to this Privacy Policy will be published on this page with an updated "Last Updated" timestamp. We encourage periodic review.
          </p>
        </section>
      </div>

      <div className="bg-surface-subtle border border-surface-border rounded-lg p-6 sm:p-7 shadow-sm space-y-3">
        <section id="contact">
          <h2 className="text-base sm:text-lg font-bold text-brand-ink uppercase tracking-wide mb-2">11. Contact Details</h2>
          <p className="leading-relaxed">
            For questions or concerns regarding our privacy practices, contact our Data Protection Officer at:
          </p>
          <div className="bg-white p-4 rounded-md border border-surface-border mt-2 space-y-1 text-xs">
            <div><strong className="text-brand-ink">Supplivix Pakistan</strong></div>
            <div>Email: <a href="https://mail.google.com/mail/?view=cm&fs=1&to=supplivix@gmail.com" target="_blank" rel="noopener noreferrer" className="text-brand-green underline">supplivix@gmail.com</a></div>
            <div>Support WhatsApp / Phone: <a href="https://wa.me/923025222405" target="_blank" rel="noopener noreferrer" className="text-brand-green underline">0302-5222405</a></div>
            <div>Location: <a href="https://www.google.com/maps/search/?api=1&query=Chak+No.+79+NB,+Sillanwali+Road,+near+bypass,+Sargodha,+Punjab,+Pakistan" target="_blank" rel="noopener noreferrer" className="text-brand-green underline">Chak No. 79 NB, Sillanwali Road, near bypass, Sargodha, Punjab, Pakistan</a></div>
          </div>
        </section>
      </div>
    </PolicyLayout>
  );
}
