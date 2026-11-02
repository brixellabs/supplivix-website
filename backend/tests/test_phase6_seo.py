import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from catalog.models import Category, Product


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
        assert 'Sitemap:' in content

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

    def test_llms_txt_aeo(self, client):
        url = reverse('llms-txt')
        res = client.get(url)
        assert res.status_code == status.HTTP_200_OK
        assert 'text/plain' in res['Content-Type']
        content = res.content.decode('utf-8')
        assert 'Supplivix Pakistan' in content
        assert 'Cash on Delivery' in content
        # Rule 5: Regulatory Health Notice
        assert 'These statements have not been evaluated by a regulator' in content

    def test_organization_json_ld(self, client):
        url = reverse('seo-org')
        res = client.get(url)
        assert res.status_code == status.HTTP_200_OK
        data = res.json()
        assert data['@type'] == 'Organization'
        assert data['name'] == 'Supplivix'
        assert 'contactPoint' in data
