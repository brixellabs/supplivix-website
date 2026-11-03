# Supplivix Staff Admin Panel User Guide

Strictly zero emojis. Version 1.0 (Production Release).  
Accessible at route: `/admin-panel` (Restricted to authenticated staff accounts).

---

## Module 1: Overview & KPI Dashboard

### Purpose
Provides store managers and fulfillment teams with a real-time summary of sales, pending dispatches, revenue metrics, and inventory alerts.

### Key Metrics Displayed
- Total Revenue: Cumulative whole-rupee sum of confirmed and delivered Cash on Delivery (COD) orders.
- Orders in Pipeline: Total active orders requiring warehouse action (pending confirmation or awaiting dispatch).
- Out-of-Stock Alerts: Real-time count of catalog products with stock = 0.
- Daily Order Volume: Number of customer orders placed within the last 24 hours.

### Standard Procedures
1. Daily Fulfillment Check: Review "Orders in Pipeline" every morning at 09:00 PKT.
2. Restock Prioritization: Click on the "Out-of-Stock" alert pill to navigate directly to depleted items in the Products module.
3. Monthly Reconciliation: Compare Total Revenue against collected courier remittance receipts.

---

## Module 2: Products & Catalog Management

### Purpose
Enables creating, editing, image uploading, inventory updating, and deactivating catalog items across Multivitamins and Skincare.

### Interface Actions
- Add Product: Launches the product creation modal. Required fields: Name, Slug, Category, Product Type (`multivitamin` or `skincare`), Price (in whole PKR), SKU, Initial Stock, and Description.
- Image Upload: Accepts WebP, PNG, JPG, or SVG assets up to 2 MB. Multi-file uploads are automatically validated on client and server.
- Stock Adjustments: Update stock numbers directly. Setting stock to 0 automatically applies the accessible "Out of stock" badge and disables the customer Add to Cart button on public pages.
- Deactivate vs Delete: Destructive deletion is blocked if orders reference the product. Use "Deactivate" (`is_active = False`) to cleanly hide the product from search, category listings, and sitemap while preserving order history.

### Validation Rules
- Prices must be positive integers (e.g., `Rs. 2,400`). Decimals are rejected.
- SKU must be unique across the catalog (format: `SPLV-[CATEGORY]-[IDENTIFIER]`).
- Mandatory Regulatory Disclaimer is permanently appended to all multivitamin descriptions.

---

## Module 3: Orders & Cash on Delivery (COD) Workflow

### Purpose
Tracks orders through their lifecycle from customer placement to courier delivery and cash collection.

### Valid Order Status Transitions
```
Pending -> Confirmed -> Shipped -> Delivered
   |           |           |
   v           v           v
Cancelled   Cancelled   Returned
```

### Transition Guidelines
1. Pending to Confirmed: Fulfillment team verifies customer phone number and shipping address via phone or WhatsApp confirmation.
2. Confirmed to Shipped: Courier tracking number (e.g., Trax, Leopard, TCS) is generated and added to order notes. Order status history row is written.
3. Shipped to Delivered (COD Collected): Marks cash remittance collected from the courier. Updates revenue KPI and marks COD reconciled.
4. Cancellation Rules: An order in "Pending" or "Confirmed" can be cancelled by staff or customer. Cancellation automatically increments product inventory back to available stock and releases coupon redemption locks. Orders in "Shipped" or "Delivered" cannot be cancelled.

---

## Module 4: Coupons & Promotional Tokens

### Purpose
Creates and governs discount tokens with strict usage rules, minimum subtotal thresholds, user limits, and date ranges.

