from django.urls import path

from .views import (
    AddCartItemView,
    ApplyCouponView,
    CartItemDetailView,
    CartView,
    MergeCartView,
    RemoveCouponView,
)

urlpatterns = [
    path('cart/', CartView.as_view(), name='cart-detail'),
    path('cart/items/', AddCartItemView.as_view(), name='cart-item-add'),
    path('cart/items/<int:pk>/', CartItemDetailView.as_view(), name='cart-item-detail'),
    path('cart/coupon/', ApplyCouponView.as_view(), name='cart-coupon-apply'),
    path('cart/coupon/delete/', RemoveCouponView.as_view(), name='cart-coupon-remove'),
    path('cart/merge/', MergeCartView.as_view(), name='cart-merge'),
]
