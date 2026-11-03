"""
SEO & AEO (Answer Engine Optimization) Views for Supplivix.
Generates dynamic sitemap.xml, robots.txt with AI crawlers, llms.txt,
and serves the SPA HTML shell with per-route head tags and <noscript> database injection.
"""

import html
import json
import re
from pathlib import Path

from django.conf import settings
from django.http import HttpResponse, HttpResponseRedirect, JsonResponse
from django.utils import timezone

from catalog.models import Category, Product
from content.models import SiteSetting


def robots_txt(request):
    """
    Serve robots.txt with disallow directives for private/checkout routes,
    explicit allowances for reputable AI search bots, and link to sitemap.
    """
    base_url = getattr(settings, 'SITE_BASE_URL', 'https://supplivix.com').rstrip('/')
    content = f"""User-agent: *
Disallow: /admin/
Disallow: /emergency-vault-admin/
Disallow: /admin-panel/
Disallow: /api/
Disallow: /cart
Disallow: /checkout
Disallow: /account

User-agent: GPTBot
Allow: /
Disallow: /admin-panel/
Disallow: /api/
Disallow: /cart
Disallow: /checkout
Disallow: /account

User-agent: ClaudeBot
Allow: /
Disallow: /admin-panel/
Disallow: /api/
Disallow: /cart
Disallow: /checkout
Disallow: /account

User-agent: PerplexityBot
Allow: /
Disallow: /admin-panel/
Disallow: /api/
Disallow: /cart
Disallow: /checkout
Disallow: /account

User-agent: Google-Extended
Allow: /
Disallow: /admin-panel/
Disallow: /api/
Disallow: /cart
Disallow: /checkout
Disallow: /account

Sitemap: {base_url}/sitemap.xml
"""
    return HttpResponse(content.strip(), content_type='text/plain')


def llms_txt(request):
    """
    Serve /llms.txt adhering to the LLM search crawler standard.
    Allows Perplexity, Claude, ChatGPT, and Gemini to reliably index Supplivix's catalog.
    """
    base_url = getattr(settings, 'SITE_BASE_URL', 'https://supplivix.com').rstrip('/')
    products = Product.objects.filter(is_active=True).select_related('category').order_by('-is_featured', 'id')[:48]

    product_lines = []
    for p in products:
        product_lines.append(
            f"- [{p.name}]({base_url}/products/{p.slug}/): {p.product_type.capitalize()} formulation. "
            f"Price: Rs. {p.price} PKR. Cash on Delivery nationwide in Pakistan."
        )

    products_block = "\n".join(product_lines)

    content = f"""# Supplivix Pakistan - Multivitamins & Skincare

> Pakistan's premier e-commerce platform for bioavailable multivitamins and science-backed skincare.

## Payment & Delivery Model
- Payment Method: 100% Cash on Delivery (COD) across Pakistan. No credit card required.
- Delivery: Free shipping on orders above Rs. 2,000. Flat Rs. 200 fee for orders below.

## Health & Regulatory Compliance Notice
These statements have not been evaluated by a regulator. This product is not intended to diagnose, treat, cure or prevent any disease. Dietary supplements should accompany a balanced diet.

## Core Catalog Formulations
{products_block}

## Official Policies
- [Shipping & COD Policy]({base_url}/shipping-policy)
- [7-Day Return Policy]({base_url}/returns-policy)
- [Privacy Policy]({base_url}/privacy-policy)
- [Terms of Service]({base_url}/terms)
"""
    return HttpResponse(content.strip(), content_type='text/plain')


