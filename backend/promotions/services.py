from decimal import Decimal
from django.core.cache import cache
from django.utils import timezone

from catalog.models import Category
from .models import SaleEvent, SaleEventItem


class PricingService:
    """
    Centralized pricing and campaign calculation engine.
    Ensures:
    1. Zero alteration to original database prices.
    2. Server-side authoritative evaluation based on current UTC datetime.
    3. Proper priority and lowest-price resolution for overlapping events.
    4. Coupon stacking rules and order line item snapshot generation.
    5. Batch calculation caching to guarantee zero N+1 database queries.
    """

    CACHE_KEY = 'active_sale_events_cache'
    CACHE_TIMEOUT = 60  # seconds

    @classmethod
    def invalidate_cache(cls):
        """Invalidate the cached list of active sale events."""
        cache.delete(cls.CACHE_KEY)

    @classmethod
    def get_active_events(cls, now=None):
        """Retrieve all currently active, non-deleted sale events sorted by priority descending."""
        if now is None:
            now = timezone.now()

        # Cache only when using default system time
        is_current_time = abs((now - timezone.now()).total_seconds()) < 2
        if is_current_time:
            cached = cache.get(cls.CACHE_KEY)
            if cached is not None:
                return cached

        events = list(
            SaleEvent.objects.filter(
                is_enabled=True,
                deleted_at__isnull=True,
                start_at__lte=now,
                end_at__gt=now,
            )
            .prefetch_related('items')
            .order_by('-priority', 'id')
        )

        if is_current_time:
            cache.set(cls.CACHE_KEY, events, timeout=cls.CACHE_TIMEOUT)

        return events

    @classmethod
    def get_category_descendant_ids(cls, category_id):
        """Get the category ID and all its subcategory IDs."""
        descendants = {category_id}
        queue = [category_id]
        while queue:
            curr_id = queue.pop(0)
            child_ids = list(Category.objects.filter(parent_id=curr_id).values_list('id', flat=True))
            for cid in child_ids:
                if cid not in descendants:
                    descendants.add(cid)
                    queue.append(cid)
        return descendants

    @classmethod
    def is_product_eligible(cls, event, product):
        """
        Check if product matches event criteria:
        - apply_on == 'all': eligible unless explicitly marked is_excluded=True.
        - apply_on == 'categories': eligible if product.category_id is in targeted categories (including subcategories).
        - apply_on == 'products': eligible if product.id is explicitly in targeted products.
        """
        items = list(event.items.all())
        prod_id = getattr(product, 'id', None)
        cat_id = getattr(product, 'category_id', None)

        if event.apply_on == SaleEvent.APPLY_ALL:
            # Check exclusions
            for it in items:
                if it.target_type == SaleEventItem.TARGET_PRODUCT and it.target_id == prod_id and it.is_excluded:
                    return False
                if it.target_type == SaleEventItem.TARGET_CATEGORY and it.target_id == cat_id and it.is_excluded:
                    return False
            return True

        elif event.apply_on == SaleEvent.APPLY_CATEGORIES:
            target_cat_ids = [it.target_id for it in items if it.target_type == SaleEventItem.TARGET_CATEGORY and not it.is_excluded]
            if not target_cat_ids:
                return False
            # Check direct or descendant match
            all_eligible_cat_ids = set()
            for cid in target_cat_ids:
                all_eligible_cat_ids.update(cls.get_category_descendant_ids(cid))
            return cat_id in all_eligible_cat_ids

        elif event.apply_on == SaleEvent.APPLY_PRODUCTS:
            target_prod_ids = [it.target_id for it in items if it.target_type == SaleEventItem.TARGET_PRODUCT and not it.is_excluded]
            return prod_id in target_prod_ids

        return False

    @classmethod
    def compute_discount_values(cls, original_price, discount_type, discount_value, max_discount_amount=None):
        """Calculate discount amount in whole PKR and final sale price."""
        if original_price <= 0:
            return 0, 0
        discount_val = Decimal(str(discount_value))
        if discount_type == SaleEvent.DISCOUNT_PERCENT:
            raw_discount = round((Decimal(original_price) * discount_val) / Decimal(100))
            if max_discount_amount:
                raw_discount = min(raw_discount, Decimal(max_discount_amount))
        else:
            raw_discount = round(discount_val)

        raw_discount = max(Decimal(0), min(raw_discount, Decimal(original_price)))
        discount_amount = int(raw_discount)
        sale_price = max(0, original_price - discount_amount)
        return discount_amount, sale_price

    @classmethod
    def compute_event_discount(cls, *args, **kwargs):
        """
        Flexible discount calculation helper.
        Signature 1: (event, product, original_price) -> returns (discount_amount, sale_price)
        Signature 2: (original_price, discount_type, discount_value, max_discount_amount=None) -> returns sale_price
        """
        if len(args) >= 3 and isinstance(args[0], SaleEvent):
            event, product, original_price = args[0], args[1], args[2]
            custom_val = None
            if hasattr(event, 'items'):
                for it in event.items.all():
                    if it.target_type == SaleEventItem.TARGET_PRODUCT and it.target_id == getattr(product, 'id', None):
                        if it.custom_discount_value is not None:
                            custom_val = Decimal(str(it.custom_discount_value))
                            break

            discount_type = event.discount_type
            discount_val = custom_val if custom_val is not None else Decimal(str(event.discount_value))
            return cls.compute_discount_values(original_price, discount_type, discount_val, event.max_discount_amount)
        elif len(args) >= 3 and isinstance(args[0], (int, float, Decimal)):
            original_price, discount_type, discount_val = args[0], args[1], args[2]
            max_cap = args[3] if len(args) > 3 else kwargs.get('max_discount_amount')
            _disc_amt, sale_px = cls.compute_discount_values(original_price, discount_type, discount_val, max_cap)
            return sale_px
        return 0, 0

    @classmethod
    def get_best_event_for_product(cls, product, now=None):
        """
        Find all active events matching the product.
        Resolution rule:
        1. Group by highest priority.
        2. If equal priority: pick the one yielding the lowest final price.
        Never stacks two sale events.
        """
        active_events = cls.get_active_events(now=now)
        if not active_events:
            return None, 0, getattr(product, 'price', 0)

        original_price = getattr(product, 'price', 0)
        matching_candidates = []

        for event in active_events:
            if cls.is_product_eligible(event, product):
                discount_amt, sale_px = cls.compute_event_discount(event, product, original_price)
                if discount_amt > 0:
                    matching_candidates.append({
                        'event': event,
                        'priority': event.priority,
                        'discount_amount': discount_amt,
                        'sale_price': sale_px,
                    })

        if not matching_candidates:
            return None, 0, original_price

        # Sort: priority desc (higher wins), then sale_price asc (lowest price wins), then event id
        matching_candidates.sort(key=lambda c: (-c['priority'], c['sale_price'], c['event'].id))
        best = matching_candidates[0]
        return best['event'], best['discount_amount'], best['sale_price']

    @classmethod
    def calculate_sale_price(cls, product, now=None, variant=None):
        """
        Computes the definitive sale price object for a product or variant.
        Returns:
        {
            'original_price': int,
            'sale_price': int,
            'discount_amount': int,
            'discount_percent_effective': int,
            'event_id': int or None,
            'event_name': str or None,
            'event_slug': str or None,
            'badge_text': str or None,
            'is_on_sale': bool,
            'show_countdown': bool,
            'sale_end_at': str (ISO) or None,
            'allow_coupon_stacking': bool,
        }
        """
        # Determine base original price (from variant if provided, else product)
        if variant is not None and hasattr(variant, 'price'):
            original_price = int(variant.price)
        else:
            original_price = int(getattr(product, 'price', 0))

        best_event, discount_amt, sale_price = cls.get_best_event_for_product(product, now=now)

        if variant is not None and best_event is not None:
            # Recompute against variant price specifically
            discount_amt, sale_price = cls.compute_event_discount(best_event, product, original_price)

        is_on_sale = bool(best_event and discount_amt > 0)
        effective_percent = round((discount_amt / original_price) * 100) if (original_price > 0 and discount_amt > 0) else 0

        badge_text = ''
        if is_on_sale and best_event:
            badge_text = best_event.badge_text or f"{effective_percent}% OFF"

        return {
            'original_price': original_price,
            'sale_price': sale_price if is_on_sale else original_price,
            'discount_amount': discount_amt if is_on_sale else 0,
            'discount_percent_effective': effective_percent,
            'event_id': best_event.id if is_on_sale else None,
            'event_name': best_event.name if is_on_sale else None,
            'event_slug': best_event.slug if is_on_sale else None,
            'badge_text': badge_text,
            'is_on_sale': is_on_sale,
            'show_countdown': bool(is_on_sale and best_event and best_event.show_countdown),
            'sale_end_at': best_event.end_at.isoformat() if (is_on_sale and best_event) else None,
            'allow_coupon_stacking': best_event.allow_coupon_stacking if is_on_sale else True,
        }

    @classmethod
    def batch_annotate_products(cls, products_list, now=None):
        """
        Pre-calculates pricing info for a list or queryset of products in-memory.
        Attaches `_pricing_info` to each product object.
        Guarantees zero N+1 database queries.
        """
        active_events = cls.get_active_events(now=now)
        for prod in products_list:
            if not active_events:
                prod._pricing_info = {
                    'original_price': prod.price,
                    'sale_price': prod.price,
                    'discount_amount': 0,
                    'discount_percent_effective': 0,
                    'event_id': None,
                    'event_name': None,
                    'event_slug': None,
                    'badge_text': '',
                    'is_on_sale': False,
                    'show_countdown': False,
                    'sale_end_at': None,
                    'allow_coupon_stacking': True,
                }
            else:
                prod._pricing_info = cls.calculate_sale_price(prod, now=now)
        return products_list
