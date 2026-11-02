from django.urls import include, path

from .views import health_check

urlpatterns = [
    path('health/', health_check, name='api-health'),
    path('admin/', include('core.admin_urls')),
    path('', include('accounts.urls')),
    path('', include('catalog.urls')),
    path('', include('cart.urls')),
    path('', include('orders.urls')),
    path('', include('content.urls')),
]
