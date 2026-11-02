import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState({ message: '', visible: false, type: 'info' });

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, visible: true, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 2800);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast.visible && (
        <div
          role="status"
          aria-live="polite"
          className="fixed left-1/2 bottom-8 -translate-x-1/2 z-50 bg-brand-ink text-white px-6 py-3 rounded-full text-sm font-medium shadow-solid-sm transition-all duration-300 pointer-events-none"
        >
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}