### Coupon Configuration Fields
- Coupon Code: Uppercase alphanumeric string (e.g., `WELCOME10`, `HEALTH20`).
- Discount Type: `percent` (percentage off subtotal) or `fixed` (fixed rupee discount).
- Discount Value: Integer percentage (1-100) or whole PKR amount.
- Minimum Order Subtotal: Minimum cart value before the coupon is valid (e.g., Rs. 2,500).
- Maximum Discount Cap: Caps the maximum rupee discount for percentage codes (prevents runaway margin loss).
- Usage Limits: `usage_limit_total` (lifetime uses across all shoppers) and `usage_limit_per_user` (per registered user or guest email).
- Active Window: Optional `valid_from` and `valid_until` ISO timestamps.

### Operational Rules
- Coupons never stack; applying a second coupon replaces the first.
- If a cart subtotal is modified so it falls below `min_subtotal`, the coupon is automatically removed with a notice.

---

## Module 5: Customer Messages & Support Inquiries

### Purpose
Manages support inquiries, feedback, and customer questions submitted via the public Contact page (`/contact`).

### Capabilities
- Inbox View: Displays sender name, email, phone, timestamp, and message excerpt.
- Message Status: Mark messages as `Handled` or `Pending`.
- Filter & Search: Filter by handling status or search by customer email/phone.
- Security Integration: Messages filtered by honeypot or spam heuristics are tagged for review without triggering alert fatigue.

---

## Module 6: Waitlist & Pre-Launch Subscriptions

### Purpose
Collects and manages customer email addresses subscribed during `coming_soon` mode or out-of-stock product waitlists.

### Management Features
- CSV Export: Export subscribers for launch announcement campaigns.
- Duplicate Prevention: Case-insensitive unique email index guarantees zero duplicate entries.
- Source Attribution: Tracks whether the subscriber joined via the global Coming Soon gate or a specific product waitlist modal.

---

## Module 7: Security, Rate Limiting & Blocked IPs

### Purpose
Provides active monitoring of security events, bot mitigations, failed login spikes, and dynamic IP blocklist enforcement.

### Tools & Controls
- Blocked IPs Table: View currently blocked IP addresses with reason, block duration, and creation date.
- Instant IP Block: Add an offending IP to immediately return HTTP 403 `ip_blocked` across all endpoints without redeploying.
- Instant Unblock: Remove an IP row to immediately restore normal access.
- Security Event Log: Inspect recent `BotEvent` records:
  - `Honeypot trap triggered`: Bot filled hidden fields.
  - `Turnstile challenge failed`: Cloudflare challenge token missing or invalid.
  - `Rate limit exceeded`: IP posted excess mutations (HTTP 429).
  - `Credential stuffing detected`: Automated login bursts on multiple emails.

---

## Module 8: Settings, Shipping Rules & Site Mode

### Purpose
Governs storewide operational variables without code modifications or service restarts.

### Configurable Settings
- Site Mode: Toggle between `live` (store open to all public traffic) and `coming_soon` (public traffic redirected to Coming Soon splash; staff preview accessible via cookie/session).
- Launch Date: Countdown target timestamp rendered on `/coming-soon`.
- Free Shipping Threshold: Whole-rupee integer (default: `2000`). Orders with subtotal >= threshold receive free shipping nationwide.
- Flat Shipping Fee: Delivery charge applied when subtotal < threshold (default: `200`).
- Store Contact Info: Primary phone (`0300-0000000`) and support email (`info@supplivix.com`) shown in header, footer, and checkout confirmation.

---

## Module 9: Admin Audit Log

### Purpose
Maintains an immutable, chronologically ordered trail of all administrative actions for accountability and security compliance.

### Logged Attributes
- Timestamp: Exact UTC date and time of the administrative action.
- Staff User: Email and ID of the staff member who initiated the mutation.
- Action Flag: `CREATE`, `UPDATE`, `DELETE`, `STATUS_CHANGE`, `SETTINGS_CHANGE`, `IP_BLOCK`.
- Target Entity: Content type and primary key of the affected record (Product, Order, Setting, Coupon).
- Change Summary: JSON diff detailing previous and new values.

### Invariant
Admin audit log entries are append-only. Staff users cannot edit or delete audit records.
