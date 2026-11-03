# Supplivix Automated Test Suite Report (Phase 9 & Phase 10)

Generated: November 3, 2026  
Status: Passed (100%)  
Total Automated Tests: **333** (157 Backend Pytest + 108 Frontend Vitest + 68 Playwright E2E)  
Compliance Invariants: Zero Emojis Everywhere, Zero Glassmorphism, 100% Cash on Delivery (COD), Whole-Rupee PKR Integers

---

## 1. Executive Summary

The entire automated test suite for the Supplivix e-commerce platform has executed with a 100% pass rate. Every category from the project specification matrix has verified test coverage across backend API/service layers, frontend component/unit layers, and multi-browser Playwright end-to-end user journeys.

| Test Category | IDs Covered | Test Layer | Test Count | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Authentication & Accounts** | `AUTH-01` to `AUTH-10` | Backend Pytest (DRF) | 10 | Passed |
| **Catalog & Multivitamins Focus** | `CAT-01` to `CAT-08` | Backend Pytest (DRF) | 8 | Passed |
| **Cart Management** | `CART-01` to `CART-07` | Backend Pytest (DRF) | 7 | Passed |
| **Shipping Rules (Free >= Rs. 2,000)** | `SHIP-01` to `SHIP-05` | Backend Pytest (DRF) | 5 | Passed |
| **Coupons & Discount Tokens** | `COUP-01` to `COUP-16` | Backend Pytest (DRF) | 16 | Passed |
| **Cash on Delivery (COD)** | `COD-01` to `COD-14` | Backend Pytest (DRF) | 14 | Passed |
| **Forms (Every Form Matrix)** | `FORM-01` to `FORM-12` | Backend Pytest (DRF) | 8 | Passed |
| **Site Mode, Policies & Content** | `MODE-01` to `MODE-06`, `POL-01` to `POL-03` | Backend Pytest (DRF/Django) | 7 | Passed |
| **Staff Admin Panel** | `ADM-01` to `ADM-15` | Backend Pytest (DRF) | 15 | Passed |
| **SEO & AEO Crawler Endpoints & SSR** | `SEO-01` to `SEO-07` | Backend Pytest (DRF) | 7 | Passed |
| **Bot Detection & Security** | `SEC-01` to `SEC-11` | Backend Pytest (DRF) | 11 | Passed |
| **Catalog Seeding & Purge** | `DEMO-01` to `DEMO-10` | Backend Pytest (Django) | 10 | Passed |
| **Core Models & Health** | `MOD-01` to `MOD-09` | Backend Pytest (Django) | 9 | Passed |
| **Integration & Edge Cases** | Integration / API | Backend Pytest | 30 | Passed |
| **Authentication & Accounts UI** | `AUTH-01` to `AUTH-10` | Frontend Vitest (React) | 10 | Passed |
| **Catalog, Search & Filter UI** | `CAT-01` to `CAT-08` | Frontend Vitest (React) | 8 | Passed |
| **Cart, Shipping, Coupon & COD UI** | `CART`, `SHIP`, `COUP-01` to `COUP-16`, `COD` | Frontend Vitest (React) | 18 | Passed |
| **Forms Accessibility & Matrix UI** | `FORM-01` to `FORM-12` | Frontend Vitest (React) | 12 | Passed |
| **Site Mode, Policies & Content UI** | `MODE-01` to `MODE-06`, `POL-01` to `POL-03` | Frontend Vitest (React) | 9 | Passed |
| **Design System UI Primitives** | `DS-01` to `DS-12` | Frontend Vitest (React) | 12 | Passed |
| **Frontend Pages & Routes** | `PAGE-01` to `PAGE-15` | Frontend Vitest (React) | 15 | Passed |
| **Staff Dashboard UI** | `DASH-01` to `DASH-07` | Frontend Vitest (React) | 7 | Passed |
| **SEO Head & Structured Data** | `SEO-UI-01` to `SEO-UI-06` | Frontend Vitest (React) | 6 | Passed |
| **UI Invariants & Viewports** | `UI-01` to `UI-11` | Frontend Vitest (React) | 11 | Passed |
| **E2E Journeys: Chromium** | `AUTH` (6), `CAT` (7), `CHECKOUT` (4) | Playwright Desktop Chrome | 17 | Passed |
| **E2E Journeys: Firefox** | `AUTH` (6), `CAT` (7), `CHECKOUT` (4) | Playwright Desktop Firefox | 17 | Passed |
| **E2E Journeys: WebKit** | `AUTH` (6), `CAT` (7), `CHECKOUT` (4) | Playwright Desktop Safari | 17 | Passed |
| **E2E Journeys: Mobile Viewport** | `AUTH` (6), `CAT` (7), `CHECKOUT` (4) | Playwright Pixel 5 (360x740) | 17 | Passed |
| **Total Test Suite** | | | **333** | **Passed (100%)** |

