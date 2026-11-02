import React, { useState, useEffect } from 'react';
import Button from './Button';

export default function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('splv_cookie_consent');
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const handleChoice = (accepted) => {
    localStorage.setItem('splv_cookie_consent', accepted ? 'accepted' : 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <aside
      aria-label="Cookie consent banner"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-40 bg-surface-card border border-surface-border rounded-lg shadow-hover p-4 text-xs text-brand-ink transition-all duration-300"
    >
      <div className="font-bold text-sm mb-1">Cookie Preferences</div>
      <p className="text-ink-muted leading-relaxed mb-3">
        We use essential cookies to maintain your shopping cart, protect against fraud, and process Cash on Delivery orders.
      </p>
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleChoice(false)}
          className="text-xs py-1.5 px-3"
        >
          Decline
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() => handleChoice(true)}
          className="text-xs py-1.5 px-4"
        >
          Accept
        </Button>
      </div>
    </aside>
  );
}
