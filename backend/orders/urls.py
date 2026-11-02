from django.urls import path

from .views import (
    CancelOrderView,
    CheckoutQuoteView,
    OrderDetailView,
    OrderListView,
    PlaceOrderView,
    TrackOrderView,
)

urlpatterns = [
    path('checkout/quote/', CheckoutQuoteView.as_view(), name='checkout-quote'),
    path('orders/', OrderListView.as_view(), name='order-list'),
    path('orders/create/', PlaceOrderView.as_view(), name='order-create'),
    path('orders/track/', TrackOrderView.as_view(), name='order-track'),
    path('orders/<str:number>/', OrderDetailView.as_view(), name='order-detail'),
    path('orders/<str:number>/cancel/', CancelOrderView.as_view(), name='order-cancel'),
]