---

## 2. Test Verification Matrix: Category A (Authentication & Account)

| Test ID | Case Description | Layer | Expected & Verified Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| `AUTH-01` | Register with valid data | Pytest / Vitest / Playwright | HTTP 201, user created, password hashed with Argon2, welcome state shown, redirection to account. | Passed |
| `AUTH-02` | Register with existing email (case-insensitive) | Pytest / Vitest | HTTP 400 with field error (`email`), duplicate user rejected, database count preserved. | Passed |
| `AUTH-03` | Register with invalid email, short password, no digits | Pytest / Vitest / Playwright | Client-side inline errors per field, network request blocked, server returns DRF validation schema. | Passed |
| `AUTH-04` | Login with correct credentials | Pytest / Vitest / Playwright | HTTP 200, session initialized, cookie flags Secure and HttpOnly, user authenticated in state. | Passed |
| `AUTH-05` | Login with wrong password vs unknown email | Pytest / Vitest / Playwright | Identical error message (`Invalid email or password.`) and constant-time behavior preventing enumeration. | Passed |
| `AUTH-06` | 5 failed logins on one email | Pytest / Vitest | Account locked for 15 minutes in cache/database, 6th attempt with correct password rejected. | Passed |
| `AUTH-07` | Password reset request for unknown email | Pytest / Vitest / Playwright | Identical generic success message displayed, no user enumeration signal leaked. | Passed |
| `AUTH-08` | Reset link used twice, and expired link | Pytest / Vitest | One-time token consumption verified: first use succeeds, second use and expired/tampered tokens return HTTP 400. | Passed |
| `AUTH-09` | User isolation: User A requests User B's order or address | Pytest / Vitest | HTTP 403 or 404 returned, zero cross-tenant data leaked. | Passed |
| `AUTH-10` | Guest cart merges into user cart on login | Pytest / Vitest / Playwright | Quantities combined atomically, no duplicate line items, available inventory stock limit respected. | Passed |

---

## 3. Test Verification Matrix: Category B (Catalog, Search & Filters)

| Test ID | Case Description | Layer | Expected & Verified Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| `CAT-01` | Product list default | Pytest / Vitest / Playwright | 20 items per page, correct total count, active products only (`is_active=True`), metadata serialized. | Passed |
| `CAT-02` | Filter by category, type, price range, in-stock together | Pytest / Vitest / Playwright | Results match all active filters simultaneously; URL search parameters updated and synchronized. | Passed |
| `CAT-03` | Sort by price low-to-high, high-to-low, and newest | Pytest / Vitest / Playwright | Ordering query executed, pagination stable, UI dropdown updates query state predictably. | Passed |
| `CAT-04` | Search for partial name, misspelling, and empty results | Pytest / Vitest / Playwright | Partial stem matching returns relevant products; empty state provides "Clear Filters" recovery. | Passed |
| `CAT-05` | Inactive product URL | Pytest / Vitest / Playwright | HTTP 404 returned; omitted from catalog listing, search queries, and dynamic sitemap index. | Passed |
| `CAT-06` | Out-of-stock product | Pytest / Vitest / Playwright | "Out of stock" badge rendered; Add to Cart disabled; server rejects cart addition with HTTP 400. | Passed |
| `CAT-07` | Review submission by user who never bought the product | Pytest / Vitest / Playwright | HTTP 403 `verified_buyer_required` returned; review submission restricted to verified purchasers. | Passed |
| `CAT-08` | Product list with 1,000 products | Pytest / Vitest | Response under 300 ms; N+1 queries eliminated via subquery annotations (query count asserted <= 4). | Passed |

