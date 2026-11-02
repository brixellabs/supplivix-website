"""
Root URL configuration for Supplivix e-commerce backend.
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from core.seo_views import llms_txt, robots_txt, sitemap_xml, structured_data_meta
from core.views import health_check

urlpatterns = [
    path('admin/', admin.site.urls),
    path('robots.txt', robots_txt, name='robots-txt'),
    path('sitemap.xml', sitemap_xml, name='sitemap-xml'),
    path('llms.txt', llms_txt, name='llms-txt'),
    path('api/health/', health_check, name='health-check'),
    path('api/v1/seo/organization/', structured_data_meta, name='seo-org'),
    path('api/v1/', include('core.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
