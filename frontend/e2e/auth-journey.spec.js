import { test, expect } from '@playwright/test';

test.describe('Phase 9 E2E User Journeys: Authentication & Account (AUTH-01 to AUTH-10)', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept common public settings and cart requests
    await page.route('**/api/v1/settings/public/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          site_mode: 'live',
          site_name: 'Supplivix',
          free_shipping_threshold: '2000',
          flat_shipping_fee: '200',
        }),
      });
    });

    await page.route('**/api/v1/cart/', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [],
          total_items: 0,
          subtotal: 0,
          shipping_total: 0,
          free_shipping_eligible: false,
        }),
      });
    });
  });

  test('AUTH-01: User registration journey with valid inputs and redirection', async ({ page }) => {
    let registerRequested = false;

    await page.route('**/api/v1/auth/me/**', async (route) => {
      await route.fulfill({ status: 401, json: {} });
    });

    await page.route('**/api/v1/auth/register/**', async (route) => {
      registerRequested = true;
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Registration complete! Welcome to Supplivix.',
          user: { id: 88, email: 'zaid.e2e@supplivix.com', full_name: 'Zaid Malik' },
        }),
      });
    });

    await page.goto('/register');

    // Fill registration form
    await page.fill('input[name="firstName"]', 'Zaid');
    await page.fill('input[name="lastName"]', 'Malik');
    await page.fill('input[name="email"]', 'zaid.e2e@supplivix.com');
    await page.fill('input[name="phone"]', '03001234567');
    await page.fill('input[name="password"]', 'SecurePass2026!');
    await page.fill('input[name="confirmPassword"]', 'SecurePass2026!');

    // Submit form
    await page.click('button[type="submit"]:has-text("Register Account")');

    // Verify API called and redirect occurred
    await expect.poll(() => registerRequested).toBe(true);
    await expect(page).toHaveURL(/\/account/);
  });

  test('AUTH-03: Client validation blocks invalid registration without network call', async ({ page }) => {
    let registerRequested = false;
    await page.route('**/api/v1/auth/register/**', async (route) => {
      registerRequested = true;
      await route.fulfill({ status: 400, json: {} });
    });

    await page.goto('/register');

    // Enter short password and bad email
    await page.fill('input[name="firstName"]', 'Zaid');
    await page.fill('input[name="lastName"]', 'Malik');
    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('input[name="phone"]', '1234');
    await page.fill('input[name="password"]', 'short');
    await page.fill('input[name="confirmPassword"]', 'short');

    await page.click('button[type="submit"]:has-text("Register Account")');

    // Network request must NOT be sent
    expect(registerRequested).toBe(false);

    // Inline errors displayed
    await expect(page.locator('text=Valid email address is required.')).toBeVisible();
  });

  test('AUTH-04: User login journey with valid credentials', async ({ page }) => {
    let loginRequested = false;

    await page.route('**/api/v1/auth/me/**', async (route) => {
      await route.fulfill({ status: 401, json: {} });
    });

    await page.route('**/api/v1/auth/login/**', async (route) => {
      loginRequested = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Login successful.',
          user: { id: 10, email: 'customer@supplivix.com', full_name: 'Customer Test' },
        }),
      });
    });

    await page.goto('/login');

    await page.fill('input[name="email"]', 'customer@supplivix.com');
    await page.fill('input[name="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]:has-text("Sign In")');

    await expect.poll(() => loginRequested).toBe(true);
    await expect(page).toHaveURL(/\/account/);
  });

  test('AUTH-05: User login error journey displays identical error notice', async ({ page }) => {
    await page.route('**/api/v1/auth/login/**', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'invalid_credentials',
          message: 'Invalid email or password.',
          fields: {},
        }),
      });
    });

    await page.goto('/login');

    await page.fill('input[name="email"]', 'wrong@supplivix.com');
    await page.fill('input[name="password"]', 'WrongPass!');
    await page.click('button[type="submit"]:has-text("Sign In")');

    await expect(page.locator('text=Invalid email or password.')).toBeVisible();
  });

  test('AUTH-07: Password recovery journey renders generic confirmation', async ({ page }) => {
    await page.route('**/api/v1/auth/password-reset/request/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'If an account exists with this email, password reset instructions have been sent.',
        }),
      });
    });

    await page.goto('/forgot-password');

    await page.fill('input[name="email"]', 'unknown@supplivix.com');
    await page.click('button[type="submit"]:has-text("Send Reset Link")');

    await expect(page.locator('text=a password reset link has been dispatched to your inbox')).toBeVisible();
  });

  test('AUTH-10: Cart merge journey when user logs in with active session', async ({ page }) => {
    let mergeCalled = false;

    await page.route('**/api/v1/auth/login/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Login successful.',
          user: { id: 50, email: 'shopper@supplivix.com', full_name: 'Shopper Test' },
        }),
      });
    });

    await page.route('**/api/v1/cart/merge/**', async (route) => {
      mergeCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [{ id: 1, product: { name: 'Supplivix Core Multi' }, quantity: 2 }],
          total_items: 2,
          subtotal: 4400,
        }),
      });
    });

    await page.goto('/login');

    await page.fill('input[name="email"]', 'shopper@supplivix.com');
    await page.fill('input[name="password"]', 'Secret123!');
    await page.click('button[type="submit"]:has-text("Sign In")');

    await expect.poll(() => mergeCalled).toBe(true);
    await expect(page).toHaveURL(/\/account/);
  });
});