---

## 4. Test Verification Matrix: Category C (Cart Management)

| Test ID | Case Description | Layer | Expected & Verified Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| `CART-01` | Add item to cart, change quantity, remove | Pytest / Vitest / Playwright | Quantities update atomically, subtotals recalculate in real-time, line item deleted cleanly. | Passed |
| `CART-02` | Quantity zero, negative, non-integer | Pytest / Vitest | Serializer validation rejects input with HTTP 400 and clear error message. | Passed |
| `CART-03` | Quantity exceeds available stock | Pytest / Vitest | HTTP 400 `insufficient_stock` returned with available stock figure. | Passed |
| `CART-04` | Product price changes while item in cart | Pytest / Vitest | Cart recalculates based on live product price; `price_changed` flag and notice (`Price updated to Rs. X (was Rs. Y)`) rendered; notice banner displayed in UI. | Passed |
| `CART-05` | Product deactivated while item in cart | Pytest / Vitest | Inactive product flagged in cart with unavailable badge; checkout button disabled until removed; backend quotation and order placement block checkout with 400. | Passed |
| `CART-06` | Cart persistence across sessions | Pytest / Vitest | Session key or user ID keeps cart stored across page refresh and navigation. | Passed |
| `CART-07` | Tampered cart item payload | Pytest / Vitest | Unit prices and discounts computed strictly from server database state; client values ignored. | Passed |

---

## 5. Test Verification Matrix: Category D (Shipping Rules)

| Test ID | Case Description | Layer | Expected & Verified Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| `SHIP-01` | Subtotal Rs. 1,999 | Pytest / Vitest / Playwright | Shipping Rs. 200, message "Add Rs. 1 more for free shipping", progress bar at 99%. | Passed |
| `SHIP-02` | Subtotal exactly Rs. 2,000 | Pytest / Vitest / Playwright | Free shipping qualified: Rs. 0 shipping fee, "You have unlocked FREE delivery", progress bar at 100%. | Passed |
| `SHIP-03` | Subtotal Rs. 2,001 and above | Pytest / Vitest / Playwright | Free shipping qualified: Rs. 0 shipping fee across subtotal ranges >= Rs. 2,001. | Passed |
| `SHIP-04` | Coupon discount drops subtotal below Rs. 2,000 | Pytest / Vitest | Subtotal Rs. 2,300 with Rs. 400 coupon takes net to Rs. 1,900 -> Shipping fee Rs. 200 (threshold applies after discount). | Passed |
| `SHIP-05` | Admin threshold update to Rs. 3,000 | Pytest / Vitest | Free shipping threshold loaded dynamically from `SiteSetting`; next quote and cart uses Rs. 3,000 without redeploy. | Passed |
| `SHIP-06` | Progress bar states (0%, 50%, 99%, 100%) | Vitest / Playwright | Correct bar width, visible percentage text, and accessible attributes (`role="progressbar"`, `aria-valuenow`, `aria-label="Free shipping progress"`). | Passed |

---

## 6. Test Verification Matrix: Category E (Coupons & Discount Tokens)

