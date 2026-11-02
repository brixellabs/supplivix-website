import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/ui/Toast';
import StyleguidePage from './pages/StyleguidePage';

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/styleguide" element={<StyleguidePage />} />
        {/* Placeholder redirect to styleguide until Phase 4 pages are introduced */}
        <Route path="*" element={<Navigate to="/styleguide" replace />} />
      </Routes>
    </ToastProvider>
  );
}
