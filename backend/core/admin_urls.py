from django.urls import path

from .admin_views import (
    AdminAuditLogsView,
    AdminCategoryDetailView,
    AdminCategoryListView,
    AdminCategoryReorderView,
    AdminCertificateDetailView,
    AdminCertificateListView,
    AdminHeroSlideDetailView,
    AdminHeroSlideListView,
    AdminOfferDetailView,
    AdminOfferListView,
    AdminSaleEventDetailView,
    AdminSaleEventDuplicateView,
    AdminSaleEventEndNowView,
    AdminSaleEventExtendView,
    AdminSaleEventListView,
    AdminSaleEventPreviewView,
    AdminSaleEventReportView,
    AdminSaleEventToggleView,
    AdminCouponDetailView,
    AdminCouponGenerateCodeView,
    AdminCouponListView,
    AdminCouponRedemptionsView,
    AdminCustomerListView,
    AdminCustomerOrdersView,
    AdminCustomerToggleStatusView,
    AdminMessageListView,
    AdminMessageMarkReadView,
    AdminMessageToggleHandledView,
    AdminOrderCSVExportView,
    AdminOrderDetailView,
    AdminOrderListView,
    AdminOrderMarkCODCollectedView,
    AdminOrderTransitionView,
    AdminOverviewView,
    AdminProductBulkStatusView,
    AdminProductCSVExportView,
    AdminProductCSVImportView,
    AdminProductDetailView,
    AdminProductFAQView,
    AdminProductImageUploadView,
    AdminProductListView,
    AdminProductTranslateUrduView,
    AdminReviewDeleteView,
    AdminReviewListView,
    AdminReviewModerateView,
    AdminSecurityBlockIPView,
    AdminSecurityLogsView,
    AdminSecurityUnblockIPView,
    AdminSettingsView,
    AdminStaffDetailView,
    AdminStaffListView,
    AdminWaitlistCSVExportView,
    AdminWaitlistListView,
)

