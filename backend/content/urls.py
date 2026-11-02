from django.urls import path

from .views import ContactView, PublicSettingsView, WaitlistView

urlpatterns = [
    path('waitlist/', WaitlistView.as_view(), name='waitlist-subscribe'),
    path('contact/', ContactView.as_view(), name='contact-submit'),
    path('settings/public/', PublicSettingsView.as_view(), name='settings-public'),
]