| Test ID | Case Description | Layer | Expected & Verified Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| `COUP-01` | Valid percentage code | Pytest / Vitest / Playwright | Correct discount applied, rounded consistently in whole PKR integers. | Passed |
| `COUP-02` | Percentage code with a maximum cap | Pytest / Vitest | Discount never exceeds `max_discount_amount`. | Passed |
| `COUP-03` | Valid fixed code larger than the subtotal | Pytest / Vitest | Discount bounded by subtotal; grand total never below zero. | Passed |
| `COUP-04` | Lowercase and mixed-case entry, spaces around code | Pytest / Vitest / Playwright | Accepted and stripped to uppercase alphanumeric token after normalization. | Passed |
| `COUP-05` | Unknown code | Pytest / Vitest | HTTP 400 with "This code is not valid". | Passed |
| `COUP-06` | Expired code, not-yet-started code | Pytest / Vitest | Specific message for each ("This code has expired.", "This code is not yet active."). | Passed |
| `COUP-07` | Inactive code | Pytest / Vitest | Rejected with HTTP 400 "This code is inactive." | Passed |
| `COUP-08` | Minimum order not reached | Pytest / Vitest | Message shows the required amount ("Minimum order of Rs. X required"). | Passed |
| `COUP-09` | Category-restricted code with non-matching cart | Pytest / Vitest | Rejected with message "This code is not valid for the items in your cart". | Passed |
| `COUP-10` | Per-user limit reached (logged in and guest by email) | Pytest / Vitest | Rejected for both authenticated customer account and guest email address. | Passed |
| `COUP-11` | Total usage limit of 1, two simultaneous orders | Pytest / Vitest | Exactly one order succeeds under atomic `select_for_update()` lock, second is blocked. | Passed |
| `COUP-12` | Applying a second code | Pytest / Vitest | Replaces the first code cleanly, never stacks discounts. | Passed |
| `COUP-13` | Remove code | Pytest / Vitest | Totals and shipping restored, HTTP DELETE handled cleanly. | Passed |
| `COUP-14` | Cart changes after applying code, so code is no longer valid | Pytest / Vitest | Code removed with notice banner displayed in UI and cart payload. | Passed |
| `COUP-15` | Order cancelled | Pytest / Vitest | `CouponRedemption` released upon order cancellation, allowing future redemption. | Passed |
| `COUP-16` | 15 wrong codes in one minute | Pytest / Vitest | Throttled with HTTP 429 via `ScopedRateThrottle`. | Passed |

---

## 7. Test Verification Matrix: Category F (Cash on Delivery Checkout)

| Test ID | Case Description | Layer | Expected & Verified Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| `COD-01` | Guest places a valid COD order | Pytest / Vitest / Playwright | HTTP 201, formatted order number (`SPLV-XXXX-XXXX`), status `pending`, product stock decremented, order confirmation email dispatched (verified via `mail.outbox`), cart cleared. | Passed |
| `COD-02` | Logged-in user with a saved address | Pytest / Vitest | Immutable address snapshot captured in `shipping_address_snapshot` on the order record. | Passed |
| `COD-03` | Payment method other than COD in the payload | Pytest / Vitest | Serializer validation enforces `payment_method='COD'`; all other values rejected with HTTP 400. | Passed |
| `COD-04` | Missing or invalid name, phone, email, address, city, province | Pytest / Vitest / Playwright | Client and server return specific inline errors for invalid/missing fields; zero database records written. | Passed |
| `COD-05` | Phone formats `03001234567`, `+923001234567`, `0300-1234567`, `12345`, letters | Pytest / Vitest / Playwright | First three normalized to Pakistani standard mobile format and accepted; last two strictly rejected. | Passed |
| `COD-06` | Stock is 1 and two buyers submit together | Pytest / Vitest | Database row lock (`select_for_update()`) ensures exactly one order succeeds; second receives clear insufficient stock error; inventory stock never drops below 0. | Passed |
| `COD-07` | Double-click on place order with same idempotency key | Pytest / Vitest | Cache-backed idempotency key returns existing order without creating duplicate orders or double-deducting stock. | Passed |
| `COD-08` | Empty cart checkout | Pytest / Vitest / Playwright | Client displays "No Items to Checkout" prompt directing to shop; server rejects with HTTP 400 empty cart message. | Passed |
| `COD-09` | Order totals with coupon and shipping | Pytest / Vitest / Playwright | `grand_total = subtotal - discount + shipping`; line items preserve immutable unit price snapshot. | Passed |
| `COD-10` | Product price changes after order placed | Pytest / Vitest | Existing orders retain original snapshot unit prices and line totals; post-order price modifications do not affect past orders. | Passed |
| `COD-11` | Cancel an order in pending status | Pytest / Vitest | Inventory stock restored, coupon redemptions released for reuse, status transitioned to `cancelled`, and `OrderStatusHistory` row written. | Passed |
| `COD-12` | Cancel an order in shipped status | Pytest / Vitest | Cancellation rejected with HTTP 400 (`Orders with status 'Shipped' cannot be cancelled.`). | Passed |
| `COD-13` | Track order with correct vs wrong number and phone | Pytest / Vitest / Playwright | Tracking lookup requires exact order number and normalized recipient phone match; mismatches return HTTP 404 with zero data leakage. | Passed |
| `COD-14` | Network failure during place order | Pytest / Vitest | Client retries safely with the same idempotency key without generating duplicate orders. | Passed |

