import React, { useState, useEffect, useCallback } from 'react';
import Icon from '../../components/ui/Icon';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { api } from '../../services/api';

const DEFAULT_FORM_DATA = {
  title: '',
  badge: 'Special Bundle',
  description: '',
  price: '',
  original_price: '',
  highlight: '',
  button_text: 'Shop Offer',
  link: '/shop',
  sort_order: 0,
  is_active: true,
};

export default function AdminBundlesTab() {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bundles, setBundles] = useState([]);
  const [kpis, setKpis] = useState({ total: 0, active: 0, inactive: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'inactive'

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBundle, setEditingBundle] = useState(null);
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [bundleToDelete, setBundleToDelete] = useState(null);

  // Fetch bundles
  const loadBundles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAdminOffers();
      const list = res?.results || (Array.isArray(res) ? res : []);
      setBundles(list);
      const total = res?.count ?? list.length;
      const active = res?.active_count ?? list.filter((b) => b.is_active).length;
      setKpis({
        total,
        active,
        inactive: total - active,
      });
    } catch (err) {
      showToast(err?.message || 'Failed to load promotional bundles.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadBundles();
  }, [loadBundles]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingBundle(null);
    setFormData({
      ...DEFAULT_FORM_DATA,
      sort_order: bundles.length + 1,
    });
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (bundle) => {
    setEditingBundle(bundle);
    setFormData({
      title: bundle.title || '',
      badge: bundle.badge || 'Special Bundle',
      description: bundle.description || '',
      price: bundle.price !== null && bundle.price !== undefined ? String(bundle.price) : '',
      original_price: bundle.original_price ? String(bundle.original_price) : '',
      highlight: bundle.highlight || '',
      button_text: bundle.button_text || 'Shop Offer',
      link: bundle.link || '/shop',
      sort_order: bundle.sort_order ?? 0,
      is_active: bundle.is_active !== false,
    });
    setModalOpen(true);
  };

  // Handle Form Submit (Create or Update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showToast('Bundle title is required.', 'error');
      return;
    }

    const priceNum = formData.price !== '' ? Number(formData.price) : null;
    const origPriceNum = formData.original_price !== '' ? Number(formData.original_price) : null;

    if (priceNum === null && !formData.highlight.trim()) {
      showToast('Please provide either an Offer Price or a Highlight perk (e.g. Free Nationwide Delivery).', 'error');
      return;
    }

    const payload = {
      title: formData.title.trim(),
      badge: formData.badge.trim(),
      description: formData.description.trim(),
      price: priceNum ?? 0,
      original_price: origPriceNum,
      highlight: formData.highlight.trim(),
      button_text: formData.button_text.trim() || 'Shop Offer',
      link: formData.link.trim() || '/shop',
      sort_order: Number(formData.sort_order) || 0,
      is_active: Boolean(formData.is_active),
    };

    setSubmitting(true);
    try {
      if (editingBundle) {
        await api.updateAdminOffer(editingBundle.id, payload);
        showToast(`Bundle "${payload.title}" updated successfully!`, 'success');
      } else {
        await api.createAdminOffer(payload);
        showToast(`New bundle "${payload.title}" created successfully!`, 'success');
      }
      setModalOpen(false);
      setEditingBundle(null);
      await loadBundles();
    } catch (err) {
      showToast(err?.message || 'Error saving bundle.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle active/inactive
  const handleToggleStatus = async (bundle) => {
    const nextStatus = !bundle.is_active;
    try {
      await api.updateAdminOffer(bundle.id, { is_active: nextStatus });
      showToast(
        `Bundle "${bundle.title}" is now ${nextStatus ? 'ACTIVE on storefront' : 'HIDDEN from storefront'}.`,
        'success'
      );
      await loadBundles();
    } catch (err) {
      showToast(err?.message || 'Failed to update bundle status.', 'error');
    }
  };

  // Open Delete Modal
  const handleConfirmDelete = (bundle) => {
    setBundleToDelete(bundle);
    setDeleteModalOpen(true);
  };

  // Execute Delete
  const handleDelete = async () => {
    if (!bundleToDelete) return;
    setSubmitting(true);
    try {
      await api.deleteAdminOffer(bundleToDelete.id);
      showToast(`Bundle "${bundleToDelete.title}" removed successfully.`, 'success');
      setDeleteModalOpen(false);
      setBundleToDelete(null);
      await loadBundles();
    } catch (err) {
      showToast(err?.message || 'Failed to remove bundle.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered bundles list
  const filteredBundles = bundles.filter((b) => {
    if (statusFilter === 'active' && !b.is_active) return false;
    if (statusFilter === 'inactive' && b.is_active) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = (b.title || '').toLowerCase().includes(q);
      const matchBadge = (b.badge || '').toLowerCase().includes(q);
      const matchDesc = (b.description || '').toLowerCase().includes(q);
      const matchHighlight = (b.highlight || '').toLowerCase().includes(q);
      if (!matchTitle && !matchBadge && !matchDesc && !matchHighlight) return false;
    }
    return true;
  });

  return (
    <div className="w-full max-w-6xl space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-surface-border rounded-lg p-5 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Icon name="tag" className="text-brand-green text-base" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-brand-ink">
              Promotional Bundles &amp; Homepage Deals
            </h2>
          </div>
          <p className="text-xs text-ink-muted mt-1">
            Manage the promotional value bundle cards displayed on the storefront homepage. Add new bundles, edit copy and prices, toggle storefront visibility, or remove bundles anytime.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="primary" size="sm" onClick={handleOpenCreate} className="gap-1.5">
            <Icon name="plus" className="text-xs" />
            <span>+ Add New Bundle</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-surface-border rounded-lg p-4 shadow-card">
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted block mb-1">
            Total Promotional Bundles
          </span>
          <div className="text-2xl font-bold text-brand-ink">{kpis.total}</div>
          <span className="text-[11px] text-ink-muted mt-1 block">Created bundle campaigns</span>
        </div>
        <div className="bg-white border border-surface-border rounded-lg p-4 shadow-card">
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted block mb-1">
            Active on Storefront
          </span>
          <div className="text-2xl font-bold text-brand-green">{kpis.active}</div>
          <span className="text-[11px] text-brand-green mt-1 block">Currently visible to shoppers</span>
        </div>
        <div className="bg-white border border-surface-border rounded-lg p-4 shadow-card">
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted block mb-1">
            Hidden / Inactive
          </span>
          <div className="text-2xl font-bold text-ink-muted">{kpis.inactive}</div>
          <span className="text-[11px] text-ink-muted mt-1 block">Drafts or temporarily hidden</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-surface-border rounded-lg p-4 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded ${
              statusFilter === 'all'
                ? 'bg-brand-ink text-white'
                : 'bg-surface-subtle text-brand-ink hover:bg-gray-200'
            }`}
          >
            All ({bundles.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 text-xs font-semibold rounded ${
              statusFilter === 'active'
                ? 'bg-brand-green text-white'
                : 'bg-surface-subtle text-brand-ink hover:bg-gray-200'
            }`}
          >
            Active ({kpis.active})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('inactive')}
            className={`px-3 py-1.5 text-xs font-semibold rounded ${
              statusFilter === 'inactive'
                ? 'bg-gray-700 text-white'
                : 'bg-surface-subtle text-brand-ink hover:bg-gray-200'
            }`}
          >
            Hidden ({kpis.inactive})
          </button>
        </div>

        <div className="w-full md:w-72">
          <Input
            placeholder="Search bundles by title, badge..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Bundles Live Cards Grid */}
      {loading ? (
        <div className="bg-white border border-surface-border rounded-lg p-12 text-center text-xs text-ink-muted">
          Loading promotional bundles...
        </div>
      ) : filteredBundles.length === 0 ? (
        <div className="bg-white border border-surface-border rounded-lg p-12 text-center shadow-card space-y-3">
          <Icon name="tag" className="text-3xl text-ink-muted mx-auto" />
          <h3 className="text-sm font-bold text-brand-ink uppercase tracking-wider">
            No Promotional Bundles Found
          </h3>
          <p className="text-xs text-ink-muted max-w-md mx-auto">
            {search || statusFilter !== 'all'
              ? 'No bundles matched your search or status filter. Try clearing filters.'
              : 'You have not created any promotional bundle cards yet. Click below to add your first bundle to the homepage.'}
          </p>
          <Button variant="primary" size="sm" onClick={handleOpenCreate}>
            + Add First Bundle
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredBundles.map((bundle, index) => {
            const isGreenStyle = index % 2 === 1 || Boolean(bundle.highlight);
            return (
              <div
                key={bundle.id}
                className={`border rounded-lg p-6 flex flex-col justify-between shadow-card relative ${
                  isGreenStyle
                    ? 'border-brand-green/30 bg-green-50/50'
                    : 'border-surface-border bg-white'
                }`}
              >
                {/* Status Indicator & Actions Bar */}
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-surface-border/60">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        bundle.is_active
                          ? 'bg-green-100 text-green-800 border border-green-300'
                          : 'bg-gray-200 text-gray-700 border border-gray-300'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          bundle.is_active ? 'bg-green-600' : 'bg-gray-500'
                        }`}
                      />
                      {bundle.is_active ? 'Live on Storefront' : 'Hidden'}
                    </span>
                    <span className="text-[10px] text-ink-muted font-mono">
                      Order: #{bundle.sort_order ?? index + 1}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(bundle)}
                      title={bundle.is_active ? 'Hide from storefront' : 'Activate on storefront'}
                      className={`px-2 py-1 text-[11px] font-semibold rounded border transition-colors ${
                        bundle.is_active
                          ? 'bg-white text-ink-muted border-surface-border hover:bg-gray-100'
                          : 'bg-green-600 text-white border-green-600 hover:bg-green-700'
                      }`}
                    >
                      {bundle.is_active ? 'Hide' : 'Activate'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(bundle)}
                      title="Edit bundle details"
                      className="px-2.5 py-1 text-[11px] font-semibold bg-white text-brand-ink border border-surface-border rounded hover:bg-gray-100 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleConfirmDelete(bundle)}
                      title="Remove this bundle"
                      className="px-2.5 py-1 text-[11px] font-semibold bg-white text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {/* Card Storefront Preview */}
                <div className="space-y-3 mb-6">
                  {bundle.badge && (
                    <Badge variant={isGreenStyle ? 'pill' : 'sale'} className="text-[11px]">
                      {bundle.badge}
                    </Badge>
                  )}
                  <h3 className="text-xl font-bold uppercase tracking-tight text-brand-ink">
                    {bundle.title}
                  </h3>
                  {bundle.description && (
                    <p className="text-xs text-ink-muted leading-relaxed">
                      {bundle.description}
                    </p>
                  )}

                  {/* Pricing or Highlight */}
                  <div className="pt-2">
                    {bundle.price > 0 && (
                      <div className="text-lg font-bold text-brand-ink">
                        Rs. {Number(bundle.price).toLocaleString()}{' '}
                        {bundle.original_price && Number(bundle.original_price) > Number(bundle.price) && (
                          <span className="text-xs text-ink-muted line-through font-normal ml-2">
                            Rs. {Number(bundle.original_price).toLocaleString()}
                          </span>
                        )}
                      </div>
                    )}
                    {bundle.highlight && (
                      <div className="text-base font-bold text-brand-green">
                        {bundle.highlight}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card CTA Button */}
                <div className="pt-2 border-t border-surface-border/40 flex items-center justify-between gap-2">
                  <div className="inline-block bg-brand-ink text-white text-xs font-semibold px-5 py-2 rounded">
                    {bundle.button_text || 'Shop The Deal'}
                  </div>
                  <span className="text-[11px] text-ink-muted font-mono truncate max-w-[180px]">
                    Link: {bundle.link || '/shop'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Bundle Modal */}
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingBundle ? `Edit Bundle: ${editingBundle.title}` : 'Add New Promotional Bundle'}
        >
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Bundle Title *"
                name="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Complete Daily Glow Duo"
                required
              />
              <Input
                label="Badge / Tag Text"
                name="badge"
                value={formData.badge}
                onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                placeholder="e.g. Special Bundle, Family Pack"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-brand-ink mb-1">
                Bundle Description
              </label>
              <textarea
                rows="3"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Pair our daily multivitamin with pure clarifying serum for comprehensive radiance..."
                className="w-full bg-white border border-surface-border rounded-sm p-2 text-xs focus:ring-1 focus:ring-brand-purple focus:border-brand-purple outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Bundle Price (PKR)"
                name="price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="e.g. 3499 (0 if perk only)"
              />
              <Input
                label="Original Compare Price (PKR)"
                name="original_price"
                type="number"
                value={formData.original_price}
                onChange={(e) => setFormData({ ...formData, original_price: e.target.value })}
                placeholder="e.g. 4350"
              />
            </div>

            <Input
              label="Highlight Perk / Banner Text (Optional)"
              name="highlight"
              value={formData.highlight}
              onChange={(e) => setFormData({ ...formData, highlight: e.target.value })}
              placeholder="e.g. Free Nationwide Delivery, Extra 10% Off"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Button Text"
                name="button_text"
                value={formData.button_text}
                onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
                placeholder="e.g. Shop The Duo"
              />
              <Input
                label="Button Target Link"
                name="link"
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                placeholder="e.g. /shop?bundle=glow-duo or /multivitamins"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <Input
                label="Display Order / Priority"
                name="sort_order"
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
                placeholder="0"
              />
              <div className="flex items-center gap-2 pt-6">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-brand-ink">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded text-brand-green focus:ring-brand-green"
                  />
                  <span>Active immediately on storefront</span>
                </label>
              </div>
            </div>

            {/* Live Visual Preview Inside Modal */}
            <div className="pt-3 border-t border-surface-border">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted block mb-2">
                Card Live Preview:
              </span>
              <div className="border border-surface-border rounded-lg p-5 bg-surface-subtle space-y-2.5">
                {formData.badge && (
                  <Badge variant="sale" className="text-[10px]">
                    {formData.badge}
                  </Badge>
                )}
                <h4 className="text-base font-bold uppercase tracking-tight text-brand-ink">
                  {formData.title || 'Your Bundle Title'}
                </h4>
                <p className="text-xs text-ink-muted">
                  {formData.description || 'Your promotional description will be displayed here.'}
                </p>
                {formData.price && (
                  <div className="text-sm font-bold text-brand-ink">
                    Rs. {Number(formData.price).toLocaleString()}{' '}
                    {formData.original_price && Number(formData.original_price) > Number(formData.price) && (
                      <span className="text-xs text-ink-muted line-through font-normal ml-2">
                        Rs. {Number(formData.original_price).toLocaleString()}
                      </span>
                    )}
                  </div>
                )}
                {formData.highlight && (
                  <div className="text-sm font-bold text-brand-green">
                    {formData.highlight}
                  </div>
                )}
                <div className="pt-2">
                  <span className="inline-block bg-brand-ink text-white text-[11px] font-semibold px-4 py-1.5 rounded">
                    {formData.button_text || 'Shop The Deal'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-surface-border">
              <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={submitting}>
                {submitting ? 'Saving...' : editingBundle ? 'Save Changes' : 'Create Bundle'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && bundleToDelete && (
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title="Remove Promotional Bundle"
        >
          <div className="space-y-4 text-xs">
            <p className="text-brand-ink">
              Are you sure you want to permanently remove the bundle <strong>"{bundleToDelete.title}"</strong>?
            </p>
            <p className="text-ink-muted">
              This card will be immediately removed from the homepage promotional deals section. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-4 border-t border-surface-border">
              <Button variant="outline" size="sm" onClick={() => setDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleDelete}
                disabled={submitting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {submitting ? 'Removing...' : 'Yes, Remove Bundle'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

