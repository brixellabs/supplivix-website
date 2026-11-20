import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import Breadcrumbs from '../components/layout/Breadcrumbs';
import SaleCountdownTimer from '../components/common/SaleCountdownTimer';
import ProductIllustration from '../components/ui/ProductIllustration';
import Icon from '../components/ui/Icon';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import QuantityStepper from '../components/ui/QuantityStepper';
import Input from '../components/ui/Input';
import { useCart } from '../context/CartContext';
import { useToast } from '../components/ui/Toast';
import { api, normalizeMediaUrl } from '../services/api';
import SEOHead from '../components/seo/SEOHead';
import NotFoundPage from './NotFoundPage';

const SAMPLE_PRODUCT = {
  id: 1,
  name: 'Supplivix Complete Daily Multivitamin 60s',
  slug: 'supplivix-complete-daily-multivitamin-60s',
  product_type: 'multivitamin',
  category_name: 'Multivitamins',
  category_slug: 'multivitamins',
  price: 2450,
  compare_at_price: 2900,
  inventory_count: 50,
  rating: 4.9,
  reviews_count: 52,
  thumbnail: '/media/products/supplivix-multivitamin.jpg',
  images: [
    { id: 1, image: '/media/products/supplivix-multivitamin.jpg', alt_text: 'Supplivix Complete Daily Multivitamin 60s' },
  ],
  description:
    'A high-potency daily micronutrient formulation engineered for modern adult nutritional demands. Delivers 24 bioavailable vitamins and chelated minerals to support metabolic energy, natural immunity, and daily cellular vitality.',
  description_ur:
    'جدید دور کے بالغ افراد کی غذائی ضروریات کو پورا کرنے کے لیے تیار کردہ اعلیٰ طاقت کا یومیہ مائیکرو نیوٹرینٹ فارمولا۔ اس میں 24 حیاتیاتی طور پر دستیاب وٹامنز اور چیلیٹڈ معدنیات شامل ہیں جو میٹابولک توانائی، قدرتی مدافعت اور روزمرہ کی سیلولر زندگی کو سہارا دیتے ہیں۔',
  serving_size: '1 Tablet Daily with a meal',
  directions: 'Take one (1) tablet daily with food, preferably in the morning with breakfast. Swallow with a full glass of water. Do not exceed the recommended daily dose.',
  directions_ur:
    'روزانہ ایک (1) گولی کھانے کے ساتھ لیں، ترجیحاً صبح کے ناشتے کے ساتھ۔ ایک گلاس پانی کے ساتھ نگل لیں۔ تجویز کردہ یومیہ خوراک سے تجاوز نہ کریں۔',
  ingredients: 'Vitamin A (Retinyl Palmitate), Vitamin C (Ascorbic Acid), Vitamin D3 (Cholecalciferol), Vitamin E (d-Alpha Tocopherol), Thiamin, Riboflavin, Niacin, Vitamin B6, Folate (L-Methylfolate), Vitamin B12 (Methylcobalamin), Biotin, Pantothenic Acid, Calcium, Iron (Ferrous Bisglycinate), Iodine, Magnesium (Magnesium Glycinate), Zinc (Zinc Picolinate), Selenium, Copper, Manganese, Chromium.',
  ingredients_ur:
    'وٹامن اے (ریٹینائل پالمیٹیٹ)، وٹامن سی (ایسکوربک ایسڈ)، وٹامن ڈی۳، وٹامن ای، تھامین، رائبوفلاوین، نیاسین، وٹامن بی۶، فولیٹ (ایل-میتھائل فولیٹ)، وٹامن بی۱۲، بایوٹین، زنک پِکولینیٹ، میگنیشیم گلائسینیٹ، سیلینیم، کاپر، کرومیم۔',
  storage: 'Store in a cool, dry place away from direct sunlight and moisture. Keep bottle tightly closed. Keep out of reach of children.',
};

