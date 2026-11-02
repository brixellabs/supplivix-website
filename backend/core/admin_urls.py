from django.urls import path

from .admin_views import (
    AdminCategoryListView,
    AdminCouponListView,
    AdminCustomerListView,
    AdminCustomerToggleStatusView,
    AdminMessageListView,
    AdminMessageMarkReadView,
    AdminOrderDetailView,
    AdminOrderListView,
    AdminOrderTransitionView,
    AdminOverviewView,
    AdminProductCSVExportView,
    AdminProductCSVImportView,
    AdminProductDetailView,
    AdminProductListView,
    AdminReviewListView,
    AdminReviewModerateView,
    AdminSecurityLogsView,
    AdminSecurityUnblockIPView,
)

urlpatterns = [
    # 1. Overview KPIs
    path('overview/', AdminOverviewView.as_view(), name='admin-overview'),

    # 2. Products
    path('products/', AdminProductListView.as_view(), name='admin-products'),
    path('products/<int:pk>/', AdminProductDetailView.as_view(), name='admin-product-detail'),
    path('products/export-csv/', AdminProductCSVExportView.as_view(), name='admin-products-export-csv'),
    path('products/import-csv/', AdminProductCSVImportView.as_view(), name='admin-products-import-csv'),

    # 3. Orders
    path('orders/', AdminOrderListView.as_view(), name='admin-orders'),
    path('orders/<str:number>/', AdminOrderDetailView.as_view(), name='admin-order-detail'),
    path('orders/<str:number>/transition/', AdminOrderTransitionView.as_view(), name='admin-order-transition'),

    # 4. Categories
    path('categories/', AdminCategoryListView.as_view(), name='admin-categories'),

    # 5. Coupons
    path('coupons/', AdminCouponListView.as_view(), name='admin-coupons'),

    # 6. Customers
    path('customers/', AdminCustomerListView.as_view(), name='admin-customers'),
    path('customers/<int:pk>/toggle-status/', AdminCustomerToggleStatusView.as_view(), name='admin-customer-toggle'),

    # 7. Reviews Moderation
    path('reviews/', AdminReviewListView.as_view(), name='admin-reviews'),
    path('reviews/<int:pk>/moderate/', AdminReviewModerateView.as_view(), name='admin-review-moderate'),

    # 8. Contact Messages
    path('messages/', AdminMessageListView.as_view(), name='admin-messages'),
    path('messages/<int:pk>/mark-read/', AdminMessageMarkReadView.as_view(), name='admin-message-read'),

    # 9. Bot Security Logs
    path('security/logs/', AdminSecurityLogsView.as_view(), name='admin-security-logs'),
    path('security/unblock-ip/', AdminSecurityUnblockIPView.as_view(), name='admin-security-unblock'),
]
