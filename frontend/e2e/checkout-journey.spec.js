import { test, expect } from '@playwright/test';

test.describe('Phase 9 E2E User Journeys: Cart, Shipping, Coupon & COD Checkout', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept common public settings
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

    await page.route('**/api/v1/categories/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 1, name: 'Multivitamins', slug: 'multivitamins', sort_order: 1 },
        ]),
      });
    });
  });

  test('CART-01 & SHIP-01: Add item to cart, stepper adjustment, and free shipping calculation', async ({ page }) => {
    let cartState = {
      items: [
        {
          id: 1,
          product_id: 101,
          product_name: 'Supplivix Core Daily Multivitamin 60s',
          product_slug: 'supplivix-core-daily-multivitamin-60s',
          unit_price: 1500,
          quantity: 1,
          line_total: 1500,
        },
      ],
      total_items: 1,
      subtotal: 1500,
      discount_amount: 0,
      shipping_fee: 200,
      grand_total: 1700,
      free_shipping_eligible: false,
      coupon_code: '',
    };

    await page.route('**/api/v1/cart/**', async (route) => {
      const method = route.request().method();
      if (method === 'PATCH') {
        const body = JSON.parse(route.request().postData());
        cartState = {
          ...cartState,
          items: [
            {
              ...cartState.items[0],
              quantity: body.quantity,
              line_total: 1500 * body.quantity,
            },
          ],
          total_items: body.quantity,
          subtotal: 1500 * body.quantity,
          shipping_fee: 1500 * body.quantity >= 2000 ? 0 : 200,
          grand_total: 1500 * body.quantity + (1500 * body.quantity >= 2000 ? 0 : 200),
          free_shipping_eligible: 1500 * body.quantity >= 2000,
        };
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(cartState),
      });
    });

    await page.goto('/cart');

    // Verify under threshold: progress bar and message
    await expect(page.locator('text=Supplivix Core Daily Multivitamin 60s')).toBeVisible();
    await expect(page.locator('text=Add')).toBeVisible();
    await expect(page.locator('text=Rs. 500')).toBeVisible();

    // Click increment button to increase quantity to 2 (Subtotal = 3,000 -> Free delivery unlocked)
    await page.click('button[aria-label="Increase quantity"]');

    // Verify Free delivery unlocked
    await expect(page.locator('text=You have unlocked FREE delivery')).toBeVisible();
  });

  test('COUP-01 & COUP-04: Apply valid discount coupon in shopping cart', async ({ page }) => {
    let cartState = {
      items: [
        {
          id: 1,
          product_id: 101,
          product_name: 'Supplivix Core Daily Multivitamin 60s',
          product_slug: 'supplivix-core-daily-multivitamin-60s',
          unit_price: 2400,
          quantity: 1,
          line_total: 2400,
        },
      ],
      total_items: 1,
      subtotal: 2400,
      discount_amount: 0,
      shipping_fee: 0,
      grand_total: 2400,
      free_shipping_eligible: true,
      coupon_code: '',
    };

    await page.route('**/api/v1/cart/coupon/**', async (route) => {
      const body = JSON.parse(route.request().postData());
      if (body.code === 'SAVE10') {
        cartState = {
          ...cartState,
          coupon_code: 'SAVE10',
          discount_amount: 240,
          grand_total: 2160,
        };
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Coupon applied successfully.', cart: cartState }),
        });
      } else {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'This code is not valid.' }),
        });
      }
    });

    await page.route('**/api/v1/cart/', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(cartState),
      });
    });

    await page.goto('/cart');

    // Enter coupon code with leading/trailing spaces
    await page.fill('input[aria-label="Coupon code"]', '  save10  ');
    await page.click('button:has-text("Apply")');

    // Verify discount applied
    await expect(page.locator('text=SAVE10 Applied')).toBeVisible();
    await expect(page.getByText('-Rs. 240', { exact: true })).toBeVisible();
  });

  test('COD-01 & COD-09: Complete Cash on Delivery checkout and verify order confirmation', async ({ page }) => {
    const cartState = {
      items: [
        {
          id: 1,
          product_id: 101,
          product_name: 'Supplivix Core Daily Multivitamin 60s',
          product_slug: 'supplivix-core-daily-multivitamin-60s',
          unit_price: 2200,
          quantity: 1,
          line_total: 2200,
        },
      ],
      total_items: 1,
      subtotal: 2200,
      discount_amount: 0,
      shipping_fee: 0,
      grand_total: 2200,
      free_shipping_eligible: true,
      coupon_code: '',
    };

    await page.route('**/api/v1/cart/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(cartState),
      });
    });

    let orderPlaced = false;
    await page.route('**/api/v1/orders/create/**', async (route) => {
      orderPlaced = true;
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Order placed successfully.',
          order: {
            number: 'SPLV-E2E-9901',
            status: 'pending',
            payment_method: 'COD',
            grand_total: 2200,
            recipient_name: 'Kamran Akmal',
            street_address: 'House 12, Street 3, F-6/1',
            city: 'Islamabad',
          },
        }),
      });
    });

    await page.goto('/checkout');

    // Fill form
    await page.fill('input[name="fullName"]', 'Kamran Akmal');
    await page.fill('input[name="email"]', 'kamran@example.com');
    await page.fill('input[name="phone"]', '03001234567');
    await page.fill('input[name="streetAddress"]', 'House 12, Street 3, F-6/1');
    await page.fill('input[name="city"]', 'Islamabad');

    // Submit COD Order
    await page.click('button:has-text("Confirm Cash on Delivery Order")');

    // Verify confirmation view
    await expect(page.locator('text=Thank You For Your Order!')).toBeVisible();
    await expect(page.locator('text=SPLV-E2E-9901')).toBeVisible();
    await expect(page.getByText('Cash on Delivery (COD)', { exact: true })).toBeVisible();
    await expect(page.locator('text=Cash on Delivery Notice:')).toBeVisible();
    expect(orderPlaced).toBe(true);
  });

  test('COD-04 & COD-05: Client-side validation blocks incomplete form and invalid Pakistani phone', async ({ page }) => {
    const cartState = {
      items: [
        {
          id: 1,
          product_id: 101,
          product_name: 'Supplivix Core Daily Multivitamin 60s',
          product_slug: 'supplivix-core-daily-multivitamin-60s',
          unit_price: 2200,
          quantity: 1,
          line_total: 2200,
        },
      ],
      total_items: 1,
      subtotal: 2200,
      discount_amount: 0,
      shipping_fee: 0,
      grand_total: 2200,
      free_shipping_eligible: true,
      coupon_code: '',
    };

    await page.route('**/api/v1/cart/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(cartState),
      });
    });

    await page.goto('/checkout');

    // Fill invalid phone and submit
    await page.fill('input[name="phone"]', '12345');
    await page.click('button:has-text("Confirm Cash on Delivery Order")');

    // Inline errors appear
    await expect(page.locator('text=Please enter your full name')).toBeVisible();
    await expect(page.locator('text=Please enter a valid Pakistani mobile number')).toBeVisible();
  });
});

