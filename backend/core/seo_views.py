"""
SEO & AEO (AI Engine Optimization) Views for Supplivix.
Generates sitemap.xml, robots.txt, llms.txt, and structured Schema.org JSON-LD data.
"""

from django.conf import settings
from django.http import HttpResponse, JsonResponse
from django.utils import timezone

from catalog.models import Category, Product


def robots_txt(request):
    """Serve robots.txt with disallow directives for admin/cart/checkout and link to sitemap."""
    base_url = getattr(settings, 'SITE_BASE_URL', 'https://supplivix.com').rstrip('/')
    content = f"""User-agent: *
Disallow: /admin/
Disallow: /emergency-vault-admin/
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
    Allows Perplexity, Claude, ChatGPT, and Gemini to reliably understand Supplivix's catalog.
    """
    base_url = getattr(settings, 'SITE_BASE_URL', 'https://supplivix.com').rstrip('/')
    products = Product.objects.filter(is_active=True).select_related('category')[:30]

    product_lines = []
    for p in products:
        product_lines.append(
            f"- [{p.name}]({base_url}/products/{p.slug}/): {p.product_type.capitalize()} formula. "
            f"Price: Rs. {p.price} PKR. Cash on Delivery nationwide."
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
    """Serve dynamically generated XML sitemap."""
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

    # Dynamic active products
    for p in Product.objects.filter(is_active=True):
        xml_lines.append(f"""  <url>
    <loc>{base_url}/products/{p.slug}/</loc>
    <lastmod>{p.updated_at.strftime('%Y-%m-%d')}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>""")

    # Dynamic categories
    for c in Category.objects.filter(is_active=True):
        xml_lines.append(f"""  <url>
    <loc>{base_url}/shop?category={c.slug}</loc>
    <lastmod>{now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>""")

    xml_lines.append('</urlset>')
    return HttpResponse("\n".join(xml_lines), content_type='application/xml')


def structured_data_meta(request):
    """
    Returns Schema.org JSON-LD structured data for Organization and active products.
    Used for SSR injection and external metadata validators.
    """
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
