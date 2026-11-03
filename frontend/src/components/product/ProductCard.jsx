import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../ui/Icon';
import Badge from '../ui/Badge';
import ProductIllustration from '../ui/ProductIllustration';
import { useCart } from '../../context/CartContext';
import { useToast } from '../ui/Toast';

export default function ProductCard({ product }) {
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const [adding, setAdding] = useState(false);

  if (!product) return null;

  const discountPercent =
    product.compare_at_price && product.compare_at_price > product.price
      ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
      : 0;

  const stockCount =
    product.stock !== undefined
      ? product.stock
      : product.inventory_count !== undefined
      ? product.inventory_count
      : product.in_stock !== undefined
      ? (product.in_stock ? 10 : 0)
      : 0;
  const isOutOfStock = stockCount <= 0;

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock || adding) return;

    setAdding(true);
    const result = await addToCart(product.id, 1);
    setAdding(false);

    if (result.success) {
      showToast(`Added "${product.name}" to cart`);
    } else {
      showToast(result.message || 'Could not add to cart', 'error');
    }
  };

  const illustrationType =
    product.product_type === 'skincare'
      ? (product.slug?.includes('serum') ? 'serum' : product.slug?.includes('cream') ? 'jar' : 'tube')
      : 'bottle';

  return (
    <div className="group bg-surface-card border border-surface-border rounded-md shadow-card hover:shadow-hover transition-all duration-200 flex flex-col justify-between overflow-hidden relative">
      {/* Top Badges */}
      <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1 items-start">
        {discountPercent > 0 && (
          <Badge variant="sale">-{discountPercent}%</Badge>
        )}
        {product.is_featured && (
          <Badge variant="pill">Top Rated</Badge>
        )}
        {product.product_type === 'multivitamin' && (
          <span className="bg-brand-lavender text-brand-purple text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-xs border border-brand-lime">
            Daily Vitamin
          </span>
        )}
      </div>

      {/* Out of Stock Ribbon */}
      {isOutOfStock && (
        <div className="absolute top-2.5 right-2.5 z-10">
          <span className="bg-gray-700 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-xs">
            Out of Stock
          </span>
        </div>
      )}

      {/* Visual / Image Area */}
      <Link
        to={`/products/${product.slug}`}
        className="block bg-surface-subtle p-6 flex items-center justify-center relative overflow-hidden border-b border-surface-border group-hover:bg-surface-accent transition-colors"
        aria-label={`View details for ${product.name}`}
      >
        {product.thumbnail ? (
          <img
            src={product.thumbnail}
            alt={product.name}
            width="300"
            height="176"
            className="w-full h-44 object-contain transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="h-44 w-full flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
            <ProductIllustration
              type={illustrationType}
              accentColor={product.product_type === 'multivitamin' ? '#016a38' : '#7a2fd0'}
              label={product.serving_size || 'Supplivix'}
              size="md"
            />
          </div>
        )}
      </Link>

      {/* Details Area */}
      <div className="p-4 flex flex-col flex-1 justify-between">
        <div>
          {/* Category Name */}
          <div className="text-[11px] font-semibold text-brand-green uppercase tracking-wider mb-1">
            {product.category_name || (product.product_type === 'multivitamin' ? 'Multivitamins' : 'Skin Care')}
          </div>

          {/* Product Name */}
          <h3 className="text-sm font-bold text-brand-ink hover:text-brand-green transition-colors line-clamp-2 leading-snug mb-2">
            <Link to={`/products/${product.slug}`}>
              {product.name}
            </Link>
          </h3>

          {/* Ratings & Reviews */}
          <div className="flex items-center gap-1.5 mb-3" aria-label={`Rated ${product.rating || 5} out of 5 stars`}>
            <div className="flex items-center text-amber-500 text-xs">
              {[...Array(5)].map((_, i) => (
                <Icon
                  key={i}
                  name={i < Math.round(product.rating || 5) ? 'star' : 'star-outline'}
                  className="text-[11px]"
                />
              ))}
            </div>
            <span className="text-[11px] font-medium text-ink-muted">
              ({product.reviews_count || 12})
            </span>
          </div>
        </div>

        {/* Pricing & Add To Cart Button */}
        <div className="pt-3 border-t border-surface-border flex items-center justify-between gap-2 mt-auto">
          <div>
            <div className="text-base font-bold text-brand-ink">
              Rs. {Number(product.price).toLocaleString()}
            </div>
            {product.compare_at_price && product.compare_at_price > product.price && (
              <div className="text-[11px] text-ink-muted line-through">
                Rs. {Number(product.compare_at_price).toLocaleString()}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isOutOfStock || adding}
            aria-label={`Add ${product.name} to cart`}
            className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-sm text-xs font-bold uppercase tracking-wider transition-colors shadow-solid-sm ${
              isOutOfStock
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-brand-ink text-white hover:bg-brand-green active:scale-95'
            }`}
          >
            {adding ? (
              <Icon name="spinner" spin className="text-xs" />
            ) : (
              <>
                <Icon name="cart" className="text-xs" />
                <span className="hidden sm:inline">Add</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
