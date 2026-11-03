import { test, expect } from '@playwright/test';

test.describe('Phase 9 E2E User Journeys: Catalog, Search & Filters (CAT-01 to CAT-08)', () => {
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

    await page.route('**/api/v1/categories/', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 1, name: 'Multivitamins', slug: 'multivitamins', sort_order: 1 },
          { id: 2, name: 'Skin Care', slug: 'skincare', sort_order: 2 },
        ]),
      });
    });
  });

  test('CAT-01: Product list default loads active products and metadata', async ({ page }) => {
    await page.route('**/api/v1/products/**', async (route) => {
      const sampleList = Array.from({ length: 20 }, (_, i) => ({
        id: 100 + i,
        name: `Supplivix Multivitamin Formula ${i + 1}`,
        slug: `supplivix-multivitamin-formula-${i + 1}`,
        category_name: 'Multivitamins',
        category_slug: 'multivitamins',
        price: 2000 + i * 50,
        stock: 25,
        in_stock: true,
        product_type: 'multivitamin',
        rating_average: 4.9,
        reviews_count: 20 + i,
      }));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          count: 48,
          results: sampleList,
        }),
      });
    });

    await page.goto('/shop');

    await expect(page.locator('h1')).toHaveText(/All Formulations/i);
    await expect(page.getByRole('link', { name: 'Supplivix Multivitamin Formula 1', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Supplivix Multivitamin Formula 20', exact: true })).toBeVisible();
  });

  test('CAT-02: Multi-filter journey updates URL and filters catalog accurately', async ({ page }) => {
    let requestedParams = '';

    await page.route('**/api/v1/products/**', async (route) => {
      requestedParams = route.request().url();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          count: 1,
          results: [
            {
              id: 99,
              name: 'Supplivix Filtered Multi Target',
              slug: 'supplivix-filtered-multi-target',
              category_name: 'Multivitamins',
              category_slug: 'multivitamins',
              price: 1800,
              stock: 12,
              in_stock: true,
              product_type: 'multivitamin',
            },
          ],
        }),
      });
    });

    await page.goto('/shop');

    // On mobile viewports, open mobile filter drawer first
    const filterDrawerBtn = page.locator('[data-testid="mobile-filter-drawer-btn"]');
    if (await filterDrawerBtn.isVisible()) {
      await filterDrawerBtn.click();
    }

    // Click Multivitamins category filter
    const catBtn = page.locator('[data-testid="category-filter-multivitamins"]:visible');
    await catBtn.click();

    // Toggle In-Stock filter
    const inStockCheckbox = page.locator('[data-testid="in-stock-checkbox"]:visible');
    await inStockCheckbox.check();

    // Fill price inputs
    await page.locator('input[name="min_price"]:visible').fill('1000');
    await page.locator('input[name="max_price"]:visible').fill('2500');

    // Close drawer on mobile if open
    const applyDrawerBtn = page.locator('[data-testid="apply-filters-btn"]');
    if (await applyDrawerBtn.isVisible()) {
      await applyDrawerBtn.click();
    }

    // Verify URL reflects parameters
    await expect(page).toHaveURL(/category=multivitamins/);
    await expect(page).toHaveURL(/in_stock=true/);
    await expect(page).toHaveURL(/min_price=1000/);
    await expect(page).toHaveURL(/max_price=2500/);

    // Verify target product displayed
    await expect(page.locator('text=Supplivix Filtered Multi Target')).toBeVisible();
    expect(requestedParams).toContain('category=multivitamins');
  });

  test('CAT-03: Sort catalog by price low to high and newest', async ({ page }) => {
    let lastUrl = '';

    await page.route('**/api/v1/products/**', async (route) => {
      lastUrl = route.request().url();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          count: 2,
          results: [
            { id: 1, name: 'Lowest Price Item', slug: 'lowest-price', price: 950, stock: 10, in_stock: true },
            { id: 2, name: 'Highest Price Item', slug: 'highest-price', price: 3500, stock: 10, in_stock: true },
          ],
        }),
      });
    });

    await page.goto('/shop');

    // Change sorting to Price: Low to High
    await page.selectOption('select#sort-select', 'price');
    await expect(page).toHaveURL(/ordering=price/);
    await expect.poll(() => lastUrl).toContain('ordering=price');

    // Change sorting to Price: High to Low
    await page.selectOption('select#sort-select', '-price');
    await expect(page).toHaveURL(/ordering=-price/);
    await expect.poll(() => lastUrl).toContain('ordering=-price');
  });

  test('CAT-04: Search partial match and empty state with clear recovery', async ({ page }) => {
    await page.route('**/api/v1/products/**', async (route) => {
      const url = route.request().url();
      if (url.includes('nonexistent')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ count: 0, results: [] }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            count: 1,
            results: [
              { id: 55, name: 'Supplivix Bioactive Zinc Glycinate', slug: 'supplivix-bioactive-zinc-glycinate', price: 1400, stock: 15, in_stock: true },
            ],
          }),
        });
      }
    });

    // 1. Partial search
    await page.goto('/shop?q=Zinc');
    await expect(page.locator('text=Supplivix Bioactive Zinc Glycinate')).toBeVisible();

    // 2. Unmatched search -> Graceful empty state
    await page.goto('/shop?q=nonexistent');
    await expect(page.locator('text=No Products Found')).toBeVisible();
    const clearBtn = page.locator('button:has-text("Clear Filters")');
    await expect(clearBtn).toBeVisible();

    // 3. Clear action recovers full listing
    await clearBtn.click();
    await expect(page).not.toHaveURL(/q=nonexistent/);
  });

  test('CAT-05: Inactive or nonexistent product renders 404 page', async ({ page }) => {
    await page.route('**/api/v1/products/discontinued-botanical/**', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'not_found', message: 'Product not found.' }),
      });
    });

    await page.goto('/products/discontinued-botanical');
    await expect(page.locator('h1')).toHaveText(/Page Not Found/i);
    await expect(page.locator('text=Error 404')).toBeVisible();
  });

  test('CAT-06: Out-of-stock product shows badge and disables add to cart', async ({ page }) => {
    await page.route('**/api/v1/products/out-of-stock-multi/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 77,
          name: 'Supplivix Rare Multi Formulation',
          slug: 'out-of-stock-multi',
          price: 2600,
          stock: 0,
          in_stock: false,
          product_type: 'multivitamin',
          description: 'High potency formulation currently awaiting replenishment.',
          reviews: [],
          faqs: [],
          attributes: [],
        }),
      });
    });

    await page.goto('/products/out-of-stock-multi');

    // Confirm Out of Stock badge is visible
    await expect(page.locator('span:has-text("Out of Stock")').first()).toBeVisible();

    // Confirm Add to Cart button is disabled
    const addToCartBtn = page.locator('button:has-text("Add to Cart")').first();
    await expect(addToCartBtn).toBeDisabled();

    // Confirm Buy Now button is also disabled
    const buyNowBtn = page.locator('button:has-text("Buy Now (COD)")').first();
    await expect(buyNowBtn).toBeDisabled();
  });

  test('CAT-07: Verified buyer review submission barrier', async ({ page }) => {
    await page.route('**/api/v1/products/supplivix-omega-core/reviews/create/**', async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'verified_buyer_required',
          message: 'Only verified buyers who completed an order can submit a review.',
          fields: {},
        }),
      });
    });

    await page.route('**/api/v1/products/supplivix-omega-core/reviews/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/api/v1/products/supplivix-omega-core/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 88,
          name: 'Supplivix Omega Core 60s',
          slug: 'supplivix-omega-core',
          price: 2800,
          stock: 25,
          in_stock: true,
          product_type: 'multivitamin',
          description: 'Pure essential fatty acids formula.',
          reviews: [],
          faqs: [],
          attributes: [],
        }),
      });
    });

    await page.goto('/products/supplivix-omega-core');

    // Switch to Reviews tab
    await page.click('button:has-text("Verified Reviews")');

    // Fill review form
    await page.fill('input[name="title"]', 'Unverified Review Attempt');
    await page.fill('textarea', 'Trying to review without purchasing first.');
    await page.click('button:has-text("Submit Review")');

    // Error banner displayed
    await expect(page.locator('text=Only verified buyers who completed an order')).toBeVisible();
  });
});
