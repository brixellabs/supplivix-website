"""
Root URL configuration for Supplivix e-commerce backend.
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path

from core.seo_views import (
    llms_txt,
    robots_txt,
    sitemap_xml,
    spa_shell_view,
    structured_data_meta,
)
from core.views import health_check

urlpatterns = [
    # Emergency fallback access for Django admin on a non-obvious obscure path
    path('emergency-vault-admin/', admin.site.urls),
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

# SPA Shell catch-all view with SSR head tag injection and noscript DB content
urlpatterns += [
    re_path(r'^(?P<path>.*)$', spa_shell_view, name='spa-shell'),
]
