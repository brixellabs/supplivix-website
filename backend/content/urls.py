from django.urls import path

from .views import (
    CertificateListView,
    ContactView,
    PublicActiveSaleEventView,
    PublicHeroSlideListView,
    PublicOfferView,
    PublicSaleEventDetailView,
    PublicSettingsView,
    SecurityTokenView,
    WaitlistView,
)

urlpatterns = [
    path('waitlist/', WaitlistView.as_view(), name='waitlist-subscribe'),
    path('contact/', ContactView.as_view(), name='contact-submit'),
    path('security-token/', SecurityTokenView.as_view(), name='security-token'),
    path('settings/public/', PublicSettingsView.as_view(), name='settings-public'),
    path('certificates/', CertificateListView.as_view(), name='certificates-list'),
    path('hero-slides/', PublicHeroSlideListView.as_view(), name='hero-slides-public-list'),
    path('offers/', PublicOfferView.as_view(), name='offers-public-list'),
    path('sale-events/active/', PublicActiveSaleEventView.as_view(), name='sale-events-active'),
    path('sale-events/<slug:slug>/', PublicSaleEventDetailView.as_view(), name='sale-events-detail'),
]
