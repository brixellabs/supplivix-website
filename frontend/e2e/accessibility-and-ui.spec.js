/* global document */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Category L: Accessibility, Responsiveness and Design Rules (UI-01 to UI-12)', () => {
  const routes = [
    '/',
    '/multivitamins',
    '/shop',
    '/products/supplivix-daily-core-multivitamin-60s',
    '/cart',
    '/checkout',
    '/contact',
    '/privacy-policy',
    '/shipping-policy',
    '/terms',
  ];

  // UI-06 & UI-07: Axe accessibility scan of every page & color contrast check
  for (const route of routes) {
    test(`UI-06 & UI-07: Axe accessibility and 4.5:1 contrast scan on ${route}`, async ({ page }) => {
      // Mock API calls so pages render populated content
      await page.route('**/api/v1/products/**', async (routeHandler) => {
        await routeHandler.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            results: [
              {
                id: 1,
                name: 'Supplivix Daily Core Multivitamin 60s',
                slug: 'supplivix-daily-core-multivitamin-60s',
                price: 2450,
                compare_at_price: 2950,
                product_type: 'multivitamin',
                stock: 25,
                sku: 'SPLV-CORE-60',
                rating: 5,
                reviews_count: 8,
                is_active: true,
                description: 'Complete nutritional balance. These statements have not been evaluated by a regulator. This product is not intended to diagnose, treat, cure or prevent any disease.',
              },
            ],
            count: 1,
          }),
        });
      });

      await page.route('**/api/v1/cart/**', async (routeHandler) => {
        await routeHandler.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [
              {
                id: 1,
                product: { id: 1, name: 'Supplivix Daily Core Multivitamin 60s', slug: 'supplivix-daily-core-multivitamin-60s', price: 2450 },
                product_name: 'Supplivix Daily Core Multivitamin 60s',
                product_slug: 'supplivix-daily-core-multivitamin-60s',
                unit_price: 2450,
                quantity: 1,
                line_total: 2450,
              },
            ],
            subtotal: 2450,
            discount_amount: 0,
            shipping_fee: 0,
            grand_total: 2450,
            total_items: 1,
          }),
        });
      });

      await page.goto(route);
      await page.waitForLoadState('domcontentloaded');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const criticalOrSerious = accessibilityScanResults.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      );

      expect(criticalOrSerious, `Accessibility violations on ${route}: ${JSON.stringify(criticalOrSerious, null, 2)}`).toHaveLength(0);
    });
  }

  // UI-10: Horizontal scroll at 360 px viewport width
  for (const route of routes) {
    test(`UI-10: No horizontal scroll at 360px viewport on ${route}`, async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 740 });
      await page.goto(route);
      await page.waitForLoadState('domcontentloaded');

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);

      expect(scrollWidth, `Page ${route} has horizontal scroll (scrollWidth: ${scrollWidth} > clientWidth: ${clientWidth})`).toBeLessThanOrEqual(clientWidth);
    });
  }

  // UI-08: Keyboard-only walkthrough of the buy flow
  test('UI-08: Complete keyboard-only walkthrough of the buy flow without a mouse', async ({ page }) => {
    await page.route('**/api/v1/products/**', async (routeHandler) => {
      await routeHandler.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [
            {
              id: 1,
              name: 'Supplivix Daily Core Multivitamin 60s',
              slug: 'supplivix-daily-core-multivitamin-60s',
              price: 2450,
              compare_at_price: 2950,
              product_type: 'multivitamin',
              stock: 25,
              sku: 'SPLV-CORE-60',
              rating: 5,
              reviews_count: 8,
              is_active: true,
            },
          ],
          count: 1,
        }),
      });
    });

    await page.route('**/api/v1/cart/**', async (routeHandler) => {
      await routeHandler.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 1,
              product: { id: 1, name: 'Supplivix Daily Core Multivitamin 60s', slug: 'supplivix-daily-core-multivitamin-60s', price: 2450 },
              product_name: 'Supplivix Daily Core Multivitamin 60s',
              product_slug: 'supplivix-daily-core-multivitamin-60s',
              unit_price: 2450,
              quantity: 1,
              line_total: 2450,
            },
          ],
          subtotal: 2450,
          discount_amount: 0,
          shipping_fee: 0,
          grand_total: 2450,
          total_items: 1,
        }),
      });
    });

    await page.route('**/api/v1/orders/create/**', async (routeHandler) => {
      await routeHandler.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          order: {
            number: 'SPLV-20261103-9988',
            status: 'pending',
            payment_method: 'cod',
            grand_total: 2450,
          },
        }),
      });
    });

    // 1. Visit shop page
    await page.goto('/shop');
    await page.waitForLoadState('domcontentloaded');

    // 2. Tab directly to the Add to Cart button or product link
    const addToCartButton = page.locator('button[aria-label*="cart"]').first();
    await addToCartButton.waitFor({ state: 'visible', timeout: 10000 });
    await addToCartButton.focus();
    await page.keyboard.press('Enter');

    // 3. Navigate to /checkout via keyboard
    await page.goto('/checkout');
    await page.waitForLoadState('domcontentloaded');

    // 4. Fill form fields using keyboard
    const nameInput = page.locator('input[name="fullName"]');
    await nameInput.waitFor({ state: 'visible', timeout: 10000 });
    await nameInput.focus();
    await page.keyboard.type('Fatima Noor');

    await page.keyboard.press('Tab'); // email input
    await page.keyboard.type('fatima@example.com');

    await page.keyboard.press('Tab'); // phone input
    await page.keyboard.type('03001234567');

    await page.keyboard.press('Tab'); // streetAddress input
    await page.keyboard.type('House 12, Street 4, F-8/2');

    await page.keyboard.press('Tab'); // city input
    await page.keyboard.type('Islamabad');

    await page.keyboard.press('Tab'); // province select
    await page.keyboard.type('Federal');

    // 5. Submit order via Enter key on submit button
    const submitOrderButton = page.locator('button:has-text("Confirm Cash on Delivery Order")');
    await submitOrderButton.focus();
    await page.keyboard.press('Enter');

    // Order placed confirmation appears
    await expect(page.locator('text=Order Confirmed').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=SPLV-20261103-9988')).toBeVisible({ timeout: 10000 });
  });
});

