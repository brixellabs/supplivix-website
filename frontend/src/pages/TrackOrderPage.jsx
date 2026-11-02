import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Breadcrumbs from '../components/layout/Breadcrumbs';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import Badge from '../components/ui/Badge';
import { api } from '../services/api';

const ORDER_STEPS = [
  { key: 'pending', label: 'Order Placed', desc: 'Received & awaiting review' },
  { key: 'confirmed', label: 'Confirmed', desc: 'Order details verified' },
  { key: 'processing', label: 'Packed', desc: 'Assembled in warehouse' },
  { key: 'shipped', label: 'Dispatched', desc: 'Handed over to courier' },
  { key: 'delivered', label: 'Delivered', desc: 'Cash collected at doorstep' },
];

export default function TrackOrderPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlNumber = searchParams.get('number') || '';
  const urlPhone = searchParams.get('phone') || '';

  const [orderNumber, setOrderNumber] = useState(urlNumber);
  const [phone, setPhone] = useState(urlPhone);
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  const executeTrack = useCallback(async (num, ph) => {
    if (!num.trim() || !ph.trim()) return;

    setLoading(true);
    setError('');
    setOrder(null);
    try {
      const data = await api.trackOrder(num.trim(), ph.trim());
      setOrder(data);
    } catch (err) {
      setError(
        err.message || 'No order found matching this Order Number and Mobile Number. Please verify and try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (urlNumber && urlPhone) {
      executeTrack(urlNumber, urlPhone);
    }
  }, [urlNumber, urlPhone, executeTrack]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!orderNumber.trim() || !phone.trim()) {
      setError('Please provide both Order Number and Mobile Number.');
      return;
    }
    setSearchParams({ number: orderNumber.trim(), phone: phone.trim() });
    executeTrack(orderNumber, phone);
  };

  const getStepStatus = (stepKey, currentStatus) => {
    if (currentStatus === 'cancelled') return 'cancelled';
    const stepOrder = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
    const currentIndex = stepOrder.indexOf(currentStatus);
    const targetIndex = stepOrder.indexOf(stepKey);

    if (targetIndex < currentIndex) return 'completed';
    if (targetIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  return (
    <div className="bg-white min-h-screen pb-16">
      <Breadcrumbs items={[{ label: 'Track Order', href: '/track' }]} />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <div className="text-center mb-8">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-green">
            Order Status
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-brand-ink mt-1">
            Track Your Delivery
          </h1>
          <p className="text-xs text-ink-muted mt-2">
            Enter your order reference code and checkout phone number
          </p>
        </div>

        {/* Lookup Card */}
        <div className="bg-surface-subtle border border-surface-border rounded-lg p-6 sm:p-8 shadow-card mb-8">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              label="Order Number"
              name="orderNumber"
              placeholder="e.g. SPLV-26-98124"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              required
            />

            <Input
              label="Mobile Number (Used at Checkout)"
              name="phone"
              type="tel"
              placeholder="03XXXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-sm text-xs text-red-700 font-medium">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              className="w-full h-[44px]"
            >
              Track Order
            </Button>
          </form>
        </div>

        {/* Tracking Results Card */}
        {order && (
          <div className="bg-white border border-surface-border rounded-lg p-6 sm:p-8 shadow-card space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-surface-border gap-2">
              <div>
                <span className="text-xs font-bold text-ink-muted block uppercase tracking-wider">
                  Order Reference
                </span>
                <span className="text-xl font-bold text-brand-ink">
                  #{order.order_number}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={order.status === 'cancelled' ? 'default' : 'pill'}>
                  {order.status.toUpperCase()}
                </Badge>
              </div>
            </div>

            {/* Stepper Timeline */}
            {order.status === 'cancelled' ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 font-medium text-center">
                This order was cancelled. Please contact customer support if you have questions.
              </div>
            ) : (
              <div className="py-4">
                <div className="space-y-6 sm:space-y-0 sm:grid sm:grid-cols-5 relative">
                  {ORDER_STEPS.map((step) => {
                    const status = getStepStatus(step.key, order.status);
                    return (
                      <div key={step.key} className="flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                            status === 'completed'
                              ? 'bg-brand-green text-white'
                              : status === 'current'
                              ? 'bg-brand-ink text-white ring-4 ring-gray-100'
                              : 'bg-surface-subtle border border-surface-border text-ink-muted'
                          }`}
                        >
                          {status === 'completed' ? (
                            <Icon name="check" className="text-xs" />
                          ) : (
                            <Icon name="capsules" className="text-xs" />
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-brand-ink">{step.label}</div>
                          <div className="text-[10px] text-ink-muted">{step.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Order Info Grid */}
            <div className="bg-surface-subtle border border-surface-border rounded-md p-4 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-ink-muted">Payment Type:</span>
                <span className="font-bold text-brand-green">Cash on Delivery (COD)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Total Payable Amount:</span>
                <span className="font-bold text-brand-ink text-sm">
                  Rs. {Number(order.grand_total).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Recipient Name:</span>
                <span className="font-semibold text-brand-ink">{order.recipient_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Delivery Address:</span>
                <span className="font-medium text-brand-ink text-right">
                  {order.street_address}, {order.city}
                </span>
              </div>
            </div>

            {/* Assistance link */}
            <div className="pt-2 text-center text-xs text-ink-muted">
              Have questions regarding delivery timing?{' '}
              <a
                href="https://wa.me/923000000000"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-green font-bold hover:underline inline-flex items-center gap-1"
              >
                <Icon name="whatsapp" />
                <span>Chat with WhatsApp Support</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