urlpatterns = [
    # 1. Overview KPIs
    path('overview/', AdminOverviewView.as_view(), name='admin-overview'),

    # 2. Products
    path('products/', AdminProductListView.as_view(), name='admin-products'),
    path('products/<int:pk>/', AdminProductDetailView.as_view(), name='admin-product-detail'),
    path('products/<int:pk>/images/', AdminProductImageUploadView.as_view(), name='admin-product-images'),
    path('products/<int:pk>/images/<int:image_id>/', AdminProductImageUploadView.as_view(), name='admin-product-image-detail'),
    path('products/<int:pk>/faqs/', AdminProductFAQView.as_view(), name='admin-product-faqs'),
    path('products/<int:pk>/faqs/<int:faq_id>/', AdminProductFAQView.as_view(), name='admin-product-faq-detail'),
    path('products/bulk-status/', AdminProductBulkStatusView.as_view(), name='admin-products-bulk-status'),
    path('products/export-csv/', AdminProductCSVExportView.as_view(), name='admin-products-export-csv'),
    path('products/import-csv/', AdminProductCSVImportView.as_view(), name='admin-products-import-csv'),
    path('products/translate-urdu/', AdminProductTranslateUrduView.as_view(), name='admin-products-translate-urdu'),

    # 3. Categories
    path('categories/', AdminCategoryListView.as_view(), name='admin-categories'),
    path('categories/<int:pk>/', AdminCategoryDetailView.as_view(), name='admin-category-detail'),
    path('categories/reorder/', AdminCategoryReorderView.as_view(), name='admin-categories-reorder'),

    # 4. Orders
    path('orders/', AdminOrderListView.as_view(), name='admin-orders'),
    path('orders/<str:number>/', AdminOrderDetailView.as_view(), name='admin-order-detail'),
    path('orders/<str:number>/transition/', AdminOrderTransitionView.as_view(), name='admin-order-transition'),
    path('orders/<str:number>/mark-cod-collected/', AdminOrderMarkCODCollectedView.as_view(), name='admin-order-mark-cod-collected'),
    path('orders/export-csv/', AdminOrderCSVExportView.as_view(), name='admin-orders-export-csv'),

    # 5. Coupons
    path('coupons/', AdminCouponListView.as_view(), name='admin-coupons'),
    path('coupons/<int:pk>/', AdminCouponDetailView.as_view(), name='admin-coupon-detail'),
    path('coupons/generate-code/', AdminCouponGenerateCodeView.as_view(), name='admin-coupon-generate-code'),
    path('coupons/<int:pk>/redemptions/', AdminCouponRedemptionsView.as_view(), name='admin-coupon-redemptions'),

    # 5b. Certificates
    path('certificates/', AdminCertificateListView.as_view(), name='admin-certificates'),
    path('certificates/<int:pk>/', AdminCertificateDetailView.as_view(), name='admin-certificate-detail'),

    # 5b-2. Hero Banner Slides
    path('hero-slides/', AdminHeroSlideListView.as_view(), name='admin-hero-slides'),
    path('hero-slides/<int:pk>/', AdminHeroSlideDetailView.as_view(), name='admin-hero-slide-detail'),

    # 5c. Promotional Offers & Deals
    path('offers/', AdminOfferListView.as_view(), name='admin-offers'),
    path('offers/<int:pk>/', AdminOfferDetailView.as_view(), name='admin-offer-detail'),

    # 5d. Sale Events & Campaigns
    path('sale-events/', AdminSaleEventListView.as_view(), name='admin-sale-events'),
    path('sale-events/preview/', AdminSaleEventPreviewView.as_view(), name='admin-sale-events-preview'),
    path('sale-events/<int:pk>/', AdminSaleEventDetailView.as_view(), name='admin-sale-event-detail'),
    path('sale-events/<int:pk>/toggle/', AdminSaleEventToggleView.as_view(), name='admin-sale-event-toggle'),
    path('sale-events/<int:pk>/duplicate/', AdminSaleEventDuplicateView.as_view(), name='admin-sale-event-duplicate'),
    path('sale-events/<int:pk>/extend/', AdminSaleEventExtendView.as_view(), name='admin-sale-event-extend'),
    path('sale-events/<int:pk>/end-now/', AdminSaleEventEndNowView.as_view(), name='admin-sale-event-end-now'),
    path('sale-events/<int:pk>/report/', AdminSaleEventReportView.as_view(), name='admin-sale-event-report'),

    # 6. Settings
    path('settings/', AdminSettingsView.as_view(), name='admin-settings'),

    # 7. Customers
    path('customers/', AdminCustomerListView.as_view(), name='admin-customers'),
    path('customers/<int:pk>/orders/', AdminCustomerOrdersView.as_view(), name='admin-customer-orders'),
    path('customers/<int:pk>/toggle-status/', AdminCustomerToggleStatusView.as_view(), name='admin-customer-toggle'),

    # 8. Reviews
    path('reviews/', AdminReviewListView.as_view(), name='admin-reviews'),
    path('reviews/<int:pk>/', AdminReviewDeleteView.as_view(), name='admin-review-delete'),
    path('reviews/<int:pk>/moderate/', AdminReviewModerateView.as_view(), name='admin-review-moderate'),

    # 9. Messages & Waitlist
    path('messages/', AdminMessageListView.as_view(), name='admin-messages'),
    path('messages/<int:pk>/mark-read/', AdminMessageMarkReadView.as_view(), name='admin-message-read'),
    path('messages/<int:pk>/toggle-handled/', AdminMessageToggleHandledView.as_view(), name='admin-message-toggle-handled'),
    path('messages/<int:pk>/toggle/', AdminMessageToggleHandledView.as_view(), name='admin-message-toggle'),
    path('waitlist/', AdminWaitlistListView.as_view(), name='admin-waitlist'),
    path('waitlist/export-csv/', AdminWaitlistCSVExportView.as_view(), name='admin-waitlist-export-csv'),

    # 10. Security & Audit Logs
    path('security/logs/', AdminSecurityLogsView.as_view(), name='admin-security-logs'),
    path('security/block-ip/', AdminSecurityBlockIPView.as_view(), name='admin-security-block-ip'),
    path('security/unblock-ip/', AdminSecurityUnblockIPView.as_view(), name='admin-security-unblock'),
    path('audit-logs/', AdminAuditLogsView.as_view(), name='admin-audit-logs'),

    # 11. Staff Management
    path('staff/', AdminStaffListView.as_view(), name='admin-staff-list'),
    path('staff/<int:pk>/', AdminStaffDetailView.as_view(), name='admin-staff-detail'),
]
