import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from catalog.models import Category, Product, ProductFAQ


@pytest.fixture
def client():
    return APIClient()


@pytest.mark.django_db
class TestPhase6SeoAndAeo:
    def test_robots_txt(self, client):
        url = reverse('robots-txt')
        res = client.get(url)
        assert res.status_code == status.HTTP_200_OK
        assert 'text/plain' in res['Content-Type']
        content = res.content.decode('utf-8')
        assert 'Disallow: /admin-panel/' in content
        assert 'Disallow: /checkout' in content
        assert 'Disallow: /account' in content
        assert 'Disallow: /emergency-vault-admin/' in content
        assert 'Sitemap:' in content

        # AEO: Reputable AI crawler directives
        assert 'User-agent: GPTBot' in content
        assert 'User-agent: ClaudeBot' in content
        assert 'User-agent: PerplexityBot' in content
        assert 'User-agent: Google-Extended' in content

    def test_sitemap_xml(self, client):
        cat = Category.objects.create(name='Vitamins', slug='vitamins')
        Product.objects.create(
            name='Daily Multi 60s',
            slug='daily-multi-60s',
            category=cat,
            price=2400,
            sku='SEO-MULTI-01',
            stock=10,
            is_active=True,
        )

        url = reverse('sitemap-xml')
        res = client.get(url)
        assert res.status_code == status.HTTP_200_OK
        assert 'application/xml' in res['Content-Type']
        content = res.content.decode('utf-8')
        assert '<urlset' in content
        assert '/multivitamins</loc>' in content
        assert '/products/daily-multi-60s/</loc>' in content
        assert '<lastmod>' in content

    def test_llms_txt_aeo(self, client):
        url = reverse('llms-txt')
        res = client.get(url)
        assert res.status_code == status.HTTP_200_OK
        assert 'text/plain' in res['Content-Type']
        content = res.content.decode('utf-8')
        assert 'Supplivix Pakistan' in content
        assert 'Cash on Delivery' in content
        assert 'Free shipping on orders above Rs. 2,000' in content
        assert 'Flat Rs. 200' in content
        # Mandatory Regulatory Health Notice
        assert 'These statements have not been evaluated by a regulator' in content

    def test_organization_json_ld(self, client):
        url = reverse('seo-org')
        res = client.get(url)
        assert res.status_code == status.HTTP_200_OK
        data = res.json()
        assert data['@type'] == 'Organization'
        assert data['name'] == 'Supplivix'
        assert 'contactPoint' in data

    def test_spa_shell_product_ssr_curl_check(self, client):
        """
        Verify with curl/no-JS that the HTML of a product page contains
        its title, description, price, and JSON-LD schema with noscript DB content.
        """
        cat = Category.objects.create(name='Multivitamins', slug='multivitamins')
        prod = Product.objects.create(
            name='Supplivix Complete Daily Multivitamin 60s',
            slug='supplivix-complete-daily-multivitamin-60s',
            category=cat,
            product_type='multivitamin',
            price=2450,
            sku='SPLV-MV-TEST-01',
            stock=50,
            short_description='High potency 24-micronutrient daily formulation.',
            description='Engineered with chelated zinc and active B-complex.',
            is_active=True,
        )
        ProductFAQ.objects.create(
            product=prod,
            question='How many multivitamin tablets should I take daily?',
            answer='Follow the label directions. Typical products list one tablet per day with breakfast.',
            sort_order=0,
        )

        res = client.get(f'/products/{prod.slug}/')
        assert res.status_code == status.HTTP_200_OK
        assert 'text/html' in res['Content-Type']
        content = res.content.decode('utf-8')

        # 1. Title under 60 characters
        assert '<title>Supplivix Complete Daily Multivitamin 60s' in content

        # 2. Meta description under 160 characters
        assert 'name="description"' in content
        assert 'High potency 24-micronutrient daily formulation.' in content

        # 3. Whole PKR Price present without executing JS
        assert 'Rs. 2450' in content

        # 4. Structured Data (JSON-LD) with Product schema
        assert 'application/ld+json' in content
        assert '"@type": "Product"' in content
        assert '"price": 2450' in content
        assert '"priceCurrency": "PKR"' in content
        assert '"@type": "FAQPage"' in content

        # 5. <noscript> block with heading and AEO facts
        assert '<noscript>' in content
        assert '<h1>Supplivix Complete Daily Multivitamin 60s</h1>' in content
        assert 'Regulatory Health Notice' in content

    def test_spa_shell_multivitamins_hub_ssr(self, client):
        cat = Category.objects.create(name='Multivitamins', slug='multivitamins')
        Product.objects.create(
            name='Daily Multi 60s',
            slug='daily-multi-60s',
            category=cat,
            product_type='multivitamin',
            price=2400,
            sku='SPLV-MV-HUB-01',
            is_active=True,
        )

        res = client.get('/multivitamins/')
        assert res.status_code == status.HTTP_200_OK
        content = res.content.decode('utf-8')
        assert 'Multivitamins Hub' in content
        assert 'CollectionPage' in content
        assert '<noscript>' in content

    def test_spa_shell_robots_indexing_protection(self, client):
        # Checkout and account routes must carry noindex, nofollow
        res_checkout = client.get('/checkout/')
        assert res_checkout.status_code == status.HTTP_200_OK
        assert 'noindex, nofollow' in res_checkout.content.decode('utf-8')

        res_admin = client.get('/admin-panel/')
        assert res_admin.status_code == status.HTTP_200_OK
        assert 'noindex, nofollow' in res_admin.content.decode('utf-8')
