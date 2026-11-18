# Sale Events & Campaign Management QA Checklist

| Step # | Verification Item | Target Behaviour | Status |
|:---|:---|:---|:---|
| 1 | Database Integrity | Original catalog prices in `catalog_product` are unmodified after creating, activating, or ending a sale. | Verified |
| 2 | Runtime Calculation | `ProductListSerializer` and `ProductDetailSerializer` return `sale_price`, `original_price`, `is_on_sale`, `sale_badge`, and `show_countdown`. | Verified |
| 3 | Homepage Banner | When a sale event is active, high-impact seasonal banner with badge, countdown timer, and CTA button renders on `/`. | Verified |
| 4 | Product Card Display | Products render the event badge, current sale price, and strikethrough original price everywhere on the storefront. | Verified |
| 5 | Product Detail Timer | On `/products/:slug`, live countdown timer displays remaining days, hours, minutes, and seconds until the sale ends. | Verified |
| 6 | Dedicated Sale Page | `/sale/:slug` displays event details, urgency countdown, category filter, price sorting, and eligible product cards. | Verified |
| 7 | Cart Pricing | `CartItem` unit price and subtotal show discounted prices during active sales. | Verified |
| 8 | Anti-Price Tampering | `PlaceOrderView` and `place_cod_order` recalculate prices strictly on the server and ignore fake client prices. | Verified |
| 9 | Order Snapshots | `OrderItem` stores immutable snapshots: `original_price`, `sale_price`, `sale_event`, `sale_event_name`, `discount_amount`. | Verified |
| 10 | Past Order Protection | Deleting or expiring a sale event does not alter past order totals or snapshots. | Verified |
| 11 | Coupon Stacking (False) | When `allow_coupon_stacking=false`, additional promo vouchers cannot be applied on top of the discounted price. | Verified |
| 12 | Coupon Stacking (True) | When `allow_coupon_stacking=true`, coupons calculate on the sale price rather than the original price. | Verified |
| 13 | Priority Resolution | When multiple events overlap, the higher priority integer wins; on tie, lowest sale price wins. | Verified |
| 14 | Category Hierarchy | Category targeting includes subcategories (e.g. Wellness parent discount covers Daily Multivitamins child). | Verified |
| 15 | Scope Exclusions | Products marked `is_excluded=True` do not receive discounts in an "All Products" sale. | Verified |
| 16 | Admin Presets | One-click presets (Azadi Sale, Eid ul Fitr, Eid ul Adha, Blessed Friday, New Year, Pakistan Day) prefill title and badge. | Verified |
| 17 | Live 10-Product Preview | Admin form displays real-time pricing preview of up to 10 products with before/after prices and savings. | Verified |
| 18 | Admin Guardrails | System warns on discounts > 70% and requires confirmation for discounts > 90%. | Verified |
| 19 | Admin Quick Actions | Toggle Enable/Disable, Extend (+24h), End Now, Duplicate as draft, and Delete work seamlessly. | Verified |
| 20 | Performance Benchmark | `PricingService.batch_annotate_products` annotates full catalogs with zero extra N+1 queries. | Verified |
| 21 | Cache Invalidation | Mutating admin actions (create, update, delete, toggle) invalidate `active_sale_events_cache`. | Verified |
| 22 | Automated Test Suite | `backend/tests/test_sale_events_pricing.py` has 30 passing tests covering all scenarios. | Verified |

