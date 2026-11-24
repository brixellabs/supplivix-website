import React, { useState, useEffect, useCallback, useRef } from 'react';
import Icon from '../../components/ui/Icon';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { api } from '../../services/api';
import heroSlide1 from '../../assets/brand/hero-slide-1.jpg';
import heroSlide2 from '../../assets/brand/hero-slide-2.jpg';
import heroSlide3 from '../../assets/brand/hero-slide-3.jpg';
import heroSlide4 from '../../assets/brand/hero-slide-4.jpg';
import heroSlide5 from '../../assets/brand/hero-slide-5.jpg';
import heroSlide6 from '../../assets/brand/hero-slide-6.jpg';
import heroSlide7 from '../../assets/brand/hero-slide-7.jpg';

const BUNDLED_HERO_MAP = {
  1: heroSlide1,
  2: heroSlide2,
  3: heroSlide3,
  4: heroSlide4,
  5: heroSlide5,
  6: heroSlide6,
  7: heroSlide7,
};

const DEFAULT_FORM_DATA = {
  title: '',
  subtitle: '',
  link: '/shop',
  button_text: 'Shop Now',
  sort_order: 1,
  is_active: true,
  image_url_path: '',
};

export default function AdminHeroBannersTab() {
  const { showToast } = useToast();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [slides, setSlides] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'inactive'

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState(null);
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [slideToDelete, setSlideToDelete] = useState(null);

  // Fetch all hero banners
  const loadSlides = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAdminHeroSlides();
      const list = res?.results || (Array.isArray(res) ? res : []);
      setSlides(list);
    } catch (err) {
      showToast(err?.message || 'Failed to load hero banner slides.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadSlides();
  }, [loadSlides]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingSlide(null);
    setImageFile(null);
    setImagePreview('');
    setFormData({
      ...DEFAULT_FORM_DATA,
      sort_order: slides.length + 1,
    });
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (slide) => {
    setEditingSlide(slide);
    setImageFile(null);
    const defaultImg = BUNDLED_HERO_MAP[slide.sort_order] || heroSlide1;
    const rawImg = slide.image || slide.image_url_path || '';
    const isDefault = !rawImg || rawImg.includes('hero-slide-') || rawImg.includes('hero-banner');
    setImagePreview(isDefault ? defaultImg : (rawImg || defaultImg));
    setFormData({
      title: slide.title || '',
      subtitle: slide.subtitle || '',
      link: slide.link || '/shop',
      button_text: slide.button_text || 'Shop Now',
      sort_order: slide.sort_order ?? 0,
      is_active: slide.is_active !== false,
      image_url_path: slide.image_url_path || '',
    });
    setModalOpen(true);
  };

  // Handle Image File Pick
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, WebP).', 'error');
      return;
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      showToast('Banner file size exceeds 10MB limit.', 'error');
      return;
    }

    setImageFile(file);
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
  };

  // Handle Form Submit (Create or Edit)
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      showToast('Banner title is required.', 'error');
      return;
    }

    if (!editingSlide && !imageFile && !formData.image_url_path.trim()) {
      showToast('Please select a banner image to upload.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const data = new FormData();
      data.append('title', formData.title.trim());
      data.append('subtitle', formData.subtitle.trim());
      data.append('link', formData.link.trim() || '/shop');
      data.append('button_text', formData.button_text.trim() || 'Shop Now');
      data.append('sort_order', String(Number(formData.sort_order) || 0));
      data.append('is_active', String(Boolean(formData.is_active)));
      if (formData.image_url_path.trim()) {
        data.append('image_url_path', formData.image_url_path.trim());
      }
      if (imageFile) {
        data.append('image', imageFile);
      }

      if (editingSlide) {
        await api.updateAdminHeroSlide(editingSlide.id, data);
        showToast('Hero banner updated successfully.', 'success');
      } else {
        await api.createAdminHeroSlide(data);
        showToast('Hero banner created successfully.', 'success');
      }

      setModalOpen(false);
      loadSlides();
    } catch (err) {
      showToast(err?.message || 'Failed to save hero banner.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Toggle Active Status
  const handleToggleActive = async (slide) => {
    try {
      await api.updateAdminHeroSlide(slide.id, {
        is_active: !slide.is_active,
      });
      showToast(
        `Banner "${slide.title}" ${!slide.is_active ? 'activated' : 'deactivated'}.`,
        'success'
      );
      loadSlides();
    } catch (err) {
      showToast(err?.message || 'Failed to update banner status.', 'error');
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!slideToDelete) return;
    setSubmitting(true);
    try {
      await api.deleteAdminHeroSlide(slideToDelete.id);
      showToast(`Banner "${slideToDelete.title}" deleted successfully.`, 'success');
      setDeleteModalOpen(false);
      setSlideToDelete(null);
      loadSlides();
    } catch (err) {
      showToast(err?.message || 'Failed to delete banner.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtering
  const filteredSlides = slides.filter((slide) => {
    const q = search.toLowerCase().trim();
    const matchSearch =
      !q ||
      (slide.title && slide.title.toLowerCase().includes(q)) ||
      (slide.subtitle && slide.subtitle.toLowerCase().includes(q)) ||
      (slide.link && slide.link.toLowerCase().includes(q));

    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && slide.is_active) ||
      (statusFilter === 'inactive' && !slide.is_active);

    return matchSearch && matchStatus;
  });

  const totalCount = slides.length;
  const activeCount = slides.filter((s) => s.is_active).length;
  const inactiveCount = totalCount - activeCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-brand-ink">
            Hero Banners Management
          </h2>
          <p className="text-sm text-ink-muted mt-1">
            Manage the carousel banner images displayed at the top of the homepage hero slider. Upload high-res images, update URLs, and change slide display sequence.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleOpenCreate}
          className="flex items-center gap-2 self-start sm:self-auto"
        >
          <Icon name="plus" />
          <span>Add New Banner</span>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-surface-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Total Banners
            </span>
            <div className="w-8 h-8 rounded-lg bg-surface-subtle flex items-center justify-center text-brand-ink">
              <Icon name="image" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-brand-ink mt-2">
            {totalCount}
          </div>
          <div className="text-xs text-ink-muted mt-0.5">Configured in slider</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-surface-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-green">
              Active Slides
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-brand-green flex items-center justify-center">
              <Icon name="check" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-brand-green mt-2">
            {activeCount}
          </div>
          <div className="text-xs text-ink-muted mt-0.5">Live on homepage</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-surface-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Inactive / Draft
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Icon name="eye-slash" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-ink-muted mt-2">
            {inactiveCount}
          </div>
          <div className="text-xs text-ink-muted mt-0.5">Hidden from store</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-surface-border flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div className="flex-1 relative">
          <Icon
            name="search"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search banners by title, subtitle, or link..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-surface-border rounded-lg text-sm focus:outline-none focus:border-brand-green"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-ink-muted whitespace-nowrap">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-surface-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-green bg-white cursor-pointer"
          >
            <option value="all">All Slides</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Banner Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-ink-muted bg-white rounded-xl border border-surface-border">
          <Icon name="spinner" spin className="text-2xl mb-2 text-brand-green" />
          <p>Loading hero banners...</p>
        </div>
      ) : filteredSlides.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-surface-border">
          <div className="w-12 h-12 mx-auto rounded-full bg-surface-subtle flex items-center justify-center text-ink-muted mb-3">
            <Icon name="image" className="text-xl" />
          </div>
          <h3 className="text-base font-semibold text-brand-ink">No banner slides found</h3>
          <p className="text-sm text-ink-muted mt-1 max-w-md mx-auto">
            {search || statusFilter !== 'all'
              ? 'Try adjusting your search query or filter options.'
              : 'Get started by creating your first promotional hero banner slide.'}
          </p>
          {!search && statusFilter === 'all' && (
            <Button variant="primary" onClick={handleOpenCreate} className="mt-4">
              + Add First Banner
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSlides.map((slide) => {
            const defaultImg = BUNDLED_HERO_MAP[slide.sort_order] || heroSlide1;
            const rawImg = slide.image || slide.image_url_path || '';
            const isDefault = !rawImg || rawImg.includes('hero-slide-') || rawImg.includes('hero-banner');
            const imgSrc = isDefault ? defaultImg : rawImg;
            return (
              <div
                key={slide.id}
                className="bg-white rounded-xl border border-surface-border overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col"
              >
                {/* 16:9 Banner Image Preview */}
                <div className="relative aspect-[16/9] bg-surface-subtle overflow-hidden group">
                  <img
                    src={imgSrc}
                    alt={slide.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = defaultImg;
                    }}
                  />
                  {/* Top Badges */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 bg-black/75 text-white text-xs font-bold rounded-md tracking-wider">
                      Slide #{slide.sort_order}
                    </span>
                    <Badge variant={slide.is_active ? 'success' : 'default'} size="sm">
                      {slide.is_active ? 'Active' : 'Draft / Off'}
                    </Badge>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-base text-brand-ink line-clamp-1">
                      {slide.title}
                    </h3>
                    {slide.subtitle && (
                      <p className="text-xs text-ink-muted mt-0.5 line-clamp-1">
                        {slide.subtitle}
                      </p>
                    )}

                    <div className="mt-3 flex items-center gap-1.5 text-xs text-ink-muted">
                      <Icon name="tag" className="text-brand-green text-xs" />
                      <span className="font-medium text-brand-ink">Link:</span>
                      <span className="truncate max-w-[200px] text-ink-muted font-mono text-[11px] bg-surface-subtle px-1.5 py-0.5 rounded">
                        {slide.link}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-surface-border flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(slide)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-md border transition-colors ${
                        slide.is_active
                          ? 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                          : 'border-slate-200 text-slate-600 bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      {slide.is_active ? 'Disable' : 'Enable'}
                    </button>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenEdit(slide)}
                        className="flex items-center gap-1 text-xs px-2.5 py-1"
                      >
                        <Icon name="sliders" className="text-xs" />
                        <span>Edit</span>
                      </Button>
                      <button
                        type="button"
                        onClick={() => {
                          setSlideToDelete(slide);
                          setDeleteModalOpen(true);
                        }}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors"
                        aria-label="Delete banner"
                      >
                        <Icon name="trash" className="text-sm" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Banner Modal */}
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingSlide ? 'Edit Hero Banner' : 'Add New Hero Banner'}
          maxWidth="max-w-2xl"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Live Image Preview */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-1.5">
                Banner Graphic Preview (16:9 Recommended)
              </label>
              <div className="relative aspect-[16/9] w-full rounded-lg bg-surface-subtle border-2 border-dashed border-surface-border overflow-hidden flex items-center justify-center">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/media/hero-banner.jpg';
                    }}
                  />
                ) : (
                  <div className="text-center p-6 text-ink-muted">
                    <Icon name="image" className="text-3xl mb-2 text-ink-muted" />
                    <p className="text-sm font-medium">No banner image selected</p>
                    <p className="text-xs mt-1">Recommended size: 1376 x 768 pixels (16:9)</p>
                  </div>
                )}
              </div>

              {/* Upload Controls */}
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5"
                >
                  <Icon name="upload" />
                  <span>{imagePreview ? 'Replace Image' : 'Select Banner Image'}</span>
                </Button>
                {imageFile && (
                  <span className="text-xs text-brand-green font-medium truncate max-w-xs">
                    Selected: {imageFile.name} ({(imageFile.size / 1024).toFixed(1)} KB)
                  </span>
                )}
              </div>
            </div>

            {/* Title & Subtitle */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-brand-ink mb-1">
                  Banner Title *
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Supplivix Summer Glow-on"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-brand-ink mb-1">
                  Subtitle (Optional)
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Gluta-Glow Radiant Skin Formulation"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                />
              </div>
            </div>

            {/* Link & Button Text */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-brand-ink mb-1">
                  Destination URL *
                </label>
                <Input
                  type="text"
                  placeholder="e.g. /shop?category=skincare or /multivitamins"
                  value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-brand-ink mb-1">
                  Button / CTA Text
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Shop Now"
                  value={formData.button_text}
                  onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
                />
              </div>
            </div>

            {/* Sort Order & Static Fallback URL */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-brand-ink mb-1">
                  Display Order (#)
                </label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
                />
                <span className="text-[11px] text-ink-muted">Slides appear in ascending order (1, 2, 3...)</span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-brand-ink mb-1">
                  Static Path (Optional Fallback)
                </label>
                <Input
                  type="text"
                  placeholder="e.g. /media/banners/hero-slide-1.jpg"
                  value={formData.image_url_path}
                  onChange={(e) => setFormData({ ...formData, image_url_path: e.target.value })}
                />
              </div>
            </div>

            {/* Active Toggle */}
            <div className="pt-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-brand-green border-surface-border rounded focus:ring-brand-green"
                />
                <div>
                  <span className="text-sm font-semibold text-brand-ink">
                    Active (Show in Homepage Hero Carousel)
                  </span>
                  <p className="text-xs text-ink-muted">
                    If unchecked, this banner slide will remain saved as a draft and hidden from visitors.
                  </p>
                </div>
              </label>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-surface-border flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={submitting}>
                {editingSlide ? 'Save Changes' : 'Create Banner'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && slideToDelete && (
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title="Delete Hero Banner"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <p className="text-sm text-ink-muted">
              Are you sure you want to permanently delete the banner{' '}
              <strong className="text-brand-ink">"{slideToDelete.title}"</strong> (Slide #{slideToDelete.sort_order})?
            </p>
            <p className="text-xs text-ink-muted">
              This action cannot be undone. The banner will be immediately removed from the homepage carousel.
            </p>

            <div className="pt-4 border-t border-surface-border flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setDeleteModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmDelete}
                loading={submitting}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                Delete Banner
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

