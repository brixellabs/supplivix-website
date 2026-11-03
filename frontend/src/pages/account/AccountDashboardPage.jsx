import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import SEOHead from '../../components/seo/SEOHead';
import Breadcrumbs from '../../components/layout/Breadcrumbs';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Icon from '../../components/ui/Icon';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { api } from '../../services/api';

const STATUS_VARIANTS = {
  pending: 'sale',
  confirmed: 'pill',
  processing: 'pill',
  shipped: 'default',
  delivered: 'pill',
  cancelled: 'default',
};

export default function AccountDashboardPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  // Cancellation modal state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedOrderToCancel, setSelectedOrderToCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  // Change password form
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/account' } } });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const loadOrders = async () => {
    setOrdersLoading(true);
    try {
      const data = await api.getOrders();
      if (Array.isArray(data)) {
        setOrders(data);
      } else if (data && data.results) {
        setOrders(data.results);
      }
    } catch {
      // User may have no orders yet
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadOrders();
    }
  }, [isAuthenticated]);

  const handleConfirmCancel = async () => {
    if (!selectedOrderToCancel) return;
    setCancelling(true);
    try {
      await api.cancelOrder(selectedOrderToCancel.order_number);
      showToast(`Order ${selectedOrderToCancel.order_number} has been cancelled.`);
      setCancelModalOpen(false);
      setSelectedOrderToCancel(null);
      loadOrders();
    } catch (err) {
      showToast(err.message || 'Unable to cancel order', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError('');

    if (!oldPassword || !newPassword) {
      setPwError('Please fill in all password fields.');
      return;
    }
    if (newPassword.length < 8) {
      setPwError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match.');
      return;
    }

    setPwLoading(true);
    try {
      await api.changePassword({ old_password: oldPassword, new_password: newPassword });
      showToast('Password changed successfully.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPwError(err.message || 'Could not change password.');
    } finally {
      setPwLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    showToast('You have been signed out.');
    navigate('/');
  };

  if (authLoading || !user) {
    return (
      <div className="bg-white min-h-[60vh] flex items-center justify-center">
        <Icon name="spinner" spin className="text-2xl text-brand-green" />
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      <SEOHead title="My Account | Supplivix" noindex={true} />
      <Breadcrumbs items={[{ label: 'My Account', href: '/account' }]} />

      <div className="max-w-site mx-auto px-4 sm:px-6 py-8">
        {/* Welcome Top Banner */}
        <div className="bg-surface-subtle border border-surface-border rounded-lg p-6 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-card">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-brand-green">
              Account Overview
            </span>
            <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-brand-ink">
              Welcome, {user.first_name || 'Valued Customer'}
            </h1>
            <p className="text-xs text-ink-muted mt-0.5">
              {user.email} • {user.phone || 'No phone registered'}
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="self-start sm:self-auto text-xs"
          >
            Sign Out
          </Button>
        </div>

        {/* 2-Column Dashboard: Tabs & View */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Navigation Sidebar */}
          <aside className="lg:col-span-3">
            <div className="bg-surface-subtle border border-surface-border rounded-lg p-3 space-y-1 shadow-card">
              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className={`w-full text-left px-4 py-2.5 rounded-sm text-xs font-semibold flex items-center gap-3 transition-colors ${
                  activeTab === 'orders'
                    ? 'bg-brand-ink text-white'
                    : 'text-ink-muted hover:bg-white hover:text-brand-ink'
                }`}
              >
                <Icon name="box" className="text-sm" />
                <span>My Orders ({orders.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('security')}
                className={`w-full text-left px-4 py-2.5 rounded-sm text-xs font-semibold flex items-center gap-3 transition-colors ${
                  activeTab === 'security'
                    ? 'bg-brand-ink text-white'
                    : 'text-ink-muted hover:bg-white hover:text-brand-ink'
                }`}
              >
                <Icon name="lock" className="text-sm" />
                <span>Security & Password</span>
              </button>
            </div>
          </aside>

          {/* Main Tab View */}
          <section className="lg:col-span-9">
            {activeTab === 'orders' && (
              <div className="space-y-4">
                <h2 className="text-base font-bold uppercase tracking-wider text-brand-ink mb-4">
                  Order History (Cash on Delivery)
                </h2>

                {ordersLoading ? (
                  <div className="p-8 text-center text-xs text-ink-muted">
                    <Icon name="spinner" spin className="text-xl text-brand-green mb-2" />
                    <div>Loading your orders...</div>
                  </div>
                ) : orders.length === 0 ? (
                  <EmptyState
                    icon="box"
                    title="No Orders Yet"
                    description="You haven't placed any Cash on Delivery orders yet. Explore our multivitamins and skincare range!"
                    actionLabel="Start Shopping"
                    onAction={() => navigate('/shop')}
                  />
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => {
                      const canCancel = order.status === 'pending' || order.status === 'confirmed';
                      return (
                        <div
                          key={order.id}
                          className="bg-surface-subtle border border-surface-border rounded-lg p-5 shadow-card"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-surface-border gap-2">
                            <div>
                              <span className="font-bold text-sm text-brand-ink block">
                                Order #{order.order_number}
                              </span>
                              <span className="text-[11px] text-ink-muted">
                                Placed on {new Date(order.created_at).toLocaleDateString()}
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              <Badge variant={STATUS_VARIANTS[order.status] || 'default'}>
                                {order.status.toUpperCase()}
                              </Badge>
                              <span className="text-xs font-bold text-brand-green">
                                COD: Rs. {Number(order.grand_total).toLocaleString()}
                              </span>
                            </div>
                          </div>

                          <div className="py-3 text-xs text-ink-muted leading-relaxed">
                            <span className="font-semibold text-brand-ink">Delivery To: </span>
                            {order.recipient_name}, {order.street_address}, {order.city} ({order.phone})
                          </div>

                          <div className="pt-3 border-t border-surface-border flex items-center justify-between gap-3 flex-wrap">
                            <Link
                              to={`/track?number=${order.order_number}&phone=${encodeURIComponent(order.phone)}`}
                              className="text-xs font-semibold text-brand-green hover:underline flex items-center gap-1"
                            >
                              <Icon name="truck" className="text-xs" />
                              <span>Live Status Timeline</span>
                            </Link>

                            {canCancel && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedOrderToCancel(order);
                                  setCancelModalOpen(true);
                                }}
                                className="text-xs text-red-600 border-red-300 hover:bg-red-50"
                              >
                                Cancel Order
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'security' && (
              <div className="bg-surface-subtle border border-surface-border rounded-lg p-6 shadow-card max-w-lg">
                <h2 className="text-base font-bold uppercase tracking-wider text-brand-ink mb-2">
                  Change Password
                </h2>
                <p className="text-xs text-ink-muted mb-6">
                  Keep your account secure with a strong password.
                </p>

                {pwError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-xs text-red-700 rounded-sm font-medium">
                    {pwError}
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-4" noValidate>
                  <Input
                    label="Current Password"
                    name="oldPassword"
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                  />

                  <Input
                    label="New Password (min 8 chars)"
                    name="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />

                  <Input
                    label="Confirm New Password"
                    name="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    loading={pwLoading}
                    className="w-full h-[42px]"
                  >
                    Update Password
                  </Button>
                </form>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Confirmation Modal for Order Cancellation */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancel Order Confirmation"
      >
        <div className="space-y-4 text-xs text-brand-ink">
          <p>
            Are you sure you want to cancel order <strong>#{selectedOrderToCancel?.order_number}</strong>?
          </p>
          <p className="text-ink-muted">
            Reserved inventory items will be restored to our stock and any applied discount coupons will be released.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-surface-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCancelModalOpen(false)}
            >
              Keep Order
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={cancelling}
              onClick={handleConfirmCancel}
            >
              Confirm Cancellation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
