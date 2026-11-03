from django.urls import path

from .views import (
    AddressDetailView,
    AddressListCreateView,
    ChangePasswordView,
    CurrentUserView,
    LoginView,
    LogoutView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    RegisterView,
)

urlpatterns = [
    # Auth endpoints with /auth/ prefix
    path('auth/register/', RegisterView.as_view(), name='auth-register'),
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/logout/', LogoutView.as_view(), name='auth-logout'),
    path('auth/me/', CurrentUserView.as_view(), name='auth-me'),
    path('auth/change-password/', ChangePasswordView.as_view(), name='auth-change-password'),
    path('auth/password-reset/request/', PasswordResetRequestView.as_view(), name='auth-password-reset-request'),
    path('auth/password-reset/confirm/', PasswordResetConfirmView.as_view(), name='auth-password-reset-confirm'),
    path('auth/addresses/', AddressListCreateView.as_view(), name='auth-address-list-create'),
    path('auth/addresses/<int:pk>/', AddressDetailView.as_view(), name='auth-address-detail'),

    # Direct aliases matching Phase 2 specification
    path('register/', RegisterView.as_view(), name='direct-register'),
    path('login/', LoginView.as_view(), name='direct-login'),
    path('logout/', LogoutView.as_view(), name='direct-logout'),
    path('me/', CurrentUserView.as_view(), name='direct-me'),
    path('change-password/', ChangePasswordView.as_view(), name='direct-change-password'),
    path('password-reset/request/', PasswordResetRequestView.as_view(), name='direct-password-reset-request'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='direct-password-reset-confirm'),

    path('addresses/', AddressListCreateView.as_view(), name='address-list-create'),
    path('addresses/<int:pk>/', AddressDetailView.as_view(), name='address-detail'),
]