export default function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { addToCart } = useCart();
  const { showToast } = useToast();

  const isUrduPath = location.pathname.startsWith('/ur/');
  const isUrduQuery = searchParams.get('lang') === 'ur';
  const isUrdu = isUrduPath || isUrduQuery;

  const [product, setProduct] = useState(SAMPLE_PRODUCT);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [notFound, setNotFound] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('overview');
  const [reviews, setReviews] = useState([]);
  const [adding, setAdding] = useState(false);

  const hasUrduContent = Boolean(
    (product?.description_ur && product.description_ur.trim()) ||
    (product?.directions_ur && product.directions_ur.trim()) ||
    (product?.ingredients_ur && product.ingredients_ur.trim())
  );

  const toggleLanguage = () => {
    if (isUrdu) {
      try {
        localStorage.setItem('supplivix_product_lang', 'en');
      } catch (_) {}
      navigate(`/products/${slug}`, { replace: true });
    } else {
      try {
        localStorage.setItem('supplivix_product_lang', 'ur');
      } catch (_) {}
      navigate(`/ur/products/${slug}`, { replace: true });
    }
  };

  useEffect(() => {
    try {
      const savedLang = localStorage.getItem('supplivix_product_lang');
      if (savedLang === 'ur' && !isUrduPath) {
        navigate(`/ur/products/${slug}`, { replace: true });
      }
    } catch (_) {}
  }, [slug, isUrduPath, navigate]);

  // Review Form states
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewBody, setReviewBody] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewErrors, setReviewErrors] = useState({});
  const [shippingThreshold, setShippingThreshold] = useState(2000);

  useEffect(() => {
    let active = true;
    api.getPublicSettings?.()
      .then((res) => {
        if (!active) return;
        const val = Number(res?.free_shipping_threshold || res?.data?.free_shipping_threshold);
        if (val > 0) setShippingThreshold(val);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    setNotFound(false);
    setSelectedImageIndex(0);
    // Attempt to load product from API
    api.getProduct(slug)
      .then((data) => {
        if (data) setProduct(data);
      })
      .catch((err) => {
        if (err && (err.status === 404 || err.code === 'not_found' || String(err).includes('404'))) {
          setNotFound(true);
        } else {
          setProduct((prev) => ({ ...prev, slug }));
        }
      });

    // Load reviews
    api.getProductReviews(slug)
      .then((data) => {
        if (Array.isArray(data)) setReviews(data);
        else if (data && data.results) setReviews(data.results);
      })
      .catch(() => { });
  }, [slug]);

  const originalPrice = product.original_price || product.compare_at_price;
  const isOnSale = Boolean(product.is_on_sale || (originalPrice && originalPrice > product.price));
  const discountPercent =
    originalPrice && originalPrice > product.price
      ? Math.round(((originalPrice - product.price) / originalPrice) * 100)
      : 0;

  const handleAddToCart = async () => {
    setAdding(true);
    const result = await addToCart(product.id, quantity);
    setAdding(false);

    if (result.success) {
      showToast(`Added ${quantity} x "${product.name}" to cart`);
    } else {
      showToast(result.message || 'Could not add to cart', 'error');
    }
  };

  const handleBuyNow = async () => {
    setAdding(true);
    const result = await addToCart(product.id, quantity);
    setAdding(false);

    if (result.success) {
      navigate('/checkout');
    } else {
      showToast(result.message || 'Could not proceed to checkout', 'error');
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setReviewError('');
    const errs = {};
    if (!reviewTitle.trim()) {
      errs.title = 'Please provide a review title.';
    }
    if (!reviewBody.trim()) {
      errs.body = 'Please provide detailed review content.';
    }
    setReviewErrors(errs);
    const errKeys = Object.keys(errs);
    if (errKeys.length > 0) {
      const el = document.querySelector(`[name="${errKeys[0]}"], #${errKeys[0]}`);
      if (el && typeof el.focus === 'function') el.focus();
      return;
    }

    setSubmittingReview(true);
    try {
      await api.createReview(product.slug, {
        rating: reviewRating,
        title: reviewTitle,
        content: reviewBody,
      });
      showToast('Thank you! Your verified review has been submitted.');
      setReviewTitle('');
      setReviewBody('');
      // Reload reviews
      const updated = await api.getProductReviews(product.slug);
      if (Array.isArray(updated)) setReviews(updated);
    } catch (err) {
      setReviewError(
        err.message || 'Only verified buyers who completed an order can submit a review.'
      );
    } finally {
      setSubmittingReview(false);
    }
  };

  const breadcrumbs = [
    { label: 'Shop', href: '/shop' },
    { label: product.category_name || 'Catalog', href: `/shop?category=${product.category_slug || ''}` },
    { label: product.name },
  ];

  // AEO visible FAQs
  const productFaqs =
    product.faqs && product.faqs.length > 0
      ? product.faqs
      : [
        {
          question: 'How many multivitamin tablets should I take daily?',
          answer: 'Follow the label directions. Typical products list one tablet per day, preferably with breakfast and a glass of water.',
        },
        {
          question: 'Who is this multivitamin formula designed for?',
          answer: 'This daily formulation is designed for adults seeking to support their dietary micronutrient intake alongside a balanced diet.',
        },
        {
          question: 'Does this multivitamin contain synthetic colorants or preservatives?',
          answer: 'No. Supplivix formulations avoid unnecessary artificial fillers and colorants, prioritizing bioavailable forms of essential nutrients.',
        },
        {
          question: 'What is the payment and delivery procedure in Pakistan?',
          answer: 'We deliver nationwide across Pakistan via standard Cash on Delivery (COD). You inspect the package and pay the courier rider in cash upon arrival.',
        },
      ];

  const availableStock =
    product.stock !== undefined
      ? product.stock
      : product.inventory_count !== undefined
      ? product.inventory_count
      : product.in_stock !== undefined
      ? (product.in_stock ? 10 : 0)
      : 0;

  const isOutOfStock = availableStock <= 0;

  // Schema.org structured data for SEO & AEO (Phase 6)
  const productSchema = {
    '@type': 'Product',
    name: product.name,
    sku: product.sku || 'SPLV-MV-01',
    description: product.description,
    brand: { '@type': 'Brand', name: 'Supplivix' },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'PKR',
      price: product.price,
      priceValidUntil: '2027-12-31',
      availability:
        !isOutOfStock
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      url: `https://supplivix.com/products/${product.slug}/`,
      seller: { '@type': 'Organization', name: 'Supplivix' },
    },
  };

  // Only real approved reviews feed aggregateRating
  const approvedReviews = (reviews || []).filter((r) => r.is_approved);
  if (approvedReviews.length > 0) {
    const avg =
      Math.round(
        (approvedReviews.reduce((sum, r) => sum + r.rating, 0) / approvedReviews.length) * 10
      ) / 10;
    productSchema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: avg,
      reviewCount: approvedReviews.length,
      bestRating: 5,
      worstRating: 1,
    };
    productSchema.review = approvedReviews.slice(0, 5).map((r) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: r.user?.full_name || 'Verified Buyer' },
      datePublished: r.created_at ? new Date(r.created_at).toISOString().split('T')[0] : '2026-11-01',
      reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5 },
      name: r.title,
      reviewBody: r.body || r.content,
    }));
  }

  const breadcrumbsSchema = {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://supplivix.com/' },
      {
        '@type': 'ListItem',
        position: 2,
        name: product.category_name || 'Catalog',
        item: `https://supplivix.com/shop?category=${product.category_slug || ''}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: product.name,
        item: `https://supplivix.com/products/${product.slug}/`,
      },
    ],
  };

  const faqSchema = {
    '@type': 'FAQPage',
    mainEntity: productFaqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  };

  const fullSchema = [productSchema, breadcrumbsSchema, faqSchema];

  if (notFound) {
    return <NotFoundPage />;
  }

  return (
    <div className="bg-white min-h-screen pb-16">
      <SEOHead
        title={isUrdu ? `${product.name} (اردو)` : product.name}
        description={isUrdu && product.description_ur ? product.description_ur.slice(0, 155) : (product.short_description || product.description)}
        canonical={isUrdu ? `/ur/products/${product.slug || slug}` : `/products/${product.slug || slug}`}
        alternateLanguages={[
          { hreflang: 'en', href: `/products/${product.slug || slug}` },
          { hreflang: 'ur', href: `/ur/products/${product.slug || slug}` },
        ]}
        ogType="product"
        schema={fullSchema}
      />
      <Breadcrumbs items={breadcrumbs} />

      <div className="max-w-site mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Column: Product Image / Illustration */}
          <div className="lg:col-span-6">
            <div className="bg-surface-subtle border border-surface-border rounded-lg p-6 sm:p-10 flex flex-col items-center justify-center shadow-card sticky top-24">
              <div className="w-full flex items-center justify-center min-h-[300px]">
                {product.images && product.images.length > 0 ? (
                  <img
                    src={normalizeMediaUrl(product.images[selectedImageIndex]?.image || product.images[0].image)}
                    alt={product.images[selectedImageIndex]?.alt_text || product.name}
                    width="600"
                    height="380"
                    className="w-full max-h-[380px] object-contain transition-all duration-300"
                  />
                ) : (
                  <ProductIllustration
                    type={product.product_type === 'skincare' ? 'serum' : 'bottle'}
                    accentColor={product.product_type === 'multivitamin' ? '#016a38' : '#7a2fd0'}
                    label={product.serving_size ? 'Daily' : 'Supplivix'}
                    size="lg"
                  />
                )}
              </div>
              {product.images && product.images.length > 1 && (
                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-surface-border w-full justify-center">
                  {product.images.map((img, idx) => (
                    <button
                      key={img.id || idx}
                      type="button"
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`w-14 h-14 rounded border p-1 bg-white transition-all ${
                        selectedImageIndex === idx
                          ? 'border-brand-green ring-2 ring-brand-green/30'
                          : 'border-surface-border hover:border-brand-ink/50 opacity-70 hover:opacity-100'
                      }`}
                      aria-label={`View photo ${idx + 1}`}
                    >
                      <img
                        src={normalizeMediaUrl(img.image)}
                        alt={img.alt_text || `${product.name} view ${idx + 1}`}
                        className="w-full h-full object-contain"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Title, Price, Stepper, Actions */}
          <div className="lg:col-span-6 flex flex-col justify-between">
            <div>
              {/* Category & Badge */}
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-xs font-bold text-brand-green uppercase tracking-wider">
                  {product.category_name || 'Supplivix Formulations'}
                </span>
                {product.is_on_sale && product.sale_badge ? (
                  <span className="bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded shadow-sm">
                    {product.sale_badge}
                  </span>
                ) : discountPercent > 0 ? (
                  <Badge variant="sale">Save {discountPercent}%</Badge>
                ) : null}
                {!isOutOfStock ? (
                  <Badge variant="pill">In Stock</Badge>
                ) : (
                  <span className="bg-gray-200 text-gray-700 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-xs">
                    Out of Stock
                  </span>
                )}
              </div>

              {/* Product Title */}
              <h1 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-brand-ink leading-snug mb-3">
                {product.name}
              </h1>

              {/* AEO 40-60 Word Direct Summary: What is it, who is it for, how is it used */}
              <div
                className={`mb-4 p-3 bg-surface-subtle text-xs text-brand-ink leading-relaxed rounded-r-sm ${
                  isUrdu
                    ? 'border-r-4 border-l-0 border-brand-green text-right font-urdu text-sm sm:text-base'
                    : 'border-l-4 border-brand-green'
                }`}
                dir={isUrdu ? 'rtl' : 'ltr'}
              >
                <strong
                  className={`block text-[10px] uppercase tracking-wider text-brand-green mb-1 font-bold ${
                    isUrdu ? 'text-xs text-right font-urdu font-bold' : ''
                  }`}
                >
                  {isUrdu ? 'فارمولیشن کا براہ راست خلاصہ (Formulation Summary):' : 'Direct Formulation Summary:'}
                </strong>
                <span className={isUrdu ? 'urdu-text-block' : ''}>
                  {isUrdu
                    ? (product.summary_ur ||
                        (product.product_type === 'multivitamin'
                          ? `${product.name} بالغ افراد کے لیے تیار کردہ اعلیٰ طاقت کا بائیو اویلیبل ملٹی وٹامن فارمولا ہے جو غذائی کمیوں کو پورا کرتا ہے۔ یہ میٹابولک سیلولر توانائی اور قدرتی مدافعت کو مضبوط بناتا ہے۔ بالغ افراد روزانہ صبح ناشتے کے ساتھ ایک گلاس پانی کے ساتھ ایک گولی لیں۔`
                          : `${product.name} ہر قسم کی جلد کے لیے سائنسی بنیادوں پر تیار کردہ سکن کیئر فارمولا ہے جو جلد کی حفاظتی تہہ (ایپی ڈرمل بیریئر) کو مضبوط بناتا ہے اور قدرتی نمی بحال کرتا ہے۔ روزانہ صبح یا شام صاف جلد پر چند قطرے نرمی سے لگائیں۔`))
                    : (product.product_type === 'multivitamin'
                        ? `${product.name} is a high-potency bioavailable multivitamin formulated for adults to address documented micronutrient gaps. It supports metabolic cellular energy and daily immune resilience. Adults take one tablet daily in the morning with a full glass of water and breakfast alongside a balanced diet.`
                        : `${product.name} is a science-backed topical skincare formulation engineered for all skin types to fortify the epidermal barrier and restore natural skin hydration. Apply a few drops gently to clean skin daily in the morning or evening before heavier moisturizers.`)}
                </span>
              </div>

              {/* Reviews Star Rating */}
              <div className="flex items-center gap-2 mb-4 text-xs">
                <div className="flex items-center text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Icon
                      key={i}
                      name={i < Math.round(product.rating || 5) ? 'star' : 'star-outline'}
                      className="text-xs"
                    />
                  ))}
                </div>
                <span className="font-bold text-brand-ink">{product.rating || 4.9}</span>
                <span className="text-ink-muted">({product.reviews_count || 52} customer reviews)</span>
              </div>

              {/* Pricing Display */}
              <div className="mb-6 p-4 bg-surface-subtle border border-surface-border rounded-md">
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="text-2xl sm:text-3xl font-bold text-brand-ink">
                    Rs. {Number(product.price).toLocaleString()}
                  </span>
                  {originalPrice && originalPrice > product.price && (
                    <span className="text-sm text-ink-muted line-through font-medium">
                      Rs. {Number(originalPrice).toLocaleString()}
                    </span>
                  )}
                  {isOnSale && (
                    <span className="text-xs text-red-600 font-bold bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                      Save Rs. {Number(originalPrice - product.price).toLocaleString()} ({discountPercent}%)
                    </span>
                  )}
                  <span className="text-xs text-brand-green font-semibold ml-auto hidden sm:inline">
                    Cash on Delivery (COD)
                  </span>
                </div>
                {product.is_on_sale && product.show_countdown && product.sale_end_at && (
                  <div className="pt-3 mt-3 border-t border-surface-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <SaleCountdownTimer
                      targetDate={product.sale_end_at}
                      compact
                      badgeText={product.sale_badge || 'Sale Ends In'}
                    />
                    <span className="text-[11px] text-ink-muted">
                      Prices automatically revert when timer expires.
                    </span>
                  </div>
                )}
              </div>

              {/* Description Snippet */}
              {isUrdu && product.description_ur ? (
                <div dir="rtl" lang="ur" className="urdu-text-block text-sm text-brand-ink mb-6 bg-[#faf9f6] p-3 rounded-md border border-surface-border whitespace-pre-line">
                  {product.description_ur}
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-ink-muted leading-relaxed mb-6 whitespace-pre-line">
                  {product.description?.trim() || 'Not specified'}
                </p>
              )}

              {/* Free Shipping Dynamic Progress */}
              <div className="mb-6 p-3 bg-white border border-surface-border rounded-md text-xs">
                <div className="flex items-center gap-2 font-semibold text-brand-ink mb-1">
                  <Icon name="truck" className="text-brand-green" />
                  <span className={isUrdu ? 'font-urdu' : ''}>
                    {isUrdu
                      ? (product.price >= shippingThreshold
                          ? 'یہ آرڈر پورے پاکستان میں مفت ڈیلیوری کا اہل ہے!'
                          : `مفت شپنگ حاصل کرنے کے لیے مزید Rs. ${(shippingThreshold - product.price).toLocaleString()} شامل کریں۔`)
                      : (product.price >= shippingThreshold
                          ? 'This order qualifies for FREE nationwide delivery!'
                          : `Add Rs. ${(shippingThreshold - product.price).toLocaleString()} more to unlock FREE shipping.`)}
                  </span>
                </div>
              </div>

              {/* Quantity Stepper & Buttons */}
              <div className="space-y-4 pt-4 border-t border-surface-border">
                <div className="flex items-center gap-4">
                  <span className={`text-xs font-bold uppercase tracking-wider text-brand-ink ${isUrdu ? 'font-urdu' : ''}`}>
                    {isUrdu ? 'تعداد (Quantity):' : 'Quantity:'}
                  </span>
                  <QuantityStepper
                    value={quantity}
                    onChange={setQuantity}
                    max={product.inventory_count || 10}
                    disabled={product.inventory_count <= 0}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleAddToCart}
                    loading={adding}
                    disabled={isOutOfStock}
                    className="w-full"
                  >
                    <Icon name="cart" className="mr-2" />
                    {isUrdu ? 'کارٹ میں شامل کریں' : 'Add to Cart'}
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={handleBuyNow}
                    disabled={isOutOfStock || adding}
                    className="w-full"
                  >
                    {isUrdu ? 'ابھی خریدیں (COD)' : 'Buy Now (COD)'}
                  </Button>
                </div>
              </div>

              {/* Trust Strip */}
              <div className="mt-8 pt-6 border-t border-surface-border grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5 text-xs sm:text-[11px] text-ink-muted font-semibold">
                <div className="p-3 sm:p-2.5 border border-surface-border rounded-sm bg-surface-subtle flex items-center sm:flex-col sm:justify-center gap-2.5 sm:gap-1.5 text-left sm:text-center min-h-[48px] sm:min-h-[72px]">
                  <Icon name="cod" className="text-brand-green text-base shrink-0" />
                  <span className={`leading-snug ${isUrdu ? 'font-urdu' : ''}`}>
                    {isUrdu ? 'کیش آن ڈیلیوری ادائیگی' : 'Pay Cash on Delivery'}
                  </span>
                </div>
                <div className="p-3 sm:p-2.5 border border-surface-border rounded-sm bg-surface-subtle flex items-center sm:flex-col sm:justify-center gap-2.5 sm:gap-1.5 text-left sm:text-center min-h-[48px] sm:min-h-[72px]">
                  <Icon name="shield" className="text-brand-green text-base shrink-0" />
                  <span className={`leading-snug ${isUrdu ? 'font-urdu' : ''}`}>
                    {isUrdu ? '۱۰۰٪ اصل و مصدقہ فارمولا' : 'Authentic Formula'}
                  </span>
                </div>
                <div className="p-3 sm:p-2.5 border border-surface-border rounded-sm bg-surface-subtle flex items-center sm:flex-col sm:justify-center gap-2.5 sm:gap-1.5 text-left sm:text-center min-h-[48px] sm:min-h-[72px]">
                  <Icon name="truck" className="text-brand-green text-base shrink-0" />
                  <span className={`leading-snug ${isUrdu ? 'font-urdu' : ''}`}>
                    {isUrdu ? 'ملک بھر میں تیز رفتار شپنگ' : 'Fast Nationwide Shipping'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Information Tabs */}
        <div className="mt-16 border-t border-surface-border pt-10">
          <div className="flex border-b border-surface-border gap-6 text-xs font-bold uppercase tracking-wider overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`pb-3 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'overview'
                ? 'border-brand-ink text-brand-ink'
                : 'border-transparent text-ink-muted hover:text-brand-ink'
                }`}
            >
              {isUrdu ? 'جائزہ اور ہدایات (Overview)' : 'Overview & Directions'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('supplement-facts')}
              className={`pb-3 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'supplement-facts'
                ? 'border-brand-ink text-brand-ink'
                : 'border-transparent text-ink-muted hover:text-brand-ink'
                }`}
            >
              {isUrdu ? 'اجزاء اور غذائی حقائق (Facts)' : 'Supplement Facts'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('reviews')}
              className={`pb-3 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'reviews'
                ? 'border-brand-ink text-brand-ink'
                : 'border-transparent text-ink-muted hover:text-brand-ink'
                }`}
            >
              {isUrdu ? `تصدیق شدہ تبصرے (${reviews.length || product.reviews_count || 52})` : `Verified Reviews (${reviews.length || product.reviews_count || 52})`}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('faqs')}
              className={`pb-3 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'faqs'
                ? 'border-brand-ink text-brand-ink'
                : 'border-transparent text-ink-muted hover:text-brand-ink'
                }`}
            >
              {isUrdu ? `عام سوالات (${productFaqs.length})` : `Frequently Asked Questions (${productFaqs.length})`}
            </button>
          </div>

          <div className="py-8">
            {activeTab === 'overview' && (
              <div className="space-y-6 max-w-3xl text-xs sm:text-sm text-ink-muted leading-relaxed">
                <div>
                  <h3 className={`text-sm font-bold uppercase tracking-wide text-brand-ink mb-2 ${isUrdu ? 'text-right font-urdu text-base' : ''}`}>
                    {isUrdu ? 'مصنوعات کی تفصیل (Product Description)' : 'Product Description'}
                  </h3>
                  {isUrdu && product.description_ur ? (
                    <div dir="rtl" lang="ur" className="urdu-text-block text-sm sm:text-base text-brand-ink bg-[#faf9f6] p-4 rounded-md border border-surface-border whitespace-pre-line">
                      {product.description_ur}
                    </div>
                  ) : (
                    <p className="whitespace-pre-line">{product.description?.trim() || 'Not specified'}</p>
                  )}
                </div>
                <div>
                  <h3 className={`text-sm font-bold uppercase tracking-wide text-brand-ink mb-2 ${isUrdu ? 'text-right font-urdu text-base' : ''}`}>
                    {isUrdu ? 'استعمال کی ہدایات (Suggested Daily Use)' : 'Suggested Daily Use'}
                  </h3>
                  {isUrdu && product.directions_ur ? (
                    <div dir="rtl" lang="ur" className="urdu-text-block text-sm sm:text-base text-brand-ink bg-[#faf9f6] p-4 rounded-md border border-surface-border whitespace-pre-line">
                      {product.directions_ur}
                    </div>
                  ) : (
                    <p className="whitespace-pre-line">{product.directions?.trim() || 'Not specified'}</p>
                  )}
                </div>
                <div>
                  <h3 className={`text-sm font-bold uppercase tracking-wide text-brand-ink mb-2 ${isUrdu ? 'text-right font-urdu text-base' : ''}`}>
                    {isUrdu ? 'محفوظ رکھنے کی ہدایات (Storage Guidelines)' : 'Storage Guidelines'}
                  </h3>
                  {isUrdu ? (
                    <p dir="rtl" lang="ur" className="urdu-text-block text-sm text-brand-ink bg-[#faf9f6] p-3 rounded-md border border-surface-border">
                      {product.storage_ur || 'براہ راست دھوپ اور نمی سے دور کسی ٹھنڈی اور خشک جگہ پر رکھیں۔ بوتل کو مضبوطی سے بند رکھیں۔ بچوں کی پہنچ سے دور رکھیں۔'}
                    </p>
                  ) : (
                    <p>{product.storage?.trim() || 'Not specified'}</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'supplement-facts' && (
              <div className="max-w-2xl bg-surface-subtle border border-surface-border rounded-lg p-6 shadow-card">
                <h3 className={`text-base font-bold uppercase tracking-wide text-brand-ink border-b-2 border-brand-ink pb-2 mb-3 ${isUrdu ? 'text-right font-urdu' : ''}`}>
                  {isUrdu ? 'اجزاء اور غذائی حقائق (Supplement Facts)' : 'Supplement Facts'}
                </h3>
                <div className={`text-xs text-ink-muted mb-4 ${isUrdu ? 'text-right font-urdu' : ''}`}>
                  {isUrdu ? `خوراک کا طریقہ: ${product.serving_size_ur || product.serving_size || 'روزانہ ۱ خوراک'}` : `Serving Size: ${product.serving_size?.trim() || 'Not specified'}`}
                </div>
                <div className="text-xs text-ink-muted leading-relaxed border-t border-surface-border pt-3">
                  <span className={`font-bold text-brand-ink block mb-2 ${isUrdu ? 'text-right font-urdu text-sm' : ''}`}>
                    {isUrdu ? 'فعال غذائی اجزاء (Active Ingredients):' : 'Active Nutritional Matrix:'}
                  </span>
                  {isUrdu && product.ingredients_ur ? (
                    <div dir="rtl" lang="ur" className="urdu-text-block text-sm sm:text-base text-brand-ink bg-white p-4 rounded border border-surface-border whitespace-pre-line">
                      {product.ingredients_ur}
                    </div>
                  ) : (
                    <p className="whitespace-pre-line">{product.ingredients?.trim() || 'Not specified'}</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                {/* Review Form */}
                <div className="md:col-span-5 bg-surface-subtle border border-surface-border rounded-lg p-6 shadow-card self-start">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-brand-ink mb-2">
                    Write a Verified Review
                  </h3>
                  <p className="text-xs text-ink-muted mb-4">
                    Only verified buyers who completed an order can submit ratings.
                  </p>
                  <form onSubmit={handleReviewSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-brand-ink mb-1">
                        Rating (1 to 5 Stars)
                      </label>
                      <select
                        value={reviewRating}
                        onChange={(e) => setReviewRating(Number(e.target.value))}
                        className="w-full bg-white border border-surface-border rounded-sm p-2 text-xs"
                      >
                        <option value={5}>5 Stars - Excellent</option>
                        <option value={4}>4 Stars - Very Good</option>
                        <option value={3}>3 Stars - Average</option>
                        <option value={2}>2 Stars - Below Expectation</option>
                        <option value={1}>1 Star - Poor</option>
                      </select>
                    </div>

                    <Input
                      label="Review Title"
                      name="title"
                      value={reviewTitle}
                      onChange={(e) => {
                        setReviewTitle(e.target.value);
                        if (reviewErrors.title) setReviewErrors(prev => ({ ...prev, title: '' }));
                      }}
                      placeholder="e.g. Noticeable energy boost within a week"
                      required
                      error={reviewErrors.title}
                    />

                    <div>
                      <label className="block text-xs font-semibold text-brand-ink mb-1">
                        Detailed Review
                      </label>
                      <textarea
                        name="body"
                        id="body"
                        value={reviewBody}
                        onChange={(e) => {
                          setReviewBody(e.target.value);
                          if (reviewErrors.body) setReviewErrors(prev => ({ ...prev, body: '' }));
                        }}
                        rows={3}
                        aria-invalid={reviewErrors.body ? 'true' : 'false'}
                        aria-describedby={reviewErrors.body ? 'body-error' : undefined}
                        className={`w-full bg-white border rounded-sm p-2 text-xs text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-green ${
                          reviewErrors.body ? 'border-status-error focus:ring-status-error' : 'border-surface-border'
                        }`}
                        placeholder="Share your personal experience with dosage and results..."
                        required
                      />
                      {reviewErrors.body && (
                        <p id="body-error" className="text-xs font-medium text-status-error mt-1" role="alert">
                          {reviewErrors.body}
                        </p>
                      )}
                    </div>

                    {reviewError && (
                      <p className="text-xs text-red-600 font-semibold">{reviewError}</p>
                    )}

                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      loading={submittingReview}
                      className="w-full"
                    >
                      Submit Review
                    </Button>
                  </form>
                </div>

                {/* Review Feed */}
                <div className="md:col-span-7 space-y-4">
                  {reviews.length === 0 ? (
                    <div className="bg-surface-subtle border border-surface-border rounded-md p-6 text-center text-xs text-ink-muted">
                      No customer reviews yet. Be the first verified customer to share feedback!
                    </div>
                  ) : (
                    reviews.map((rev) => (
                      <div key={rev.id} className="border border-surface-border rounded-md p-4 bg-white shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1 text-amber-500 text-xs">
                            {[...Array(5)].map((_, i) => (
                              <Icon
                                key={i}
                                name={i < rev.rating ? 'star' : 'star-outline'}
                                className="text-[11px]"
                              />
                            ))}
                          </div>
                          <span className="text-[11px] text-ink-muted">
                            {new Date(rev.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-brand-ink mb-1">{rev.title}</h4>
                        <p className="text-xs text-ink-muted leading-relaxed mb-2">{rev.content}</p>
                        <div className="text-[10px] font-semibold text-brand-green flex items-center gap-1">
                          <Icon name="check" />
                          <span>Verified Buyer</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'faqs' && (
              <div className="max-w-3xl space-y-4">
                <div className="mb-4">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-brand-ink mb-1">
                    Formulation Questions &amp; Answers
                  </h3>
                  <p className="text-xs text-ink-muted">
                    Factual guidance feeding search engines and personal assistants. No unsubstantiated medical claims.
                  </p>
                </div>
                <div className="space-y-3">
                  {productFaqs.map((faq, idx) => (
                    <div
                      key={idx}
                      className="border border-surface-border rounded-md p-4 bg-white shadow-sm"
                    >
                      <h4 className="text-xs font-bold text-brand-ink mb-1.5 flex items-center gap-2">
                        <Icon name="info" className="text-brand-green text-xs" />
                        <span>{faq.question}</span>
                      </h4>
                      <p className="text-xs text-ink-muted leading-relaxed pl-5">
                        {faq.answer}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Mandatory Health Disclaimer on every supplement page (Rule 5) */}
          <div className="mt-8 p-4 bg-surface-subtle border border-surface-border rounded-md text-xs text-ink-muted leading-relaxed">
            <span className="font-bold text-brand-ink block mb-1">Regulatory Health Disclaimer:</span>
            These statements have not been evaluated by a regulator. This product is not intended to diagnose, treat, cure or prevent any disease. Always consult your healthcare professional before use.
          </div>
        </div>
      </div>

      {/* Sticky Bottom Bar on Mobile (360px) for Easy COD Purchase */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-surface-border p-3 z-30 shadow-hover flex items-center justify-between gap-3">
        <div>
          <span className="text-[11px] text-ink-muted block">Cash on Delivery</span>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-bold text-brand-ink">Rs. {Number(product.price).toLocaleString()}</span>
            {originalPrice && originalPrice > product.price && (
              <span className="text-xs text-ink-muted line-through">Rs. {Number(originalPrice).toLocaleString()}</span>
            )}
          </div>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={handleAddToCart}
          disabled={product.inventory_count <= 0}
          className="h-[38px] px-5"
        >
          <Icon name="cart" className="mr-1.5" />
          Add to Cart
        </Button>
      </div>

      {/* Floating Nutrifactor-Style Language Switcher Pill (Fixed Bottom Left) */}
      <div className="fixed bottom-16 lg:bottom-6 left-4 lg:left-6 z-40">
        <button
          type="button"
          onClick={toggleLanguage}
          className="bg-[#1f2937] hover:bg-black text-white px-5 py-3 rounded-full shadow-hover flex items-center gap-2.5 text-xs sm:text-sm font-semibold transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-green border border-gray-700 cursor-pointer"
          aria-label={isUrdu ? 'Read in English' : 'اردو میں پڑھیں (Read in Urdu)'}
          title={isUrdu ? 'Switch to English' : 'اردو میں تفصیل پڑھیں'}
        >
          <Icon name="language" className="text-sm sm:text-base text-brand-green" />
          <span className={isUrdu ? 'font-sans font-medium' : 'font-urdu tracking-wide text-xs sm:text-sm'}>
            {isUrdu ? 'Read in English' : 'اردو میں پڑھیں'}
          </span>
        </button>
      </div>
    </div>
  );
}
