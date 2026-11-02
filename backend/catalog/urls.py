from django.urls import path

from .views import (
    CategoryListView,
    CreateReviewView,
    ProductDetailView,
    ProductListView,
    ProductReviewsListView,
)

urlpatterns = [
    path('categories/', CategoryListView.as_view(), name='category-list'),
    path('products/', ProductListView.as_view(), name='product-list'),
    path('products/<slug:slug>/', ProductDetailView.as_view(), name='product-detail'),
    path('products/<slug:slug>/reviews/', ProductReviewsListView.as_view(), name='product-reviews-list'),
    path('products/<slug:slug>/reviews/create/', CreateReviewView.as_view(), name='product-reviews-create'),
    path('reviews/', CreateReviewView.as_view(), name='review-create-direct'),
]