def sitemap_xml(request):
    """Serve dynamically generated XML sitemap from database with lastmod, splitting if over 5,000 URLs."""
    base_url = getattr(settings, 'SITE_BASE_URL', 'https://supplivix.com').rstrip('/')
    now = timezone.now().strftime('%Y-%m-%d')

    static_urls = [
        ('/', '1.0', 'daily'),
        ('/multivitamins', '0.9', 'daily'),
        ('/shop', '0.9', 'daily'),
        ('/about', '0.6', 'monthly'),
        ('/contact', '0.6', 'monthly'),
        ('/shipping-policy', '0.5', 'monthly'),
        ('/returns-policy', '0.5', 'monthly'),
        ('/privacy-policy', '0.5', 'monthly'),
        ('/terms', '0.5', 'monthly'),
    ]

    active_products = list(Product.objects.filter(is_active=True))
    active_categories = list(Category.objects.filter(is_active=True))

    total_urls = len(static_urls) + len(active_products) + len(active_categories)

    # Split if over 5,000 URLs
    if total_urls > 5000:
        index_xml = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
            f'  <sitemap><loc>{base_url}/sitemap-products.xml</loc><lastmod>{now}</lastmod></sitemap>',
            f'  <sitemap><loc>{base_url}/sitemap-categories.xml</loc><lastmod>{now}</lastmod></sitemap>',
            '</sitemapindex>',
        ]
        return HttpResponse("\n".join(index_xml), content_type='application/xml')

    xml_lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]

    for path, priority, freq in static_urls:
        xml_lines.append(f"""  <url>
    <loc>{base_url}{path}</loc>
    <lastmod>{now}</lastmod>
    <changefreq>{freq}</changefreq>
    <priority>{priority}</priority>
  </url>""")

    for p in active_products:
        lastmod = p.updated_at.strftime('%Y-%m-%d') if p.updated_at else now
        xml_lines.append(f"""  <url>
    <loc>{base_url}/products/{p.slug}/</loc>
    <lastmod>{lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>""")

    for c in active_categories:
        xml_lines.append(f"""  <url>
    <loc>{base_url}/shop?category={c.slug}</loc>
    <lastmod>{now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>""")

    xml_lines.append('</urlset>')
    return HttpResponse("\n".join(xml_lines), content_type='application/xml')


def structured_data_meta(request):
    """Returns Schema.org JSON-LD structured data for Organization."""
    base_url = getattr(settings, 'SITE_BASE_URL', 'https://supplivix.com').rstrip('/')
    schema = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        'name': 'Supplivix',
        'url': base_url,
        'logo': f'{base_url}/assets/logo.png',
        'description': 'Pakistan premier multivitamins and skincare brand with Cash on Delivery nationwide.',
        'contactPoint': {
            '@type': 'ContactPoint',
            'telephone': '+92-300-0000000',
            'contactType': 'customer support',
            'areaServed': 'PK',
            'availableLanguage': ['English', 'Urdu'],
        },
    }
    return JsonResponse(schema)


# ==============================================================================
# SPA SHELL CATCH-ALL SSR VIEW (Rendering Decision Part 1)
# ==============================================================================

def get_base_html_template():
    """Locate the frontend HTML template (preferring dist/index.html)."""
    base_dir = Path(settings.BASE_DIR)
    dist_index = base_dir.parent / 'frontend' / 'dist' / 'index.html'
    if dist_index.exists():
        return dist_index.read_text(encoding='utf-8')

    src_index = base_dir.parent / 'frontend' / 'index.html'
    if src_index.exists():
        return src_index.read_text(encoding='utf-8')

    return """<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Supplivix | Skincare &amp; Multivitamins</title>
  </head>
  <body class="bg-white text-brand-ink antialiased">
    <div id="root"></div>
  </body>
</html>"""


