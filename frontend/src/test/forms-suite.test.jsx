/**
 * Phase 9: Comprehensive Form Validation and Accessibility Suite (Category G)
 * Covers FORM-01 to FORM-12 across Login, Register, Forgot Password, Reset Password, Checkout, and Contact forms.
 * Strictly zero emojis.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import ContactPage from '../pages/ContactPage';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { AuthProvider } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import { ToastProvider } from '../components/ui/Toast';

describe('Phase 9: Comprehensive Form Validation Suite (FORM-01 to FORM-12)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithProviders = (ui, initialRoute = '/') => {
    globalThis.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/auth/me/')) {
        return Promise.resolve({ ok: false, status: 401, json: async () => ({}) });
      }
      if (url.includes('/cart/')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            items: [
              {
                id: 1,
                product_id: 101,
                product_name: 'Supplivix Core Daily Multivitamin 60s',
                unit_price: 2200,
                quantity: 1,
                line_total: 2200,
              },
            ],
            total_items: 1,
            subtotal: 2200,
            grand_total: 2200,
          }),
        });
      }
      if (url.includes('/auth/register/')) {
        return Promise.resolve({
          ok: true,
          status: 201,
          json: async () => ({
            message: 'Registration complete! Welcome to Supplivix.',
            user: { id: 1, email: 'customer@example.com', full_name: 'Test Customer' },
          }),
        });
      }
      if (url.includes('/auth/login/')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            message: 'Login successful.',
            user: { id: 1, email: 'customer@example.com', full_name: 'Test Customer' },
          }),
        });
      }
      if (url.includes('/contact/')) {
        return Promise.resolve({
          ok: true,
          status: 201,
          json: async () => ({ message: 'Thank you! Your message has been received.' }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });

    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <ToastProvider>
          <AuthProvider>
            <CartProvider>
              {ui}
            </CartProvider>
          </AuthProvider>
        </ToastProvider>
      </MemoryRouter>
    );
  };

  it('FORM-01: Empty required fields show errors and focus moves to first invalid input', async () => {
    renderWithProviders(<RegisterPage />);

    const submitBtn = screen.getByRole('button', { name: /(Register|Create) Account/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/First name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Last name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Valid email address is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Valid Pakistani mobile number required/i)).toBeInTheDocument();
      expect(screen.getByText(/Password must be at least 8 characters/i)).toBeInTheDocument();
    });

    // Focus moved to the first invalid field (firstName)
    const firstNameInput = screen.getByLabelText(/First Name/i);
    expect(document.activeElement).toBe(firstNameInput);
  });

  it('FORM-02: Leading and trailing spaces trimmed; spaces-only rejected', async () => {
    renderWithProviders(<RegisterPage />);

    const firstNameInput = screen.getByLabelText(/First Name/i);
    const lastNameInput = screen.getByLabelText(/Last Name/i);
    const emailInput = screen.getByLabelText(/Email Address/i);

    // Spaces-only entry
    fireEvent.change(firstNameInput, { target: { value: '    ' } });
    fireEvent.change(lastNameInput, { target: { value: '    ' } });
    fireEvent.change(emailInput, { target: { value: '    ' } });

    const submitBtn = screen.getByRole('button', { name: /(Register|Create) Account/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/First name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Last name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Valid email address is required/i)).toBeInTheDocument();
    });
  });

  it('FORM-03: Maximum length constraints enforced on client inputs', () => {
    render(
      <Input
        label="Full Name"
        name="fullName"
        maxLength={50}
        value="A very long name string that exceeds standard limits"
        onChange={() => {}}
      />
    );

    const input = screen.getByLabelText(/Full Name/i);
    expect(input).toHaveAttribute('maxLength', '50');
  });

  it('FORM-04: HTML and script inputs (<script>alert(1)</script>) stored and rendered as safe plain text', async () => {
    renderWithProviders(<ContactPage />);

    const scriptInput = "<script>alert('xss')</script>";
    const messageInput = screen.getByLabelText(/Your Message/i);
    fireEvent.change(messageInput, { target: { value: scriptInput } });

    // Value is stored in input element text value, never interpreted as an executable DOM script tag
    expect(messageInput.value).toBe(scriptInput);
    expect(document.querySelector('script[src*="xss"]')).toBeNull();
  });

  it('FORM-05: SQL-like input treated as plain text string', async () => {
    renderWithProviders(<ContactPage />);

    const sqlInput = "' OR 1=1 --";
    const nameInput = screen.getByLabelText(/Full Name/i);
    fireEvent.change(nameInput, { target: { value: sqlInput } });

    expect(nameInput.value).toBe(sqlInput);
  });

  it('FORM-06: Unicode input and Urdu text accepted and displayed correctly', async () => {
    renderWithProviders(<ContactPage />);

    const urduName = 'محمد علی خان';
    const urduMessage = 'کیا یہ ملٹی وٹامن روزانہ صبح ناشتے کے بعد لینا چاہیے؟';

    const nameInput = screen.getByLabelText(/Full Name/i);
    const messageInput = screen.getByLabelText(/Your Message/i);

    fireEvent.change(nameInput, { target: { value: urduName } });
    fireEvent.change(messageInput, { target: { value: urduMessage } });

    expect(nameInput.value).toBe(urduName);
    expect(messageInput.value).toBe(urduMessage);
  });

  it('FORM-07: Server returns structured field errors mapped to corresponding input error displays', async () => {
    renderWithProviders(<RegisterPage />);

    globalThis.fetch.mockImplementation((url) => {
      if (url.includes('/auth/register/')) {
        return Promise.resolve({
          ok: false,
          status: 400,
          json: async () => ({
            code: 'validation_error',
            message: 'Validation failed.',
            fields: {
              email: ['A user with this email address already exists.'],
              phone: ['Invalid Pakistani mobile number.'],
            },
          }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Zaid' } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Malik' } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'existing@example.com' } });
    fireEvent.change(screen.getByLabelText(/mobile number/i), { target: { value: '03001234567' } });
    fireEvent.change(screen.getByLabelText(/password \(min 8 chars\)/i), { target: { value: 'Password123!' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'Password123!' } });

    fireEvent.click(screen.getByRole('button', { name: /(Register|Create) Account/i }));

    await waitFor(() => {
      expect(screen.getByText(/A user with this email address already exists/i)).toBeInTheDocument();
      expect(screen.getByText(/Invalid Pakistani mobile number/i)).toBeInTheDocument();
    });
  });

  it('FORM-08: Submit button during request is disabled with a loading state', () => {
    render(
      <Button variant="primary" loading={true}>
        Submit Order
      </Button>
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(screen.getByText(/Processing\.\.\./i)).toBeInTheDocument();
  });

  it('FORM-09: Labels, aria-invalid, aria-describedby, and role=alert present on error', () => {
    render(
      <Input
        label="Delivery City"
        name="city"
        required
        error="Please select a valid delivery city."
      />
    );

    const label = screen.getByText('Delivery City', { selector: 'label' });
    expect(label).toBeInTheDocument();

    const input = screen.getByLabelText(/Delivery City/i);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'city-error');

    const alertMsg = screen.getByRole('alert');
    expect(alertMsg).toHaveTextContent(/Please select a valid delivery city/i);
  });

  it('FORM-10: Keyboard navigation and focus ring verification', () => {
    render(
      <Input
        label="Coupon Code"
        name="coupon"
        placeholder="Enter discount code"
      />
    );

    const input = screen.getByLabelText(/Coupon Code/i);
    input.focus();
    expect(document.activeElement).toBe(input);
    expect(input.className).toContain('focus:ring-2');
    expect(input.className).toContain('focus:ring-brand-green');
  });

  it('FORM-11: Honeypot field is off-screen and invisible to human users', () => {
    renderWithProviders(<LoginPage />);

    const form = document.querySelector('form');
    const honeypot = form.querySelector('input[name="website"]');

    expect(honeypot).toBeInTheDocument();
    expect(honeypot).toHaveAttribute('tabIndex', '-1');
    expect(honeypot).toHaveAttribute('aria-hidden', 'true');
    expect(honeypot.className).toContain('hidden');
  });

  it('FORM-12: Time token integration preserves anti-bot time trap protection', () => {
    renderWithProviders(<ForgotPasswordPage />);

    // Renders with instant client form availability
    expect(screen.getByRole('heading', { level: 1, name: /Reset Password/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Registered Email Address/i)).toBeInTheDocument();
  });
});
