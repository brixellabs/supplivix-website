import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../components/ui/Toast';
import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import * as AuthContextModule from '../context/AuthContext';

function renderAdminPage(staffUser = { is_staff: true, email: 'admin@supplivix.com' }) {
  vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
    user: staffUser,
    isAuthenticated: !!staffUser,
    loading: false,
    logout: vi.fn(),
  });

  return render(
    <MemoryRouter initialEntries={['/admin-panel']}>
      <ToastProvider>
        <AdminDashboardPage />
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('Phase 5: Staff Admin Dashboard (/admin-panel)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders all admin tabs and overview KPIs for staff', () => {
    renderAdminPage();
    expect(screen.getByText(/Supplivix Admin Panel/i)).toBeInTheDocument();
    expect(screen.getByText(/Staff Mode/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Overview/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Orders \(COD\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Products/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Categories/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Coupons/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Customers/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reviews/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Messages/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Bot & IP Security/i })).toBeInTheDocument();

    // KPI cards
    expect(screen.getByText(/Total COD Revenue/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Orders Placed/i)).toBeInTheDocument();
    expect(screen.getByText(/Pending Dispatch/i)).toBeInTheDocument();
    expect(screen.getByText(/Out of Stock Alert/i)).toBeInTheDocument();
  });

  it('navigates between admin tabs cleanly', () => {
    renderAdminPage();
    // Switch to Products tab
    fireEvent.click(screen.getByRole('button', { name: /Products/i }));
    expect(screen.getByText(/\+ Add Product/i)).toBeInTheDocument();
    expect(screen.getByText(/Export CSV/i)).toBeInTheDocument();

    // Switch to Bot & IP Security tab
    fireEvent.click(screen.getByRole('button', { name: /Bot & IP Security/i }));
    expect(screen.getByText(/Manual IP Unblock/i)).toBeInTheDocument();
    expect(screen.getByText(/Recent Bot & Honeypot Telemetry Events/i)).toBeInTheDocument();
  });
});