def spa_shell_view(request, path=""):
    """
    Catch-all view that serves the React SPA shell injected with per-route head tags
    (title, meta description, canonical, Open Graph, JSON-LD) and a small <noscript>
    block with main heading, summary, and product list read directly from Neon / PostgreSQL.
    Enables curl, search engines, and AI bots to retrieve full product data without executing JS.
    """
    base_url = getattr(settings, 'SITE_BASE_URL', 'https://supplivix.com').rstrip('/')
    clean_path = path.strip('/')

    # Site mode enforcement (coming_soon vs live)
    site_mode = SiteSetting.get_setting('site_mode', 'live')
    user = getattr(request, 'user', None)
    is_staff = bool(user and user.is_authenticated and user.is_staff)

    if site_mode == 'coming_soon':
        # Exemptions: /privacy-policy, /admin-panel, /coming-soon, emergency vault, and staff preview
        is_exempt = (
            clean_path in ['coming-soon', 'privacy-policy'] or
            clean_path.startswith('admin-panel') or
            clean_path.startswith('api/') or
            clean_path.startswith('emergency-vault-admin')
        )
        if not is_exempt and not is_staff:
            redirect_res = HttpResponseRedirect('/coming-soon')
            redirect_res['X-Robots-Tag'] = 'noindex, nofollow'
            return redirect_res
    elif site_mode == 'live':
        if clean_path == 'coming-soon':
            return HttpResponseRedirect('/')

    template_html = get_base_html_template()

    # Default metadata
    title = 'Supplivix | Bioavailable Multivitamins Pakistan'
    description = (
        'Pakistan premier wellness store for bioavailable multivitamins and skincare. '
        'Nationwide Cash on Delivery with free shipping over Rs. 2,000.'
    )
    canonical = f"{base_url}/{clean_path}/" if clean_path else f"{base_url}/"
    og_type = 'website'
    og_image = f"{base_url}/assets/logo.png"
    robots = 'index, follow'
    schema_graph = [
        {
            '@type': 'Organization',
            'name': 'Supplivix',
            'url': base_url,
            'logo': f'{base_url}/assets/logo.png',
            'contactPoint': {
                '@type': 'ContactPoint',
                'telephone': '+92-300-0000000',
                'contactType': 'customer support',
                'areaServed': 'PK',
                'availableLanguage': ['English', 'Urdu'],
            },
        },
        {
            '@type': 'WebSite',
            'name': 'Supplivix',
            'url': base_url,
            'potentialAction': {
                '@type': 'SearchAction',
                'target': f'{base_url}/shop?search={{search_term_string}}',
                'query-input': 'required name=search_term_string',
            },
        },
    ]

    noscript_content = """<noscript>
      <div id="ssr-container" style="padding:24px;max-width:800px;margin:0 auto;font-family:sans-serif;">
        <h1>Supplivix - Bioavailable Multivitamins &amp; Skincare</h1>
        <p>Pakistan premier wellness e-commerce store with 100% Cash on Delivery (COD) nationwide.</p>
        <p>Free shipping on orders above Rs. 2,000. Flat Rs. 200 delivery fee on smaller orders.</p>
      </div>
    </noscript>"""

    # 1. Product Detail Page: /products/<slug>/
    product_match = re.match(r'^(?:products|multivitamins)/([-\w]+)$', clean_path)
    if product_match and clean_path not in ['products', 'multivitamins']:
        slug = product_match.group(1)
        product = Product.objects.filter(slug=slug, is_active=True).select_related('category').prefetch_related('images', 'faqs', 'reviews').first()
        if not product:
            response = HttpResponse(
                "<!DOCTYPE html><html><head><title>404 Not Found | Supplivix</title><meta name='robots' content='noindex, nofollow' /></head><body><h1>404 Product Not Found</h1></body></html>",
                status=404,
                content_type='text/html; charset=utf-8'
            )
            response['X-Robots-Tag'] = 'noindex, nofollow'
            return response

        title = (product.seo_title or f"{product.name} | Supplivix")[:58]
        description = (product.seo_description or product.short_description or product.description)[:155]
        canonical = f"{base_url}/products/{product.slug}/"
        og_type = 'product'

        first_img = product.images.first()
        if first_img:
            og_image = request.build_absolute_uri(first_img.image.url)

        # Product Offer Schema
        product_schema = {
            '@type': 'Product',
            'name': product.name,
            'sku': product.sku,
            'description': product.description,
            'image': og_image,
            'brand': {'@type': 'Brand', 'name': 'Supplivix'},
            'offers': {
                '@type': 'Offer',
                'priceCurrency': 'PKR',
                'price': product.price,
                'priceValidUntil': '2027-12-31',
                'availability': 'https://schema.org/InStock' if product.stock > 0 else 'https://schema.org/OutOfStock',
                'url': canonical,
                'seller': {'@type': 'Organization', 'name': 'Supplivix'},
            },
        }

        # Only real approved reviews feed aggregateRating
        approved_reviews = list(product.reviews.filter(is_approved=True))
        if approved_reviews:
            avg_rating = round(sum(r.rating for r in approved_reviews) / len(approved_reviews), 1)
            product_schema['aggregateRating'] = {
                '@type': 'AggregateRating',
                'ratingValue': avg_rating,
                'reviewCount': len(approved_reviews),
                'bestRating': 5,
                'worstRating': 1,
            }
            product_schema['review'] = [
                {
                    '@type': 'Review',
                    'author': {'@type': 'Person', 'name': r.user.full_name if r.user and r.user.full_name else 'Verified Buyer'},
                    'datePublished': r.created_at.strftime('%Y-%m-%d'),
                    'reviewRating': {'@type': 'Rating', 'ratingValue': r.rating, 'bestRating': 5},
                    'name': r.title,
                    'reviewBody': r.body,
                }
                for r in approved_reviews[:5]
            ]

        schema_graph.append(product_schema)

        # BreadcrumbList Schema
        cat_name = product.category.name if product.category else 'Multivitamins'
        cat_slug = product.category.slug if product.category else 'multivitamins'
        schema_graph.append({
            '@type': 'BreadcrumbList',
            'itemListElement': [
                {'@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': f"{base_url}/"},
                {'@type': 'ListItem', 'position': 2, 'name': cat_name, 'item': f"{base_url}/shop?category={cat_slug}"},
                {'@type': 'ListItem', 'position': 3, 'name': product.name, 'item': canonical},
            ],
        })

        # FAQs (feeds AEO and FAQPage schema)
        faq_entities = []
        faq_html_items = []
        for f in product.faqs.all():
            faq_entities.append({
                '@type': 'Question',
                'name': f.question,
                'acceptedAnswer': {'@type': 'Answer', 'text': f.answer},
            })
            faq_html_items.append(f"<div><h4>{html.escape(f.question)}</h4><p>{html.escape(f.answer)}</p></div>")

        if faq_entities:
            schema_graph.append({
                '@type': 'FAQPage',
                'mainEntity': faq_entities,
            })

        faq_block_html = f"<section><h3>Frequently Asked Questions</h3>{''.join(faq_html_items)}</section>" if faq_html_items else ""

        # AEO 40-60 word formulation brief
        if product.product_type == 'multivitamin':
            direct_summary = (
                f"{product.name} is a high-potency bioavailable multivitamin formulated for adults to address documented "
                f"micronutrient gaps. It supports metabolic cellular energy and daily immune resilience. Adults take one "
                f"tablet daily in the morning with a full glass of water and breakfast alongside a balanced diet."
            )
        else:
            direct_summary = (
                f"{product.name} is a science-backed topical skincare formulation engineered for all skin types to fortify "
                f"the epidermal barrier and restore natural skin hydration. Apply a few drops gently to clean skin daily in "
                f"the morning or evening before heavier moisturizers."
            )

        noscript_content = f"""<noscript>
          <article style="padding:24px;max-width:800px;margin:0 auto;font-family:sans-serif;">
            <h1>{html.escape(product.name)}</h1>
            <p><strong>Price:</strong> Rs. {product.price} (Cash on Delivery nationwide in Pakistan)</p>
            <p><strong>SKU:</strong> {html.escape(product.sku)} | <strong>Category:</strong> {html.escape(cat_name)}</p>
            <p><strong>Direct Summary:</strong> {html.escape(direct_summary)}</p>
            <div><h3>Formula Details</h3><p>{html.escape(product.description)}</p></div>
            {faq_block_html}
            <p><small>Regulatory Health Notice: These statements have not been evaluated by a regulator. This product is not intended to diagnose, treat, cure or prevent any disease.</small></p>
          </article>
        </noscript>"""

    # 2. Multivitamins Hub Page: /multivitamins
    elif clean_path == 'multivitamins':
        title = 'Multivitamins Hub | Supplivix Pakistan'
        description = (
            "Explore Pakistan's premier bioavailable multivitamin formulations. "
            "100% Cash on Delivery, zero credit card required, nationwide delivery."
        )
        canonical = f"{base_url}/multivitamins/"

        top_multis = list(Product.objects.filter(product_type='multivitamin', is_active=True).order_by('-is_featured', 'id')[:10])
        items_schema = [
            {
                '@type': 'ListItem',
                'position': idx + 1,
                'name': p.name,
                'url': f"{base_url}/products/{p.slug}/",
            }
            for idx, p in enumerate(top_multis)
        ]

        schema_graph.append({
            '@type': 'CollectionPage',
            'name': 'Multivitamins Hub',
            'description': description,
            'url': canonical,
            'mainEntity': {
                '@type': 'ItemList',
                'itemListElement': items_schema,
            },
        })

        multi_list_html = "".join(
            f"<li><a href='/products/{p.slug}/'>{html.escape(p.name)}</a> - Rs. {p.price}</li>"
            for p in top_multis
        )

        direct_summary = (
            "Supplivix multivitamins are bioavailable micronutrient formulations engineered for adults to address "
            "documented nutritional deficiencies. They support cellular vitality, metabolic energy, and immune resilience "
            "with chelated zinc, methylfolate, and active B-complex vitamins. Delivered nationwide across Pakistan via standard Cash on Delivery."
        )

        noscript_content = f"""<noscript>
          <div style="padding:24px;max-width:800px;margin:0 auto;font-family:sans-serif;">
            <h1>Bioavailable Multivitamins for Daily Vitality</h1>
            <p><strong>Direct Summary:</strong> {direct_summary}</p>
            <h3>Featured Multivitamins</h3>
            <ul>{multi_list_html}</ul>
            <p><small>Dietary Supplement Notice: These statements have not been evaluated by a regulator. This product is not intended to diagnose, treat, cure or prevent any disease.</small></p>
          </div>
        </noscript>"""

    # 3. Shop Page: /shop
    elif clean_path == 'shop':
        title = 'Shop Bioavailable Formulas | Supplivix'
        description = (
            "Browse Supplivix full catalog of bioavailable multivitamins and science-backed skincare. "
            "Nationwide Cash on Delivery with free delivery over Rs. 2,000."
        )
        canonical = f"{base_url}/shop/"
        schema_graph.append({
            '@type': 'CollectionPage',
            'name': 'Supplivix Catalog',
            'description': description,
            'url': canonical,
        })
        all_prods = list(Product.objects.filter(is_active=True).order_by('-is_featured', 'id')[:24])
        prod_items_html = "".join(
            f"<li><a href='/products/{p.slug}/'>{html.escape(p.name)}</a> - Rs. {p.price}</li>"
            for p in all_prods
        )
        noscript_content = f"""<noscript>
          <div style="padding:24px;max-width:800px;margin:0 auto;font-family:sans-serif;">
            <h1>Supplivix Catalog - All Formulations</h1>
            <p>Browse genuine multivitamins and skincare products delivered nationwide via Cash on Delivery.</p>
            <ul>{prod_items_html}</ul>
          </div>
        </noscript>"""

    # 4. Contact Page: /contact
    elif clean_path == 'contact':
        title = 'Contact Supplivix Care | Nationwide COD Support'
        description = (
            "Get in touch with Supplivix customer care in Karachi. Phone, WhatsApp, "
            "and email support for all Cash on Delivery orders across Pakistan."
        )
        canonical = f"{base_url}/contact/"
        schema_graph.append({
            '@type': 'ContactPage',
            'name': 'Contact Supplivix Care',
            'url': canonical,
        })
        noscript_content = """<noscript>
          <div style="padding:24px;max-width:800px;margin:0 auto;font-family:sans-serif;">
            <h1>Contact Supplivix Care</h1>
            <p>Customer support team in Karachi, Pakistan. Reach us for order assistance, shipping queries, or bulk inquiries.</p>
            <p>Phone: 0300-0000000 | Email: care@supplivix.com | Hours: Mon-Sat 9am-6pm</p>
          </div>
        </noscript>"""

    # 5. Policies
    elif clean_path in ['privacy-policy', 'terms', 'shipping-policy', 'returns-policy']:
        policy_meta = {
            'privacy-policy': {
                'title': 'Privacy Policy | Supplivix Pakistan',
                'desc': 'Read the Supplivix privacy policy covering customer data protection, order confidentiality, and nationwide Cash on Delivery communications in Pakistan.',
                'h1': 'Supplivix Privacy Policy',
            },
            'terms': {
                'title': 'Terms of Service | Supplivix Pakistan',
                'desc': 'Review Supplivix terms of service including Cash on Delivery ordering, shipping timelines across Pakistan, and genuine formulation standards.',
                'h1': 'Terms of Service',
            },
            'shipping-policy': {
                'title': 'Shipping & Delivery Policy | Supplivix',
                'desc': 'Supplivix shipping policy: Free delivery on orders over Rs. 2,000, Rs. 200 fee below. Nationwide Cash on Delivery across Pakistan in 2 to 4 business days.',
                'h1': 'Shipping & Delivery Policy',
            },
            'returns-policy': {
                'title': '7-Day Return Policy & Guarantee | Supplivix',
                'desc': 'Supplivix 7-day hassle-free return policy for Cash on Delivery orders across Pakistan. Simple verification and direct support for damaged or sealed items.',
                'h1': '7-Day Return Policy & Guarantee',
            },
        }
        meta = policy_meta.get(clean_path, {})
        title = meta.get('title', 'Policy | Supplivix')
        description = meta.get('desc', description)
        canonical = f"{base_url}/{clean_path}/"
        noscript_content = f"""<noscript>
          <div style="padding:24px;max-width:800px;margin:0 auto;font-family:sans-serif;">
            <h1>{meta.get('h1', 'Policy')}</h1>
            <p>{description}</p>
          </div>
        </noscript>"""

    # 6. Admin / Private / Coming Soon routes
    elif clean_path in ['admin-panel', 'cart', 'checkout', 'account', 'coming-soon'] or site_mode == 'coming_soon':
        robots = 'noindex, nofollow'
        title = 'Coming Soon | Supplivix' if (clean_path == 'coming-soon' or site_mode == 'coming_soon') else 'Supplivix Portal'
        canonical = f"{base_url}/{clean_path}/"

    # Build head injection
    head_injections = [
        f'<title>{html.escape(title)}</title>',
        f'<meta name="description" content="{html.escape(description)}" />',
        f'<meta name="robots" content="{robots}" />',
        f'<link rel="canonical" href="{canonical}" />',
        f'<meta property="og:title" content="{html.escape(title)}" />',
        f'<meta property="og:description" content="{html.escape(description)}" />',
        f'<meta property="og:url" content="{canonical}" />',
        f'<meta property="og:type" content="{og_type}" />',
        f'<meta property="og:image" content="{og_image}" />',
        '<meta property="og:site_name" content="Supplivix" />',
        '<meta name="twitter:card" content="summary_large_image" />',
        f'<meta name="twitter:title" content="{html.escape(title)}" />',
        f'<meta name="twitter:description" content="{html.escape(description)}" />',
        f'<meta name="twitter:image" content="{og_image}" />',
        f'<script type="application/ld+json">{json.dumps({"@context": "https://schema.org", "@graph": schema_graph})}</script>',
    ]

    injected_head = "\n    ".join(head_injections)

    # Strip any pre-existing head SEO tags, scripts, and noscript from template_html to avoid duplicate tags
    rendered_html = re.sub(r'<title>.*?</title>', '', template_html, flags=re.DOTALL | re.IGNORECASE)
    rendered_html = re.sub(r'<meta\s+name=["\'](?:description|robots|twitter:[^"\']+)["\'][^>]*>', '', rendered_html, flags=re.IGNORECASE)
    rendered_html = re.sub(r'<meta\s+property=["\'](?:og:[^"\']+|twitter:[^"\']+)["\'][^>]*>', '', rendered_html, flags=re.IGNORECASE)
    rendered_html = re.sub(r'<link\s+rel=["\']canonical["\'][^>]*>', '', rendered_html, flags=re.IGNORECASE)
    rendered_html = re.sub(r'<script\s+type=["\']application/ld\+json["\']>.*?</script>', '', rendered_html, flags=re.DOTALL | re.IGNORECASE)
    rendered_html = re.sub(r'<noscript>.*?</noscript>', '', rendered_html, flags=re.DOTALL | re.IGNORECASE)

    # Inject before </head>
    rendered_html = rendered_html.replace('</head>', f'    {injected_head}\n  </head>')
    # Inject noscript right after <body>
    rendered_html = re.sub(r'(<body[^>]*>)', rf'\1\n    {noscript_content}', rendered_html)

    response = HttpResponse(rendered_html, content_type='text/html; charset=utf-8')
    if robots == 'noindex, nofollow' or site_mode == 'coming_soon':
        response['X-Robots-Tag'] = 'noindex, nofollow'
    return response
