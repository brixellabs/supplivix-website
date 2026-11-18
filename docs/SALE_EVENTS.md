# Supplivix Sale Events & Campaign Management System

## 1. Overview & Architecture
The **Sale Events & Campaign Management System** empowers Supplivix administrators to launch occasion and seasonal promotional campaigns (Independence Day / Azadi Sale, Eid ul Fitr, Eid ul Adha, Blessed Friday, New Year, Pakistan Day, etc.) with automated runtime price recalculation across Pakistan.

### Core Non-Negotiable Tenets:
1. **Zero Database Overwrite**: The catalog original price (`price` in `catalog_product`) is **NEVER** modified. Base prices remain untouched.
2. **Server-Side Authority**: Price calculations and eligibility checks are performed 100% server-side via `PricingService`. Client-submitted prices or tampering attempts at checkout are strictly ignored.
3. **Time-Bound Autonomy**: An event's active status is evaluated in real time (`start_at <= now < end_at` with `is_enabled=True`). When an event expires, product prices revert back to their base catalog prices with zero manual intervention.
4. **Historical Immutability**: Orders store purchase-time snapshot columns in `order_items` (`original_price`, `sale_price`, `sale_event_id`, `sale_event_name`, `discount_amount`). Subsequent event edits, expiry, or soft-deletions never alter past order records.

---

## 2. Database Schema

### Table: `sale_events`
- `id`: Primary key
- `name`: VARCHAR(150), required
- `slug`: VARCHAR(160), unique indexed
- `description`: TEXT, optional
- `banner_image`: ImageField (`sale_events/`), optional
- `discount_type`: VARCHAR(10), `'percent'` or `'flat'`
- `discount_value`: DECIMAL(10, 2), required, > 0
- `max_discount_amount`: INTEGER, optional (Rupees cap for percentage discounts)
- `apply_on`: VARCHAR(15), `'all'`, `'categories'`, or `'products'`
- `start_at`: DATETIME UTC, required
- `end_at`: DATETIME UTC, required (must be strictly after `start_at`)
- `priority`: INTEGER, default 0 (higher integer takes precedence on overlap)
- `allow_coupon_stacking`: BOOLEAN, default False
- `show_countdown`: BOOLEAN, default True (shows urgency timer on storefront)
- `badge_text`: VARCHAR(60), e.g. "20% OFF EID SALE", "AZADI SALE"
- `status`: VARCHAR(15), computed convenience status (`draft`, `scheduled`, `active`, `expired`, `disabled`)
- `is_enabled`: BOOLEAN, default True
- `deleted_at`: DATETIME UTC, soft-delete timestamp
- `created_by`: FK to User, optional
- `created_at`, `updated_at`: Timestamps

### Table: `sale_event_items`
- `id`: Primary key
- `sale_event_id`: FK to `sale_events` (CASCADE)
- `target_type`: `'category'` or `'product'`
- `target_id`: PositiveInteger (ID of category or product)
- `custom_discount_value`: DECIMAL(10, 2), optional per-item override
- `is_excluded`: BOOLEAN, default False (used for exclusions e.g. "All products except SKU X")
- Unique index: `(sale_event_id, target_type, target_id)`

### Order Snapshot: `order_items`
- `original_price`: Catalog base price in PKR at purchase
- `sale_price`: Effective discounted price in PKR at purchase
- `sale_event_id`: FK to `sale_events` (SET_NULL)
- `sale_event_name`: VARCHAR(150) snapshot of event title
- `discount_amount`: Per-unit PKR savings given to the customer

---

## 3. Pricing Engine: `PricingService`

Located in [`backend/promotions/services.py`](file:///d:/Projects/Client%20Projects/Supplivix/supplivix_website/supplivix_website/backend/promotions/services.py).

### Core Methods:
- `get_active_events(now)`: Returns all active non-deleted events (`is_enabled=True`, `start_at <= now < end_at`), ordered by priority descending. Cached for 60 seconds and invalidated on mutating actions.
- `is_product_eligible(event, product)`:
  - If `apply_on == 'all'`: True unless product ID or category ID is marked `is_excluded=True`.
  - If `apply_on == 'categories'`: True if product's category or any ancestor category matches a target item.
  - If `apply_on == 'products'`: True if product's ID matches a targeted item.
- `get_best_event_for_product(product, now)`:
  - Finds all matching active events.
  - Higher priority wins.
  - On equal priority tie, the event yielding the lowest final price wins. Never stacks two sale events.
- `compute_event_discount(event, product, original_price)`:
  - Checks for per-item `custom_discount_value` override.
  - Percentage formula: `round((original_price * discount_val) / 100)`
  - Respects `max_discount_amount` cap if set.
  - Price floor: price never goes below 0.
- `calculate_sale_price(product, now, variant=None)`: Returns full pricing payload.
- `batch_annotate_products(products_list, now)`: Annotates entire product lists with zero N+1 database queries.

---

## 4. Admin Panel Usage (`/admin-panel` -> Sale Events Tab)

1. **KPI Overview**:
   - Total Campaigns, Active Right Now (with live green pulse), Scheduled Upcoming, Expired/Concluded.
2. **Filter & Search**:
   - Filter by status (`All`, `Active`, `Scheduled`, `Expired`, `Disabled`).
   - Search by campaign title or slug.
3. **Quick Presets**:
   - One-click templates: Independence Day (Azadi Sale), Eid ul Fitr, Eid ul Adha, Blessed Friday, New Year, Pakistan Day.
4. **Live 10-Product Preview**:
   - When creating or editing an event, a live preview table shows up to 10 sample products with their Original Price -> Sale Price -> Customer Savings.
5. **Guardrails**:
   - Warns if discount percentage > 70%.
   - Blocks discount > 90% unless the admin confirms the high discount.
   - Enforces `end_at > start_at` and `discount_value > 0`.
6. **Actions**:
   - **Toggle**: Enable or disable event instantly.
   - **+Extend**: Quickly extend campaign duration by +24 Hours, +48 Hours, +7 Days, or custom hours.
   - **End Now**: Immediately concludes active sale event; storefront prices revert within seconds.
   - **Copy / Duplicate**: Clones last year's event as a draft copy for easy reuse.
   - **Sales Report**: Inspect units sold, gross revenue, total discount given, and top products sold.

