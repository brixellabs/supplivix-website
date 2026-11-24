import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Icon from '../components/ui/Icon';
import Badge from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import { api } from '../services/api';
import logoImg from '../assets/brand/logo.png';

export default function ComingSoonPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [launchDate, setLaunchDate] = useState('2026-12-01T00:00:00Z');
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, launched: false });

  // Fetch settings for launch date and site mode (redirects home if live)
  useEffect(() => {
    api.getPublicSettings()
      .then((data) => {
        if (data && data.site_mode === 'live') {
          navigate('/', { replace: true });
          return;
        }
        if (data && data.launch_date) {
          setLaunchDate(data.launch_date);
        }
      })
      .catch(() => {});
  }, [navigate]);

  // Countdown timer calculation
  useEffect(() => {
    const calculateTime = () => {
      const difference = new Date(launchDate).getTime() - new Date().getTime();
      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, launched: true });
        return;
      }
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);
      setTimeLeft({ days, hours, minutes, seconds, launched: false });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [launchDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address.');
      const el = document.querySelector('[name="waitlistEmail"], #waitlistEmail');
      if (el && typeof el.focus === 'function') el.focus();
      return;
    }

    setLoading(true);
    try {
      const res = await api.joinWaitlist(email, honeypot);
      setSuccessMessage(res.message);
      showToast(res.message);
      setEmail('');
    } catch (err) {
      setError(err.message || 'Unable to join waitlist. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-brand-ink flex flex-col justify-between p-6 sm:p-10">
      {/* Search engine directives: noindex, nofollow while in coming soon mode */}
      <meta name="robots" content="noindex, nofollow" />

      {/* Top Banner / Announcement */}
      <header className="max-w-site mx-auto w-full flex justify-between items-center py-4">
        <img
          src={logoImg}
          alt="Supplivix Logo"
          width="160"
          height="48"
          className="h-10 sm:h-12 w-auto object-contain"
        />
        <Badge variant="pill">Beauty & Wellness</Badge>
      </header>

      {/* Main Hero & Countdown */}
      <main className="max-w-2xl mx-auto w-full text-center py-12 md:py-16">
        <span className="text-xs font-bold tracking-widest uppercase text-brand-green mb-3 block">
          Official Launch Approaching
        </span>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold uppercase tracking-tight text-brand-ink leading-tight mb-4">
          Daily vitamins for a <span className="text-brand-green">healthier, glowing</span> you
        </h1>
        <p className="text-sm md:text-base text-ink-muted max-w-lg mx-auto leading-relaxed mb-10">
          Pakistan's premier multivitamins and skincare platform. Nationwide delivery with Cash on Delivery (COD) as our payment method.
        </p>

        {/* Countdown Timer */}
        <div className="grid grid-cols-4 gap-3 sm:gap-4 max-w-md mx-auto mb-10" aria-label="Launch Countdown">
          {timeLeft.launched ? (
            <div className="col-span-4 p-4 border border-brand-green bg-green-50 rounded-md text-brand-green font-bold">
              We are going live! Check back shortly.
            </div>
          ) : (
            <>
              <div className="border border-surface-border bg-surface-subtle p-3.5 rounded-md shadow-card">
                <span className="block text-2xl sm:text-3xl font-bold text-brand-ink">{timeLeft.days}</span>
                <span className="text-[11px] font-semibold uppercase text-ink-muted">Days</span>
              </div>
              <div className="border border-surface-border bg-surface-subtle p-3.5 rounded-md shadow-card">
                <span className="block text-2xl sm:text-3xl font-bold text-brand-ink">{timeLeft.hours}</span>
                <span className="text-[11px] font-semibold uppercase text-ink-muted">Hours</span>
              </div>
              <div className="border border-surface-border bg-surface-subtle p-3.5 rounded-md shadow-card">
                <span className="block text-2xl sm:text-3xl font-bold text-brand-ink">{timeLeft.minutes}</span>
                <span className="text-[11px] font-semibold uppercase text-ink-muted">Mins</span>
              </div>
              <div className="border border-surface-border bg-surface-subtle p-3.5 rounded-md shadow-card">
                <span className="block text-2xl sm:text-3xl font-bold text-brand-ink">{timeLeft.seconds}</span>
                <span className="text-[11px] font-semibold uppercase text-ink-muted">Secs</span>
              </div>
            </>
          )}
        </div>

        {/* Waitlist Form */}
        <div className="bg-surface-subtle border border-surface-border p-6 sm:p-8 rounded-lg max-w-lg mx-auto shadow-card text-left">
          <h2 className="text-base font-bold uppercase tracking-wide text-brand-ink mb-1 text-center">
            Be the First to Know
          </h2>
          <p className="text-xs text-ink-muted text-center mb-6">
            Join our launch waitlist for early access and exclusive opening week vouchers.
          </p>

          <form onSubmit={handleSubmit} noValidate>
            {/* Honeypot field (hidden from screen, trapped for automated bots) */}
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

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input
                  name="waitlistEmail"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={error}
                  required
                  aria-label="Email address for launch notification"
                />
              </div>
              <div className="sm:self-start">
                <Button
                  type="submit"
                  variant="primary"
                  loading={loading}
                  className="w-full sm:w-auto h-[42px]"
                >
                  Join Waitlist
                </Button>
              </div>
            </div>
            {successMessage && (
              <p className="mt-3 text-xs font-semibold text-brand-green" role="status">
                {successMessage}
              </p>
            )}
          </form>
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap justify-center items-center gap-6 mt-10 text-xs font-semibold text-ink-muted">
          <div className="flex items-center gap-2">
            <Icon name="cod" className="text-brand-green text-sm" />
            <span>Cash on Delivery</span>
          </div>
          <div className="flex items-center gap-2">
            <Icon name="truck" className="text-brand-green text-sm" />
            <span>Nationwide Delivery</span>
          </div>
          <div className="flex items-center gap-2">
            <Icon name="shield" className="text-brand-green text-sm" />
            <span>100% Quality Assured</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-site mx-auto w-full pt-8 border-t border-surface-border flex flex-col sm:flex-row items-center justify-between text-xs text-ink-muted gap-4">
        <div>
          <span>© 2026 Supplivix. All rights reserved.</span>
          <span className="mx-2">·</span>
          <Link to="/privacy-policy" className="hover:text-brand-green underline">
            Privacy Policy
          </Link>
        </div>
        <div className="flex items-center gap-4 text-brand-ink text-base">
          <a href="https://www.facebook.com/share/16RoXXSXb4L/" target="_blank" rel="noopener noreferrer" aria-label="Supplivix Facebook">
            <Icon name="facebook" className="hover:text-brand-green transition-colors" />
          </a>
          <a
            href="https://www.instagram.com/supp.livix?utm_source=qr&xtok=YWhramgxNjNqOGI2"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Supplivix on Instagram (@supp.livix)"
            title="Follow Supplivix on Instagram (@supp.livix)"
          >
            <Icon name="instagram" className="hover:text-brand-green transition-colors" />
          </a>
          <a href="https://wa.me/923025222405" target="_blank" rel="noopener noreferrer" aria-label="Supplivix WhatsApp Support (0302-5222405)">
            <Icon name="whatsapp" className="hover:text-brand-green transition-colors" />
          </a>
        </div>
      </footer>
    </div>
  );
}