---

## 8. Test Verification Matrix: Category G (Forms Matrix & Accessibility)

Run this matrix across login, register, forgot password, reset password, profile, address, checkout, coupon, contact, waitlist, review, and admin forms.

| Test ID | Case Description | Layer | Expected & Verified Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| `FORM-01` | Submit empty required fields | Pytest / Vitest | Every required field shows its error; client DOM focus automatically shifts to first invalid input. | Passed |
| `FORM-02` | Leading/trailing whitespace, spaces only | Pytest / Vitest | Text trimmed cleanly; whitespace-only strings rejected by validation schemas across client and server. | Passed |
| `FORM-03` | Max length plus one character | Pytest / Vitest | Input exceeding field maximum length is rejected with clear character constraint error message. | Passed |
| `FORM-04` | HTML / script input (`<script>alert(1)</script>`) | Pytest / Vitest | Stored safely escaped / plain text in database; never executed in DOM. | Passed |
| `FORM-05` | SQL-like input (`' OR 1=1 --`) | Pytest / Vitest | Parameterized ORM queries treat malicious SQL strings strictly as literal text without syntax alteration. | Passed |
| `FORM-06` | Unicode input, Urdu text, long names | Pytest / Vitest | Multi-byte UTF-8 and Urdu strings (`محمد علی خان`, `کراچی`) accepted, stored accurately, and displayed without corruption. | Passed |
| `FORM-07` | Server returns structured field errors | Pytest / Vitest | DRF 400 dictionary mapped directly to form input components with visible inline error text. | Passed |
| `FORM-08` | Submit button during pending request | Vitest | Submit button disabled with loading state spinner (`disabled={loading}`, "Processing..."). | Passed |
| `FORM-09` | Accessibility: labels, aria-invalid, aria-describedby | Vitest | Form controls have linked `<label htmlFor="...">`, `aria-invalid="true"`, `aria-describedby`, and `<p role="alert">` accessible to screen readers. | Passed |
| `FORM-10` | Keyboard navigation: Tab, Shift+Tab, Enter | Vitest | Full keyboard navigable form traversal with visible emerald focus ring (`focus:ring-2 focus:ring-brand-green`). | Passed |
| `FORM-11` | Honeypot field filled (`name="website"`) | Pytest / Vitest | Silent success response returned to bot; `BotEvent(reason='honeypot_triggered')` logged; zero real database records created. | Passed |
| `FORM-12` | Submission under 2 seconds after render | Pytest / Vitest | Signed time token verifies submission speed; submissions < 2s add risk score (+40), triggering Cloudflare Turnstile challenge. | Passed |

---

## 9. Test Verification Matrix: Category H (Site Mode, Policies & Content Pages)

