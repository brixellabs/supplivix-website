import React, { useState, useEffect, useCallback } from 'react';
import Icon from '../../components/ui/Icon';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import SaleCountdownTimer from '../../components/common/SaleCountdownTimer';
import { useToast } from '../../components/ui/Toast';
import { api } from '../../services/api';

const SALE_EVENT_PRESETS = [
  { key: 'eid_fitr', name: 'Eid ul Fitr Grand Celebration Sale', badge: 'EID MUBARAK SALE', discount: '25' },
  { key: 'azadi', name: 'Independence Day Mega Sale', badge: 'AZADI SALE', discount: '20' },
  { key: 'eid_adha', name: 'Eid ul Adha Special Sale', badge: 'BARI EID SALE', discount: '20' },
  { key: 'blessed_friday', name: 'Blessed Friday Mega Campaign', badge: 'BLESSED FRIDAY', discount: '30' },
  { key: 'new_year', name: 'New Year Wellness Glow Sale', badge: 'NEW YEAR SALE', discount: '15' },
  { key: 'resolution_day', name: 'Pakistan Day Resolution Sale', badge: '23RD MARCH SALE', discount: '23' },
];

const toLocalDatetimeInput = (date) => {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function AdminSaleEventsTab() {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState([]);
  const [kpis, setKpis] = useState({ total: 0, active: 0, scheduled: 0, expired: 0, disabled: 0 });
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Catalog data for target selection
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [catalogCategories, setCatalogCategories] = useState([]);

  // Create / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    discount_type: 'percent',
    discount_value: '20',
    max_discount_amount: '',
    apply_on: 'all',
    category_ids: [],
    product_ids: [],
    excluded_product_ids: [],
    start_at: '',
    end_at: '',
    priority: '10',
    allow_coupon_stacking: false,
    show_countdown: true,
    badge_text: '20% OFF SALE',
    is_enabled: true,
    confirm_high_discount: false,
  });
  const [bannerFile, setBannerFile] = useState(null);
  const [previewProducts, setPreviewProducts] = useState([]);
  const [overlapWarnings, setOverlapWarnings] = useState([]);

  // Multi-product picker filters
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductCategory, setSelectedProductCategory] = useState('all');
  const [excludeSearch, setExcludeSearch] = useState('');

  // Extend Modal
  const [extendModalOpen, setExtendModalOpen] = useState(false);
  const [extendingEvent, setExtendingEvent] = useState(null);
  const [extendHours, setExtendHours] = useState(24);

  // Report Modal
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportData, setReportData] = useState(null);

  // Table action dropdown
  const [activeActionMenuId, setActiveActionMenuId] = useState(null);

  useEffect(() => {
    const handleDocumentClick = () => {
      setActiveActionMenuId(null);
    };
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, []);

  // Load events and catalog items
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [eventsRes, prodRes, catRes] = await Promise.all([
        api.getAdminSaleEvents({ status: statusFilter, search }),
        catalogProducts.length === 0 ? api.getAdminProducts({ page_size: 150 }) : Promise.resolve(null),
        catalogCategories.length === 0 ? api.getAdminCategories() : Promise.resolve(null),
      ]);

      setEvents(eventsRes?.events || []);
      setKpis(eventsRes?.kpis || { total: 0, active: 0, scheduled: 0, expired: 0, disabled: 0 });
      if (prodRes?.results) setCatalogProducts(prodRes.results);
      if (catRes?.results) setCatalogCategories(catRes.results);
    } catch (err) {
      showToast(err.message || 'Could not load sale events.', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, catalogProducts.length, catalogCategories.length, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Preview helper
  const triggerPreview = async (formObj) => {
    try {
      const payload = {
        discount_type: formObj.discount_type,
        discount_value: Number(formObj.discount_value) || 0,
        max_discount_amount: formObj.max_discount_amount ? Number(formObj.max_discount_amount) : null,
        apply_on: formObj.apply_on,
        category_ids: formObj.category_ids,
        product_ids: formObj.product_ids,
        excluded_product_ids: formObj.excluded_product_ids,
      };
      const res = await api.previewAdminSaleEvent(payload);
      if (res?.preview_products) {
        setPreviewProducts(res.preview_products);
      }
    } catch {
      // preview error ignored
    }
  };

  // Preview discounted price per product in picker
  const getProductPreviewPrice = useCallback((originalPrice) => {
    const val = Number(form.discount_value) || 0;
    if (val <= 0) return originalPrice;
    let discAmt = 0;
    if (form.discount_type === 'percent') {
      discAmt = Math.round((originalPrice * val) / 100);
      if (form.max_discount_amount) {
        discAmt = Math.min(discAmt, Number(form.max_discount_amount));
      }
    } else {
      discAmt = Math.round(val);
    }
    discAmt = Math.max(0, Math.min(discAmt, originalPrice));
    return Math.max(0, originalPrice - discAmt);
  }, [form.discount_value, form.discount_type, form.max_discount_amount]);

  // Filter products for the multi-select picker
  const filteredPickerProducts = catalogProducts.filter((p) => {
    const q = productSearch.trim().toLowerCase();
    const matchesSearch = !q ||
      p.name?.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q) ||
      p.slug?.toLowerCase().includes(q);
    const catId = p.category?.id || p.category_id || p.category;
    const matchesCategory = selectedProductCategory === 'all' || String(catId) === String(selectedProductCategory);
    return matchesSearch && matchesCategory;
  });

  // Filter excluded products when apply_on === 'all'
  const filteredExcludeProducts = catalogProducts.filter((p) => {
    const q = excludeSearch.trim().toLowerCase();
    return !q || p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q);
  });

  const handleSelectAllVisibleProducts = () => {
    const visibleIds = filteredPickerProducts.map((p) => p.id);
    const combined = Array.from(new Set([...form.product_ids, ...visibleIds]));
    handleFormChange('product_ids', combined);
  };

  const handleDeselectAllVisibleProducts = () => {
    const visibleIdsSet = new Set(filteredPickerProducts.map((p) => p.id));
    const next = form.product_ids.filter((id) => !visibleIdsSet.has(id));
    handleFormChange('product_ids', next);
  };

  const handleSelectAllCatalogProducts = () => {
    const allIds = catalogProducts.map((p) => p.id);
    handleFormChange('product_ids', allIds);
  };

  const handleClearAllSelectedProducts = () => {
    handleFormChange('product_ids', []);
  };

  const handleSelectAllCategories = () => {
    const allCatIds = catalogCategories.map((c) => c.id);
    handleFormChange('category_ids', allCatIds);
  };

  const handleClearAllCategories = () => {
    handleFormChange('category_ids', []);
  };

  const handleOpenCreate = () => {
    setEditingEvent(null);
    setProductSearch('');
    setSelectedProductCategory('all');
    setExcludeSearch('');
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const initial = {
      name: '',
      slug: '',
      description: '',
      discount_type: 'percent',
      discount_value: '20',
      max_discount_amount: '',
      apply_on: 'all',
      category_ids: [],
      product_ids: [],
      excluded_product_ids: [],
      start_at: toLocalDatetimeInput(now),
      end_at: toLocalDatetimeInput(nextWeek),
      priority: '10',
      allow_coupon_stacking: false,
      show_countdown: true,
      badge_text: '20% OFF SALE',
      is_enabled: true,
      confirm_high_discount: false,
    };
    setForm(initial);
    setBannerFile(null);
    setOverlapWarnings([]);
    setModalOpen(true);
    triggerPreview(initial);
  };

  const handleOpenEdit = (ev) => {
    setEditingEvent(ev);
    setProductSearch('');
    setSelectedProductCategory('all');
    setExcludeSearch('');
    const initial = {
      name: ev.name || '',
      slug: ev.slug || '',
      description: ev.description || '',
      discount_type: ev.discount_type || 'percent',
      discount_value: String(ev.discount_value || '20'),
      max_discount_amount: ev.max_discount_amount ? String(ev.max_discount_amount) : '',
      apply_on: ev.apply_on || 'all',
      category_ids: ev.category_ids || [],
      product_ids: ev.product_ids || [],
      excluded_product_ids: ev.excluded_product_ids || [],
      start_at: ev.start_at ? toLocalDatetimeInput(ev.start_at) : '',
      end_at: ev.end_at ? toLocalDatetimeInput(ev.end_at) : '',
      priority: String(ev.priority ?? 0),
      allow_coupon_stacking: Boolean(ev.allow_coupon_stacking),
      show_countdown: Boolean(ev.show_countdown),
      badge_text: ev.badge_text || '',
      is_enabled: Boolean(ev.is_enabled),
      confirm_high_discount: false,
    };
    setForm(initial);
    setBannerFile(null);
    setOverlapWarnings([]);
    setModalOpen(true);
    triggerPreview(initial);
  };

  const handleFormChange = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (['discount_type', 'discount_value', 'apply_on', 'max_discount_amount', 'product_ids', 'category_ids', 'excluded_product_ids'].includes(key)) {
        triggerPreview(next);
      }
      return next;
    });
  };

  const handleApplyPreset = (preset) => {
    setForm((prev) => {
      const next = {
        ...prev,
        name: preset.name,
        badge_text: preset.badge,
        discount_value: preset.discount,
      };
      triggerPreview(next);
      return next;
    });
  };

  const handleSave = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!form.name.trim()) {
      showToast('Campaign name is required.', 'error');
      return;
    }
    const val = Number(form.discount_value);
    if (!val || val <= 0) {
      showToast('Discount value must be greater than zero.', 'error');
      return;
    }
    if (form.discount_type === 'percent' && val > 100) {
      showToast('Percentage discount cannot exceed 100%.', 'error');
      return;
    }

    if (form.discount_type === 'percent' && val > 90 && !form.confirm_high_discount) {
      const ok = window.confirm(`Discount is ${val}%, which exceeds 90%. Are you sure you want to proceed with this high discount rate?`);
      if (!ok) return;
      form.confirm_high_discount = true;
    }

    try {
      const formData = new FormData();
      formData.append('name', form.name.trim());
      formData.append('discount_type', form.discount_type);
      formData.append('discount_value', String(form.discount_value));
      if (form.max_discount_amount) formData.append('max_discount_amount', form.max_discount_amount);
      formData.append('apply_on', form.apply_on);
      formData.append('start_at', form.start_at);
      formData.append('end_at', form.end_at);
      formData.append('priority', String(form.priority || 0));
      formData.append('allow_coupon_stacking', String(form.allow_coupon_stacking));
      formData.append('show_countdown', String(form.show_countdown));
      formData.append('badge_text', form.badge_text.trim());
      formData.append('description', form.description.trim());
      formData.append('is_enabled', String(form.is_enabled));
      if (form.confirm_high_discount) formData.append('confirm_high_discount', 'true');

      formData.append('category_ids', JSON.stringify(form.category_ids || []));
      formData.append('product_ids', JSON.stringify(form.product_ids || []));
      formData.append('excluded_product_ids', JSON.stringify(form.excluded_product_ids || []));
      if (bannerFile) {
        formData.append('banner_image', bannerFile);
      }

      let res;
      if (editingEvent) {
        res = await api.updateAdminSaleEvent(editingEvent.id, formData);
        showToast(`Sale campaign "${form.name}" updated successfully.`);
      } else {
        res = await api.createAdminSaleEvent(formData);
        showToast(`Sale campaign "${form.name}" created successfully.`);
      }

      if (res?.overlap_warnings?.length) {
        setOverlapWarnings(res.overlap_warnings);
        showToast(`Notice: Overlaps with ${res.overlap_warnings.length} other event(s). Highest priority takes precedence.`, 'info');
      }

      setModalOpen(false);
      loadData();
    } catch (err) {
      showToast(err.message || 'Could not save campaign.', 'error');
    }
  };

  const handleToggle = async (ev) => {
    try {
      const res = await api.toggleAdminSaleEvent(ev.id);
      showToast(`Campaign "${ev.name}" is now ${res.is_enabled ? 'ENABLED' : 'DISABLED'}.`);
      loadData();
    } catch (err) {
      showToast(err.message || 'Could not toggle campaign.', 'error');
    }
  };

  const handleDuplicate = async (ev) => {
    try {
      await api.duplicateAdminSaleEvent(ev.id);
      showToast(`Duplicated "${ev.name}". Created as draft copy.`);
      loadData();
    } catch (err) {
      showToast(err.message || 'Could not duplicate campaign.', 'error');
    }
  };

  const handleEndNow = async (ev) => {
    if (!window.confirm(`Are you sure you want to end "${ev.name}" immediately? Prices will revert to regular catalog prices.`)) {
      return;
    }
    try {
      await api.endNowAdminSaleEvent(ev.id);
      showToast(`Campaign "${ev.name}" has been ended.`);
      loadData();
    } catch (err) {
      showToast(err.message || 'Could not end campaign.', 'error');
    }
  };

  const handleOpenExtend = (ev) => {
    setExtendingEvent(ev);
    setExtendHours(24);
    setExtendModalOpen(true);
  };

  const handleSaveExtend = async () => {
    if (!extendingEvent) return;
    try {
      await api.extendAdminSaleEvent(extendingEvent.id, { extend_hours: Number(extendHours) || 24 });
      showToast(`Campaign "${extendingEvent.name}" extended by ${extendHours} hours.`);
      setExtendModalOpen(false);
      loadData();
    } catch (err) {
      showToast(err.message || 'Could not extend campaign.', 'error');
    }
  };

  const handleOpenReport = async (ev) => {
    try {
      const res = await api.getAdminSaleEventReport(ev.id);
      setReportData(res.report);
      setReportModalOpen(true);
    } catch (err) {
      showToast(err.message || 'Could not load sales report.', 'error');
    }
  };

  const handleDelete = async (ev) => {
    if (!window.confirm(`Are you sure you want to delete "${ev.name}"?`)) {
      return;
    }
    try {
      await api.deleteAdminSaleEvent(ev.id);
      showToast(`Campaign "${ev.name}" deleted.`);
      loadData();
    } catch (err) {
      showToast(err.message || 'Could not delete campaign.', 'error');
    }
  };

  const formatDt = (isoStr) => {
    if (!isoStr) return '-';
    const d = new Date(isoStr);
    return d.toLocaleString('en-PK', {
      timeZone: 'Asia/Karachi',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-surface-border gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-brand-ink">
            Sale Events &amp; Campaign Management
          </h2>
          <p className="text-xs text-ink-muted mt-1">
            Create occasion &amp; seasonal campaigns (Eid, Independence Day, Black Friday) with server-calculated discounts. Catalog DB prices remain 100% untouched.
          </p>
        </div>
        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={handleOpenCreate}
          className="h-[40px] px-5 self-start sm:self-auto shrink-0 shadow-sm inline-flex items-center gap-2 font-bold text-xs"
        >
          <Icon name="plus" className="text-xs" />
          <span>Create New Campaign</span>
        </Button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-subtle border border-surface-border rounded-lg p-5 shadow-card">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted block mb-1">
            Total Campaigns
          </span>
          <span className="text-2xl font-bold text-brand-ink block">
            {kpis.total}
          </span>
          <span className="text-[11px] text-ink-muted mt-1 block">
            All created sale events
          </span>
        </div>
        <div className="bg-surface-subtle border border-brand-green/40 rounded-lg p-5 shadow-card">
          <span className="text-[11px] font-bold uppercase tracking-wider text-brand-green block mb-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
            Active Right Now
          </span>
          <span className="text-2xl font-bold text-brand-green block">
            {kpis.active}
          </span>
          <span className="text-[11px] text-brand-green/80 mt-1 block font-medium">
            Showing reduced prices on storefront
          </span>
        </div>
        <div className="bg-surface-subtle border border-blue-200 rounded-lg p-5 shadow-card">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 block mb-1">
            Scheduled Upcoming
          </span>
          <span className="text-2xl font-bold text-blue-700 block">
            {kpis.scheduled}
          </span>
          <span className="text-[11px] text-blue-600/80 mt-1 block">
            Will start automatically on schedule
          </span>
        </div>
        <div className="bg-surface-subtle border border-surface-border rounded-lg p-5 shadow-card">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted block mb-1">
            Expired / Concluded
          </span>
          <span className="text-2xl font-bold text-ink-muted block">
            {kpis.expired}
          </span>
          <span className="text-[11px] text-ink-muted mt-1 block">
            Prices automatically reverted
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 bg-surface-subtle border border-surface-border rounded-lg">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { key: 'all', label: `All (${kpis.total})` },
            { key: 'active', label: `Active (${kpis.active})` },
            { key: 'scheduled', label: `Scheduled (${kpis.scheduled})` },
            { key: 'expired', label: `Expired (${kpis.expired})` },
            { key: 'disabled', label: `Disabled (${kpis.disabled})` },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 text-xs font-bold rounded uppercase tracking-wider transition-colors ${
                statusFilter === tab.key
                  ? 'bg-brand-ink text-white shadow-sm'
                  : 'bg-white text-ink-muted hover:text-brand-ink border border-surface-border'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[220px]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search campaigns..."
            className="w-full bg-white border border-surface-border rounded-sm py-1.5 pl-8 pr-3 text-xs text-brand-ink focus:outline-none focus:border-brand-green"
          />
          <Icon name="search" className="absolute left-2.5 top-2.5 text-xs text-ink-muted" />
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-white border border-surface-border rounded-lg overflow-hidden shadow-card">
        {events.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Icon name="tag" className="text-4xl text-ink-muted mb-2" />
            <h3 className="text-sm font-bold text-brand-ink mb-1">No Sale Campaigns Found</h3>
            <p className="text-xs text-ink-muted mb-4 max-w-sm mx-auto">
              {search || statusFilter !== 'all'
                ? 'No campaigns match your selected filter or search keyword.'
                : 'Launch your first seasonal discount campaign to boost storefront sales.'}
            </p>
            <Button variant="primary" size="sm" onClick={handleOpenCreate}>
              Create First Campaign
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-brand-ink border-collapse">
              <thead>
                <tr className="bg-surface-subtle border-b border-surface-border text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                  <th className="p-3.5 min-w-[200px]">Campaign &amp; Badge</th>
                  <th className="p-3.5 whitespace-nowrap">Discount</th>
                  <th className="p-3.5 whitespace-nowrap">Scope / Targets</th>
                  <th className="p-3.5 whitespace-nowrap min-w-[170px]">Schedule (Asia/Karachi)</th>
                  <th className="p-3.5 text-center whitespace-nowrap">Status</th>
                  <th className="p-3.5 whitespace-nowrap">Urgency Timer</th>
                  <th className="p-3.5 text-right whitespace-nowrap pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border font-medium">
                {events.map((ev) => {
                  const statusColors = {
                    active: 'bg-green-100 text-green-800 border-green-300',
                    scheduled: 'bg-blue-100 text-blue-800 border-blue-300',
                    expired: 'bg-gray-100 text-gray-700 border-gray-300',
                    disabled: 'bg-amber-100 text-amber-800 border-amber-300',
                    draft: 'bg-purple-100 text-purple-800 border-purple-300',
                  };

                  return (
                    <tr key={ev.id} className="hover:bg-surface-subtle/60 transition-colors">
                      <td className="p-3.5">
                        <div className="flex flex-col gap-1">
                          <div className="font-bold text-brand-ink text-sm flex items-center gap-2">
                            <span>{ev.name}</span>
                            {ev.priority > 0 && (
                              <span className="text-[10px] font-mono font-bold bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded border border-gray-200 whitespace-nowrap">
                                P:{ev.priority}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-red-50 text-red-700 px-2 py-0.5 rounded border border-red-200 whitespace-nowrap">
                              {ev.badge_text || 'Sale'}
                            </span>
                            <a
                              href={`/sale/${ev.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-brand-green hover:underline inline-flex items-center gap-0.5 whitespace-nowrap"
                            >
                              <span>/sale/{ev.slug}</span>
                              <Icon name="arrow-right" className="text-[10px]" />
                            </a>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-bold text-sm text-brand-ink">
                          {ev.discount_type === 'percent' ? `${ev.discount_value}% OFF` : `Rs. ${Number(ev.discount_value).toLocaleString()} OFF`}
                        </div>
                        {ev.max_discount_amount && (
                          <div className="text-[10px] text-ink-muted">
                            Cap: Rs. {Number(ev.max_discount_amount).toLocaleString()}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        {ev.apply_on === 'all' && (
                          <div>
                            <span className="inline-block font-semibold text-brand-ink">All Products</span>
                            {ev.excluded_product_ids?.length > 0 && (
                              <span className="text-[10px] text-ink-muted block">
                                ({ev.excluded_product_ids.length} excluded)
                              </span>
                            )}
                          </div>
                        )}
                        {ev.apply_on === 'categories' && (
                          <span className="font-semibold text-brand-ink">
                            {ev.category_ids?.length || 0} Categories
                          </span>
                        )}
                        {ev.apply_on === 'products' && (
                          <span className="font-semibold text-brand-ink">
                            {ev.product_ids?.length || 0} Products
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-[11px] text-ink-muted leading-relaxed whitespace-nowrap">
                        <div><strong className="text-brand-ink">From:</strong> {formatDt(ev.start_at)}</div>
                        <div><strong className="text-brand-ink">To:</strong> {formatDt(ev.end_at)}</div>
                      </td>
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded border ${
                            statusColors[ev.effective_status] || statusColors.draft
                          }`}
                        >
                          {ev.effective_status}
                        </span>
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        {ev.is_active && ev.show_countdown ? (
                          <SaleCountdownTimer targetDate={ev.end_at} compact badgeText="Ends" />
                        ) : ev.effective_status === 'scheduled' ? (
                          <span className="text-[11px] text-blue-600 font-medium">Starts soon</span>
                        ) : (
                          <span className="text-[11px] text-ink-muted">-</span>
                        )}
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <div className="relative inline-flex items-center gap-1.5 justify-end">
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={() => handleOpenEdit(ev)}
                            className="text-[11px] py-1 px-3 shadow-2xs font-bold"
                            title="Edit Event"
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggle(ev)}
                            className={`text-[11px] py-1 px-2.5 font-bold ${
                              ev.is_enabled
                                ? 'text-amber-800 border-amber-300 hover:bg-amber-50'
                                : 'text-green-800 border-green-300 hover:bg-green-50'
                            }`}
                            title={ev.is_enabled ? 'Disable Event' : 'Enable Event'}
                          >
                            {ev.is_enabled ? 'Disable' : 'Enable'}
                          </Button>

                          {/* More Actions Dropdown */}
                          <div className="relative inline-block text-left">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveActionMenuId(activeActionMenuId === ev.id ? null : ev.id);
                              }}
                              className="px-2.5 py-1 text-xs font-bold bg-white border border-surface-border rounded hover:bg-surface-subtle text-brand-ink transition-colors inline-flex items-center gap-1 shadow-2xs"
                              title="More options"
                            >
                              <span>More</span>
                              <Icon name="chevron-down" className="text-[9px]" />
                            </button>

                            {activeActionMenuId === ev.id && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-full mt-1 w-44 bg-white border border-surface-border rounded-md shadow-card z-30 py-1 text-left text-xs divide-y divide-surface-border"
                              >
                                <div className="py-1">
                                  {ev.is_active && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveActionMenuId(null);
                                          handleOpenExtend(ev);
                                        }}
                                        className="w-full px-3 py-1.5 text-left text-blue-700 hover:bg-blue-50 flex items-center gap-2 font-medium"
                                      >
                                        <Icon name="clock" className="text-[10px]" />
                                        <span>Extend Duration</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveActionMenuId(null);
                                          handleEndNow(ev);
                                        }}
                                        className="w-full px-3 py-1.5 text-left text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                                      >
                                        <Icon name="exclamation" className="text-[10px]" />
                                        <span>End Campaign Now</span>
                                      </button>
                                    </>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      handleDuplicate(ev);
                                    }}
                                    className="w-full px-3 py-1.5 text-left text-brand-ink hover:bg-surface-subtle flex items-center gap-2 font-medium"
                                  >
                                    <Icon name="copy" className="text-[10px]" />
                                    <span>Duplicate as Draft</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      handleOpenReport(ev);
                                    }}
                                    className="w-full px-3 py-1.5 text-left text-brand-green hover:bg-green-50 flex items-center gap-2 font-medium"
                                  >
                                    <Icon name="chart" className="text-[10px]" />
                                    <span>Sales Report</span>
                                  </button>
                                </div>
                                <div className="py-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      handleDelete(ev);
                                    }}
                                    className="w-full px-3 py-1.5 text-left text-red-600 hover:bg-red-50 flex items-center gap-2 font-semibold"
                                  >
                                    <Icon name="trash" className="text-[10px]" />
                                    <span>Delete Campaign</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================================================================== */}
      {/* 1. Create / Edit Sale Event Modal */}
      {/* ================================================================== */}
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingEvent ? `Edit Campaign: ${editingEvent.name}` : 'Create Seasonal Sale Campaign'}
          maxWidth="max-w-4xl"
        >
          <form onSubmit={handleSave} className="space-y-5 text-xs">
            {/* Presets Bar */}
            {!editingEvent && (
              <div className="p-3 bg-surface-subtle border border-surface-border rounded-md">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted block mb-2">
                  Quick Seasonal Presets:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {SALE_EVENT_PRESETS.map((preset) => (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-surface-border hover:border-brand-green rounded text-brand-ink transition-colors shadow-2xs"
                    >
                      {preset.badge} ({preset.discount}%)
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Campaign Name & Badge */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <Input
                  label="Campaign Name *"
                  name="eventName"
                  value={form.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  placeholder="e.g. Independence Day Mega Sale"
                  required
                />
              </div>
              <div>
                <Input
                  label="Storefront Badge Text *"
                  name="eventBadge"
                  value={form.badge_text}
                  onChange={(e) => handleFormChange('badge_text', e.target.value)}
                  placeholder="e.g. AZADI SALE"
                  required
                />
              </div>
            </div>

            {/* Discount Configuration & Guardrail */}
            <div className="p-3.5 bg-surface-subtle border border-surface-border rounded-md space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-brand-ink mb-1">
                    Discount Type *
                  </label>
                  <select
                    value={form.discount_type}
                    onChange={(e) => handleFormChange('discount_type', e.target.value)}
                    className="w-full bg-white border border-surface-border rounded-sm p-2 text-xs text-brand-ink focus:outline-none focus:border-brand-green"
                  >
                    <option value="percent">Percentage (%) Off</option>
                    <option value="flat">Flat Amount (PKR) Off</option>
                  </select>
                </div>

                <div>
                  <Input
                    label={form.discount_type === 'percent' ? 'Discount Percentage (%) *' : 'Discount Flat Amount (PKR) *'}
                    name="discountValue"
                    type="number"
                    min="1"
                    max={form.discount_type === 'percent' ? '100' : '999999'}
                    value={form.discount_value}
                    onChange={(e) => handleFormChange('discount_value', e.target.value)}
                    placeholder={form.discount_type === 'percent' ? '20' : '500'}
                    required
                  />
                </div>

                <div>
                  <Input
                    label="Max Discount Cap in PKR (Optional)"
                    name="maxDiscountAmount"
                    type="number"
                    value={form.max_discount_amount}
                    onChange={(e) => handleFormChange('max_discount_amount', e.target.value)}
                    placeholder="e.g. 1000"
                    disabled={form.discount_type === 'flat'}
                  />
                </div>
              </div>

              {/* Guardrail warnings */}
              {form.discount_type === 'percent' && Number(form.discount_value) > 70 && (
                <div className={`p-2.5 rounded text-xs font-medium border ${
                  Number(form.discount_value) > 90
                    ? 'bg-red-50 text-red-700 border-red-300'
                    : 'bg-amber-50 text-amber-800 border-amber-300'
                }`}>
                  {Number(form.discount_value) > 90
                    ? `Caution: Discount is ${form.discount_value}%, which exceeds 90%. Saving this will require explicit confirmation.`
                    : `Notice: A high discount rate of ${form.discount_value}% will be applied across eligible products.`}
                </div>
              )}
            </div>

            {/* Scope / Target Selection */}
            <div>
              <label className="block text-xs font-semibold text-brand-ink mb-1">
                Apply Discount On *
              </label>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { key: 'all', label: 'All Catalog Products' },
                  { key: 'categories', label: 'Specific Categories' },
                  { key: 'products', label: 'Specific Products' },
                ].map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => handleFormChange('apply_on', s.key)}
                    className={`p-2.5 rounded text-xs font-bold text-center border transition-colors ${
                      form.apply_on === s.key
                        ? 'bg-brand-green text-white border-brand-green'
                        : 'bg-white text-brand-ink border-surface-border hover:bg-surface-subtle'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* All Catalog Products Info & Exclusions */}
              {form.apply_on === 'all' && (
                <div className="p-3.5 bg-green-50 border border-green-200 rounded-md space-y-2.5">
                  <div className="flex items-start gap-2.5 text-xs text-green-900 font-medium">
                    <Icon name="check-circle" className="text-brand-green text-sm mt-0.5 flex-shrink-0" />
                    <div>
                      <strong className="block text-brand-ink text-xs uppercase tracking-wider">
                        Tamam Store Products Par Sale Apply Ho Rahi Hai
                      </strong>
                      <span className="text-[11px] text-ink-muted">
                        Store ke tamam {catalogProducts.length} products par automatically runtime discount apply hoga aur Homepage banners par bhi show hoga.
                      </span>
                    </div>
                  </div>

                  {/* Optional Excluded Products */}
                  <div className="pt-2 border-t border-green-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-brand-ink uppercase tracking-wider">
                        Exclude Specific Products ({form.excluded_product_ids.length} excluded):
                      </span>
                      {form.excluded_product_ids.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleFormChange('excluded_product_ids', [])}
                          className="text-[10px] text-red-600 hover:underline font-semibold"
                        >
                          Clear Exclusions
                        </button>
                      )}
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        value={excludeSearch}
                        onChange={(e) => setExcludeSearch(e.target.value)}
                        placeholder="Search products to exclude..."
                        className="w-full bg-white border border-surface-border rounded-sm py-1.5 pl-8 pr-3 text-xs text-brand-ink focus:outline-none focus:border-brand-green"
                      />
                      <Icon name="search" className="absolute left-2.5 top-2 text-xs text-ink-muted" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-1 bg-white border border-surface-border rounded">
                      {filteredExcludeProducts.map((p) => {
                        const isExcluded = form.excluded_product_ids.includes(p.id);
                        return (
                          <label key={p.id} className="flex items-center gap-2 p-1.5 hover:bg-surface-subtle rounded cursor-pointer text-xs">
                            <input
                              type="checkbox"
                              checked={isExcluded}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...form.excluded_product_ids, p.id]
                                  : form.excluded_product_ids.filter((id) => id !== p.id);
                                handleFormChange('excluded_product_ids', next);
                              }}
                              className="rounded text-red-600 focus:ring-red-600"
                            />
                            <span className={`truncate text-xs ${isExcluded ? 'text-red-700 font-semibold line-through' : 'text-brand-ink'}`}>
                              {p.name}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Category Picker */}
              {form.apply_on === 'categories' && (
                <div className="p-3.5 bg-surface-subtle border border-surface-border rounded-md space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-surface-border">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-brand-ink block">
                        Target Categories ({form.category_ids.length} of {catalogCategories.length} selected)
                      </span>
                      <span className="text-[11px] text-ink-muted">
                        Selected categories ke tamam products par discount automatically apply hoga.
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleSelectAllCategories}
                        className="px-2.5 py-1 text-[11px] font-bold bg-brand-green text-white rounded hover:bg-brand-green/90 transition-colors shadow-2xs"
                      >
                        Select All ({catalogCategories.length})
                      </button>
                      {form.category_ids.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearAllCategories}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-red-50 border border-red-200 text-red-700 rounded hover:bg-red-100 transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1 bg-white border border-surface-border rounded">
                    {catalogCategories.map((c) => {
                      const isChecked = form.category_ids.includes(c.id);
                      const count = catalogProducts.filter(
                        (p) => String(p.category?.id || p.category_id || p.category) === String(c.id)
                      ).length;
                      return (
                        <label
                          key={c.id}
                          className={`flex items-center justify-between gap-2 p-2 rounded cursor-pointer text-xs border transition-colors ${
                            isChecked
                              ? 'bg-green-50 border-brand-green text-brand-green font-bold'
                              : 'border-surface-border hover:bg-surface-subtle text-brand-ink'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...form.category_ids, c.id]
                                  : form.category_ids.filter((id) => id !== c.id);
                                handleFormChange('category_ids', next);
                              }}
                              className="rounded text-brand-green focus:ring-brand-green"
                            />
                            <span className="truncate">{c.name}</span>
                          </div>
                          <span className="text-[10px] font-mono opacity-70 flex-shrink-0">
                            {count} items
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Multi-Product Picker */}
              {form.apply_on === 'products' && (
                <div className="p-3.5 bg-surface-subtle border border-surface-border rounded-md space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-surface-border">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-brand-ink block">
                        Select Multiple Products ({form.product_ids.length} of {catalogProducts.length} Selected)
                      </span>
                      <span className="text-[11px] text-ink-muted">
                        Aap search filter ya category filter use kar ke multiple products ek sath select kar sakte hain.
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={handleSelectAllVisibleProducts}
                        className="px-2.5 py-1 text-[11px] font-bold bg-brand-green text-white rounded hover:bg-brand-green/90 transition-colors shadow-2xs"
                        title="Filter hue tamam products ko selection mein add karein"
                      >
                        Select All Visible ({filteredPickerProducts.length})
                      </button>
                      <button
                        type="button"
                        onClick={handleSelectAllCatalogProducts}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-surface-border text-brand-ink rounded hover:bg-surface-subtle transition-colors"
                      >
                        Select All ({catalogProducts.length})
                      </button>
                      {form.product_ids.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearAllSelectedProducts}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-red-50 border border-red-200 text-red-700 rounded hover:bg-red-100 transition-colors"
                        >
                          Clear Selection
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Filter bar: Search input + Category Pills */}
                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        type="text"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        placeholder="Search products by title, SKU..."
                        className="w-full bg-white border border-surface-border rounded-sm py-1.5 pl-8 pr-8 text-xs text-brand-ink focus:outline-none focus:border-brand-green"
                      />
                      <Icon name="search" className="absolute left-2.5 top-2.5 text-xs text-ink-muted" />
                      {productSearch && (
                        <button
                          type="button"
                          onClick={() => setProductSearch('')}
                          className="absolute right-2.5 top-2 text-xs text-ink-muted hover:text-brand-ink font-bold"
                          aria-label="Clear search"
                        >
                          &times;
                        </button>
                      )}
                    </div>

                    {/* Category Quick Filter Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                      <span className="text-ink-muted font-bold uppercase text-[10px] mr-1 flex-shrink-0">Category Filter:</span>
                      <button
                        type="button"
                        onClick={() => setSelectedProductCategory('all')}
                        className={`px-2 py-0.5 rounded-full font-semibold whitespace-nowrap transition-colors ${
                          selectedProductCategory === 'all'
                            ? 'bg-brand-ink text-white'
                            : 'bg-white border border-surface-border text-brand-ink hover:bg-surface-subtle'
                        }`}
                      >
                        All ({catalogProducts.length})
                      </button>
                      {catalogCategories.map((c) => {
                        const count = catalogProducts.filter(
                          (p) => String(p.category?.id || p.category_id || p.category) === String(c.id)
                        ).length;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setSelectedProductCategory(String(c.id))}
                            className={`px-2 py-0.5 rounded-full font-semibold whitespace-nowrap transition-colors ${
                              String(selectedProductCategory) === String(c.id)
                                ? 'bg-brand-ink text-white'
                                : 'bg-white border border-surface-border text-brand-ink hover:bg-surface-subtle'
                            }`}
                          >
                            {c.name} ({count})
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Selected Products Chips Bar */}
                  {form.product_ids.length > 0 && (
                    <div className="p-2 bg-green-50 border border-green-200 rounded text-xs space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold text-green-800">
                        <span>{form.product_ids.length} Products Currently Selected For Sale:</span>
                        <button
                          type="button"
                          onClick={handleClearAllSelectedProducts}
                          className="text-red-600 hover:underline font-semibold"
                        >
                          Clear Selection
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                        {form.product_ids.map((pid) => {
                          const p = catalogProducts.find((cp) => cp.id === pid);
                          if (!p) return null;
                          return (
                            <span
                              key={pid}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-green-300 rounded text-[11px] font-medium text-brand-ink shadow-2xs"
                            >
                              <span className="truncate max-w-[150px]">{p.name}</span>
                              <button
                                type="button"
                                onClick={() => handleFormChange('product_ids', form.product_ids.filter((id) => id !== pid))}
                                className="text-ink-muted hover:text-red-600 font-bold ml-0.5 text-xs"
                                aria-label="Remove product"
                              >
                                &times;
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Product List Grid */}
                  <div className="max-h-60 overflow-y-auto p-1 bg-white border border-surface-border rounded divide-y divide-surface-border">
                    {filteredPickerProducts.length === 0 ? (
                      <div className="p-4 text-center text-ink-muted text-xs">
                        No products matched your search or category filter.
                      </div>
                    ) : (
                      filteredPickerProducts.map((p) => {
                        const isChecked = form.product_ids.includes(p.id);
                        const salePx = getProductPreviewPrice(p.price);
                        const discountAmt = Math.max(0, p.price - salePx);
                        return (
                          <label
                            key={p.id}
                            className={`flex items-center justify-between p-2 hover:bg-surface-subtle rounded cursor-pointer transition-colors ${
                              isChecked ? 'bg-green-50/70 border-l-4 border-brand-green' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  const next = e.target.checked
                                    ? [...form.product_ids, p.id]
                                    : form.product_ids.filter((id) => id !== p.id);
                                  handleFormChange('product_ids', next);
                                }}
                                className="rounded text-brand-green focus:ring-brand-green flex-shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="font-semibold text-brand-ink text-xs truncate">
                                  {p.name}
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-ink-muted">
                                  {p.sku && <span className="font-mono">SKU: {p.sku}</span>}
                                  {p.category?.name && (
                                    <span className="bg-surface-subtle px-1.5 py-0.2 rounded border border-surface-border">
                                      {p.category.name}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Price Preview */}
                            <div className="text-right flex-shrink-0 pl-2">
                              <div className="font-bold text-xs text-brand-green">
                                Rs. {salePx.toLocaleString()}
                              </div>
                              {discountAmt > 0 && (
                                <div className="text-[10px] text-ink-muted line-through">
                                  Rs. {p.price.toLocaleString()}
                                </div>
                              )}
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Schedule & Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Input
                  label="Start Date & Time (PK Time) *"
                  name="startAt"
                  type="datetime-local"
                  value={form.start_at}
                  onChange={(e) => handleFormChange('start_at', e.target.value)}
                  required
                />
              </div>
              <div>
                <Input
                  label="End Date & Time (PK Time) *"
                  name="endAt"
                  type="datetime-local"
                  value={form.end_at}
                  onChange={(e) => handleFormChange('end_at', e.target.value)}
                  required
                />
              </div>
              <div>
                <Input
                  label="Priority (Higher Integer Wins)"
                  name="priority"
                  type="number"
                  value={form.priority}
                  onChange={(e) => handleFormChange('priority', e.target.value)}
                  placeholder="10"
                />
              </div>
            </div>

            {/* Toggles & Options */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-surface-subtle border border-surface-border rounded-md">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-brand-ink">
                <input
                  type="checkbox"
                  checked={form.is_enabled}
                  onChange={(e) => handleFormChange('is_enabled', e.target.checked)}
                  className="rounded text-brand-green focus:ring-brand-green"
                />
                <span>Campaign Enabled</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-brand-ink">
                <input
                  type="checkbox"
                  checked={form.show_countdown}
                  onChange={(e) => handleFormChange('show_countdown', e.target.checked)}
                  className="rounded text-brand-green focus:ring-brand-green"
                />
                <span>Show Urgency Countdown</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-brand-ink">
                <input
                  type="checkbox"
                  checked={form.allow_coupon_stacking}
                  onChange={(e) => handleFormChange('allow_coupon_stacking', e.target.checked)}
                  className="rounded text-brand-green focus:ring-brand-green"
                />
                <span>Allow Coupon Stacking</span>
              </label>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-brand-ink mb-1">
                Storefront Campaign Description
              </label>
              <textarea
                rows="2"
                value={form.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
                placeholder="Brief description displayed on the homepage sale banner and dedicated sale page..."
                className="w-full bg-white border border-surface-border rounded-sm p-2 text-xs text-brand-ink focus:outline-none focus:border-brand-green"
              />
            </div>

            {/* Live 10-Product Pricing Preview */}
            <div className="border border-surface-border rounded-md overflow-hidden">
              <div className="bg-surface-subtle p-2.5 border-b border-surface-border flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand-ink flex items-center gap-1.5">
                  <Icon name="eye" className="text-brand-green text-xs" />
                  Live Product Pricing Preview (Calculated at Runtime)
                </span>
                <span className="text-[10px] text-ink-muted">Showing up to 25 affected items</span>
              </div>
              {previewProducts.length === 0 ? (
                <div className="p-4 text-center text-xs text-ink-muted">
                  No products matched the current scope criteria.
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-white border-b border-surface-border text-[10px] font-bold uppercase text-ink-muted">
                        <th className="p-2">Product</th>
                        <th className="p-2">Catalog Price</th>
                        <th className="p-2">Live Sale Price</th>
                        <th className="p-2 text-right">Customer Saves</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border font-medium">
                      {previewProducts.map((p) => (
                        <tr key={p.id} className="hover:bg-surface-subtle">
                          <td className="p-2 font-semibold text-brand-ink truncate max-w-[200px]">
                            {p.name}
                          </td>
                          <td className="p-2 text-ink-muted line-through">
                            Rs. {p.original_price?.toLocaleString()}
                          </td>
                          <td className="p-2 font-bold text-brand-green">
                            Rs. {p.sale_price?.toLocaleString()}
                          </td>
                          <td className="p-2 text-right text-red-700 font-bold">
                            Save Rs. {p.discount_amount?.toLocaleString()} ({p.discount_percent}%)
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t border-surface-border">
              <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm">
                {editingEvent ? 'Save Changes' : 'Create Campaign'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ================================================================== */}
      {/* 2. Extend Campaign Modal */}
      {/* ================================================================== */}
      {extendModalOpen && extendingEvent && (
        <Modal
          isOpen={extendModalOpen}
          onClose={() => setExtendModalOpen(false)}
          title={`Extend Campaign: ${extendingEvent.name}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-xs">
            <p className="text-ink-muted">
              Current campaign end time is <strong>{formatDt(extendingEvent.end_at)}</strong>. Select how many hours you want to extend this sale by:
            </p>

            <div className="grid grid-cols-3 gap-2">
              {[
                { h: 24, label: '+24 Hours (1 Day)' },
                { h: 48, label: '+48 Hours (2 Days)' },
                { h: 168, label: '+7 Days (1 Week)' },
              ].map((item) => (
                <button
                  key={item.h}
                  type="button"
                  onClick={() => setExtendHours(item.h)}
                  className={`p-2.5 rounded font-bold text-center border transition-colors ${
                    extendHours === item.h
                      ? 'bg-brand-ink text-white border-brand-ink'
                      : 'bg-white text-brand-ink border-surface-border hover:bg-surface-subtle'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <Input
              label="Or Custom Additional Hours:"
              name="customHours"
              type="number"
              min="1"
              value={extendHours}
              onChange={(e) => setExtendHours(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-4 border-t border-surface-border">
              <Button variant="outline" size="sm" onClick={() => setExtendModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveExtend}>
                Confirm Extension
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ================================================================== */}
      {/* 3. Sales Report Modal */}
      {/* ================================================================== */}
      {reportModalOpen && reportData && (
        <Modal
          isOpen={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          title={`Performance Report: ${reportData.event_name}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-5 text-xs">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-surface-subtle border border-surface-border rounded-md text-center">
                <span className="text-[10px] font-bold uppercase text-ink-muted block mb-1">Total Orders</span>
                <span className="text-xl font-bold text-brand-ink">{reportData.orders_count}</span>
              </div>
              <div className="p-3 bg-surface-subtle border border-surface-border rounded-md text-center">
                <span className="text-[10px] font-bold uppercase text-ink-muted block mb-1">Units Sold</span>
                <span className="text-xl font-bold text-brand-green">{reportData.units_sold}</span>
              </div>
              <div className="p-3 bg-surface-subtle border border-surface-border rounded-md text-center">
                <span className="text-[10px] font-bold uppercase text-ink-muted block mb-1">Gross Revenue</span>
                <span className="text-xl font-bold text-brand-ink">Rs. {Number(reportData.revenue).toLocaleString()}</span>
              </div>
              <div className="p-3 bg-surface-subtle border border-surface-border rounded-md text-center">
                <span className="text-[10px] font-bold uppercase text-ink-muted block mb-1">Discount Given</span>
                <span className="text-xl font-bold text-red-600">Rs. {Number(reportData.total_discount_given).toLocaleString()}</span>
              </div>
            </div>

            {/* Top Products */}
            <div className="border border-surface-border rounded-md overflow-hidden">
              <div className="bg-surface-subtle p-2.5 border-b border-surface-border font-bold uppercase text-brand-ink text-[11px]">
                Top Formulations Sold Under This Campaign
              </div>
              {reportData.top_products?.length === 0 ? (
                <div className="p-4 text-center text-xs text-ink-muted">
                  No orders have been recorded under this campaign yet.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-white border-b border-surface-border text-[10px] font-bold uppercase text-ink-muted">
                      <th className="p-2.5">Product Name</th>
                      <th className="p-2.5 text-center">Units Sold</th>
                      <th className="p-2.5 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border font-medium">
                    {reportData.top_products.map((tp, idx) => (
                      <tr key={idx} className="hover:bg-surface-subtle">
                        <td className="p-2.5 font-bold text-brand-ink">{tp.product_name}</td>
                        <td className="p-2.5 text-center font-bold text-brand-green">{tp.units}</td>
                        <td className="p-2.5 text-right font-bold text-brand-ink">Rs. {Number(tp.line_revenue).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="primary" size="sm" onClick={() => setReportModalOpen(false)}>
                Close Report
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