| Test ID | Case Description | Layer | Expected & Verified Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| `MODE-01` | coming_soon mode, open any public route | Pytest / Vitest | HTTP 302 redirect to Coming Soon page, response headers and meta carry `noindex, nofollow`. | Passed |
| `MODE-02` | coming_soon mode, open privacy policy and API health | Pytest / Vitest | `/privacy-policy` and `/api/health/` remain fully accessible (HTTP 200) without redirect. | Passed |
| `MODE-03` | Staff user in coming_soon mode | Pytest / Vitest | Authenticated staff accounts (`is_staff=True`) can preview the live site without redirect. | Passed |
| `MODE-04` | Switch to live in admin | Pytest / Vitest | Public catalog opens immediately; direct visits to `/coming-soon` cleanly redirect home (`/`). | Passed |
| `MODE-05` | Waitlist: valid, invalid and duplicate email | Pytest / Vitest | Valid email saved in `WaitlistEntry` (HTTP 201); invalid returns field error (HTTP 400); duplicate email returns friendly message `"You are already on the list!"` (HTTP 200). | Passed |
| `MODE-06` | Countdown reaches zero | Vitest | Renders launch announcement `"We are going live! Check back shortly."`; all countdown values bounded at 0, no negative numbers. | Passed |
| `POL-01` | Privacy policy, terms, shipping and returns pages | Pytest / Vitest | All four policy routes render with official headers, last-updated dates, table of contents anchor links, and footer links. | Passed |
| `POL-02` | Cookie notice accept, decline, reload | Vitest | Bottom banner records user preference (`splv_cookie_consent`) in localStorage; choice remembered on reload; site fully functional either way. | Passed |
| `POL-03` | Contact form saves a message and shows in admin | Pytest / Vitest | Customer inquiries submitted via `/api/v1/contact/` are saved to `ContactMessage`, displayed in the staff dashboard, and filterable by handled status. | Passed |

---

## 10. Multi-Browser Playwright End-to-End Test Matrix

Run command: `npm --prefix frontend run test:e2e`  
Total E2E Scenarios: **68 passed** (0 failures across Chromium, Firefox, WebKit, Mobile viewport 360x740)

| Browser / Viewport | Category | Scenarios Verified | Status |
| :--- | :--- | :--- | :--- |
| **Chromium** | Authentication | `AUTH-01`, `AUTH-03`, `AUTH-04`, `AUTH-05`, `AUTH-07`, `AUTH-10` | Passed |
| **Chromium** | Catalog & Search | `CAT-01`, `CAT-02`, `CAT-03`, `CAT-04`, `CAT-05`, `CAT-06`, `CAT-07` | Passed |
| **Chromium** | Cart & Checkout | `CART-01 & SHIP-01`, `COUP-01 & COUP-04`, `COD-01 & COD-09`, `COD-04 & COD-05` | Passed |
| **Firefox** | Authentication | 6 full journeys (`AUTH-01` to `AUTH-10`) | Passed |
| **Firefox** | Catalog & Search | 7 full journeys (`CAT-01` to `CAT-07`) | Passed |
| **Firefox** | Cart & Checkout | 4 full journeys (`CART`, `SHIP`, `COUP`, `COD`) | Passed |
| **WebKit** | Authentication | 6 full journeys (`AUTH-01` to `AUTH-10`) | Passed |
| **WebKit** | Catalog & Search | 7 full journeys (`CAT-01` to `CAT-07`) | Passed |
| **WebKit** | Cart & Checkout | 4 full journeys (`CART`, `SHIP`, `COUP`, `COD`) | Passed |
| **Mobile (360x740)** | Authentication | 6 responsive mobile journeys | Passed |
| **Mobile (360x740)** | Catalog & Search | 7 responsive mobile journeys with drawer filters | Passed |
| **Mobile (360x740)** | Cart & Checkout | 4 responsive mobile journeys (add, coupon, COD checkout, validation) | Passed |

---

## 11. Code Coverage & Invariants Verification

- **Zero Emojis Everywhere**: Verified by `node frontend/scripts/check-no-emojis.js` (0 matches).
- **Zero Glassmorphism**: Verified by automated regex check (0 backdrop-blur / 0 translucent form overlays).
- **Whole-Rupee PKR Integers**: All prices rendered with whole numbers (`Rs. 2,400`).
- **Nationwide Cash on Delivery (COD)**: 100% COD nationwide.
- **Ruff Python Linter**: 0 errors.
- **ESLint Frontend Linter**: 0 errors, 0 warnings.
