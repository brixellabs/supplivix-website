import React, { useState } from 'react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Checkbox from '../components/ui/Checkbox';
import Radio from '../components/ui/Radio';
import Tabs from '../components/ui/Tabs';
import Pagination from '../components/ui/Pagination';
import Table from '../components/ui/Table';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import QuantityStepper from '../components/ui/QuantityStepper';
import Skeleton from '../components/ui/Skeleton';
import Accordion from '../components/ui/Accordion';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import Modal from '../components/ui/Modal';
import Icon from '../components/ui/Icon';
import ProductIllustration from '../components/ui/ProductIllustration';
import Breadcrumbs from '../components/layout/Breadcrumbs';
import { useToast } from '../components/ui/Toast';

export default function StyleguidePage() {
  const { showToast } = useToast();
  const [stepperVal, setStepperVal] = useState(2);
  const [modalOpen, setModalOpen] = useState(false);
  const [sampleInput, setSampleInput] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [currentPage, setCurrentPage] = useState(1);
  const [agreedTerms, setAgreedTerms] = useState(true);
  const [paymentOption, setPaymentOption] = useState('cod');
  const [selectedCity, setSelectedCity] = useState('lahore');

  return (
    <div className="min-h-screen bg-white text-brand-ink py-10 px-4 sm:px-6 md:px-8 max-w-site mx-auto">
      {/* Hidden from search engines */}
      <meta name="robots" content="noindex, nofollow" />

      {/* Header */}
      <div className="border-b border-surface-border pb-6 mb-8">
        <Badge variant="pill" className="mb-3">Design System · WCAG 2.1 AA</Badge>
        <h1 className="text-3xl md:text-4xl font-bold uppercase tracking-tight text-brand-ink">
          Supplivix Styleguide
        </h1>
        <p className="text-sm text-ink-muted mt-2">
          Living component specification and design tokens replicated from reference index.html.
          Zero emojis, zero glassmorphism, 100% solid surfaces and self-hosted FontAwesome SVG icons.
        </p>
      </div>

      {/* Navigation Breadcrumbs Demo */}
      <div className="mb-10 p-4 border border-surface-border rounded-md bg-surface-subtle">
        <span className="text-xs font-bold uppercase tracking-wider text-ink-muted block mb-2">Breadcrumb Navigation</span>
        <Breadcrumbs
          items={[
            { label: 'Shop', href: '/shop' },
            { label: 'Multivitamins Hub', href: '/multivitamins' },
            { label: 'Vitamax Men Multivitamin' },
          ]}
        />
      </div>

      {/* 1. Color Tokens Palette */}
      <section className="mb-12">
        <h2 className="text-xl font-bold uppercase tracking-wide border-b border-surface-border pb-2 mb-6">
          1. Color Palette Tokens
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="border border-surface-border p-3 rounded-md">
            <div className="h-14 rounded-sm bg-brand-ink mb-2"></div>
            <div className="text-xs font-bold">brand-ink</div>
            <div className="text-[11px] text-ink-muted">#232323</div>
          </div>
          <div className="border border-surface-border p-3 rounded-md">
            <div className="h-14 rounded-sm bg-brand-green mb-2"></div>
            <div className="text-xs font-bold text-brand-green">brand-green</div>
            <div className="text-[11px] text-ink-muted">#016a38</div>
          </div>
          <div className="border border-surface-border p-3 rounded-md">
            <div className="h-14 rounded-sm bg-brand-lime mb-2"></div>
            <div className="text-xs font-bold">brand-lime</div>
            <div className="text-[11px] text-ink-muted">#b497ed</div>
          </div>
          <div className="border border-surface-border p-3 rounded-md">
            <div className="h-14 rounded-sm bg-brand-lavender mb-2"></div>
            <div className="text-xs font-bold text-brand-purple">brand-lavender</div>
            <div className="text-[11px] text-ink-muted">#e1d6f9</div>
          </div>
          <div className="border border-surface-border p-3 rounded-md">
            <div className="h-14 rounded-sm bg-status-sale mb-2"></div>
            <div className="text-xs font-bold text-status-sale">status-sale</div>
            <div className="text-[11px] text-ink-muted">#e95144</div>
          </div>
          <div className="border border-surface-border p-3 rounded-md">
            <div className="h-14 rounded-sm bg-surface-subtle border border-surface-border mb-2"></div>
            <div className="text-xs font-bold">surface-subtle</div>
            <div className="text-[11px] text-ink-muted">#f8f8f8</div>
          </div>
        </div>
      </section>

      {/* 2. Typography Scale */}
      <section className="mb-12">
        <h2 className="text-xl font-bold uppercase tracking-wide border-b border-surface-border pb-2 mb-6">
          2. Typography Scale (Self-Hosted Poppins)
        </h2>
        <div className="space-y-4">
          <div>
            <span className="text-xs font-semibold text-ink-muted uppercase">Display / H1 (36px+)</span>
            <h1 className="text-3xl md:text-4xl font-bold text-brand-ink leading-tight">
              Daily vitamins for a <span className="text-brand-green">healthier, glowing</span> you
            </h1>
          </div>
          <div>
            <span className="text-xs font-semibold text-ink-muted uppercase">H2 (24px uppercase)</span>
            <h2 className="text-2xl font-bold uppercase tracking-wide text-brand-ink">
              Natural Choice for Your Health
            </h2>
          </div>
          <div>
            <span className="text-xs font-semibold text-ink-muted uppercase">H3 (18px)</span>
            <h3 className="text-lg font-semibold text-brand-ink">
              Vitamax Men Multivitamin & Multimineral
            </h3>
          </div>
          <div>
            <span className="text-xs font-semibold text-ink-muted uppercase">Body Regular (14px)</span>
            <p className="text-sm text-ink-muted max-w-2xl leading-relaxed">
              Carefully formulated with 25 essential bioavailable nutrients designed to support natural energy metabolism, immune defense, and vitality across daily routines.
            </p>
          </div>
          <div>
            <span className="text-xs font-semibold text-ink-muted uppercase">Regulatory Disclaimer (Mandatory)</span>
            <p className="text-xs text-ink-muted border-l-2 border-brand-green pl-3 py-1">
              These statements have not been evaluated by a regulator. This product is not intended to diagnose, treat, cure or prevent any disease.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Button Component States */}
      <section className="mb-12">
        <h2 className="text-xl font-bold uppercase tracking-wide border-b border-surface-border pb-2 mb-6">
          3. Button Variants & States
        </h2>
        <div className="flex flex-wrap gap-4 items-center mb-4">
          <Button variant="primary">Primary Button</Button>
          <Button variant="outline">Outline Button</Button>
          <Button variant="secondary">Secondary Lime</Button>
          <Button variant="danger">Danger Action</Button>
          <Button variant="primary" loading>Loading</Button>
          <Button variant="primary" disabled>Disabled</Button>
          <Button variant="outline" icon="cart" iconPosition="left">Add to Cart</Button>
          <Button variant="primary" size="sm">Small</Button>
          <Button variant="primary" size="lg">Large Hero</Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => showToast('Test notification triggered!')}
          >
            Show Toast
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setModalOpen(true)}
          >
            Open Modal
          </Button>
        </div>
      </section>

      {/* 4. Form Inputs & Select / Checkbox / Radio */}
      <section className="mb-12">
        <h2 className="text-xl font-bold uppercase tracking-wide border-b border-surface-border pb-2 mb-6">
          4. Form Inputs & Validation States
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-surface-subtle p-6 rounded-lg border border-surface-border">
          <Input
            label="Full Name"
            name="fullName"
            placeholder="Muhammad Ali"
            required
            value={sampleInput}
            onChange={(e) => setSampleInput(e.target.value)}
            helperText="Enter your official delivery name."
          />
          <Input
            label="Phone Number"
            name="phone"
            placeholder="0300-1234567"
            required
            error="Please enter a valid Pakistani mobile number (03XXXXXXXXX)."
          />
          <Select
            label="Delivery City"
            name="citySelect"
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            options={[
              { value: 'lahore', label: 'Lahore (Punjab)' },
              { value: 'karachi', label: 'Karachi (Sindh)' },
              { value: 'islamabad', label: 'Islamabad (Capital)' },
              { value: 'faisalabad', label: 'Faisalabad (Punjab)' },
            ]}
            helperText="Nationwide delivery available."
          />
          <Input
            label="Disabled Field"
            name="disabledField"
            value="Cash on Delivery (Fixed)"
            disabled
            helperText="Pre-configured setting."
          />
          <div className="flex flex-col gap-2 pt-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-ink">Terms Agreement</span>
            <Checkbox
              label="I accept terms and COD conditions"
              id="sg-terms-check"
              name="terms"
              checked={agreedTerms}
              onChange={(e) => setAgreedTerms(e.target.checked)}
              helperText="Required for final order dispatch."
            />
          </div>
          <div className="flex flex-col gap-2 pt-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-ink">Payment Method</span>
            <Radio
              label="Cash on Delivery (COD)"
              id="sg-radio-cod"
              name="payment"
              value="cod"
              checked={paymentOption === 'cod'}
              onChange={() => setPaymentOption('cod')}
            />
            <p className="text-xs text-ink-muted">Cash on Delivery is the sole payment method.</p>
          </div>
        </div>
      </section>

      {/* 5. Product Cards and Badges */}
      <section className="mb-12">
        <h2 className="text-xl font-bold uppercase tracking-wide border-b border-surface-border pb-2 mb-6">
          5. Cards & Badges
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          <Card className="flex flex-col">
            <div className="relative bg-surface-accent p-6 m-1.5 rounded-sm flex items-center justify-center">
              <span className="absolute top-2 left-2">
                <Badge variant="default" size="xs">Best Seller</Badge>
              </span>
              <ProductIllustration type="bottle" color="#2e8b1f" name="Vitamax Men" className="h-44" />
            </div>
            <div className="p-4 flex flex-col flex-1">
              <h3 className="font-semibold text-sm text-brand-ink mb-1">Vitamax Men Multivitamin</h3>
              <div className="flex items-center gap-1 text-brand-ink text-xs mb-2">
                <Icon name="star" className="text-yellow-500 text-[11px]" />
                <span className="font-bold">5.0</span>
                <span className="text-ink-muted">(312 reviews)</span>
              </div>
              <div className="mt-auto pt-2 flex items-center justify-between">
                <div>
                  <span className="text-xs text-ink-muted line-through mr-1.5">Rs. 1,750</span>
                  <span className="font-bold text-sm text-status-sale">Rs. 1,450</span>
                </div>
                <Button variant="outline" size="sm" icon="cart" />
              </div>
            </div>
          </Card>

          <Card className="flex flex-col">
            <div className="relative bg-surface-accent p-6 m-1.5 rounded-sm flex items-center justify-center">
              <span className="absolute top-2 left-2">
                <Badge variant="sale" size="xs">Sale</Badge>
              </span>
              <ProductIllustration type="serum" color="#f08a24" name="Vitamin C Glow" className="h-44" />
            </div>
            <div className="p-4 flex flex-col flex-1">
              <h3 className="font-semibold text-sm text-brand-ink mb-1">Vitamin C Glow Serum</h3>
              <div className="flex items-center gap-1 text-brand-ink text-xs mb-2">
                <Icon name="star" className="text-yellow-500 text-[11px]" />
                <span className="font-bold">4.9</span>
                <span className="text-ink-muted">(93 reviews)</span>
              </div>
              <div className="mt-auto pt-2 flex items-center justify-between">
                <div>
                  <span className="text-xs text-ink-muted line-through mr-1.5">Rs. 1,990</span>
                  <span className="font-bold text-sm text-status-sale">Rs. 1,690</span>
                </div>
                <Button variant="outline" size="sm" icon="cart" />
              </div>
            </div>
          </Card>

          <Card className="flex flex-col">
            <div className="relative bg-surface-accent p-6 m-1.5 rounded-sm flex items-center justify-center">
              <span className="absolute top-2 left-2">
                <Badge variant="pill" size="xs">New</Badge>
              </span>
              <ProductIllustration type="jar" color="#3d9a2a" name="Hydra Moisturizer" className="h-44" />
            </div>
            <div className="p-4 flex flex-col flex-1">
              <h3 className="font-semibold text-sm text-brand-ink mb-1">Hydra Glow Moisturizer</h3>
              <div className="flex items-center gap-1 text-brand-ink text-xs mb-2">
                <Icon name="star" className="text-yellow-500 text-[11px]" />
                <span className="font-bold">4.8</span>
                <span className="text-ink-muted">(41 reviews)</span>
              </div>
              <div className="mt-auto pt-2 flex items-center justify-between">
                <div>
                  <span className="font-bold text-sm text-brand-ink">Rs. 1,490</span>
                </div>
                <Button variant="outline" size="sm" icon="cart" />
              </div>
            </div>
          </Card>

          <Card className="flex flex-col">
            <div className="relative bg-surface-accent p-6 m-1.5 rounded-sm flex items-center justify-center">
              <ProductIllustration type="tube" color="#e8b400" name="Daily Shield SPF" className="h-44" />
            </div>
            <div className="p-4 flex flex-col flex-1">
              <h3 className="font-semibold text-sm text-brand-ink mb-1">Daily Shield SPF 50</h3>
              <div className="flex items-center gap-1 text-brand-ink text-xs mb-2">
                <Icon name="star" className="text-yellow-500 text-[11px]" />
                <span className="font-bold">5.0</span>
                <span className="text-ink-muted">(75 reviews)</span>
              </div>
              <div className="mt-auto pt-2 flex items-center justify-between">
                <div>
                  <span className="font-bold text-sm text-brand-ink">Rs. 1,390</span>
                </div>
                <Button variant="outline" size="sm" icon="cart" />
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* 6. Stepper, Tabs & Accordion */}
      <section className="mb-12">
        <h2 className="text-xl font-bold uppercase tracking-wide border-b border-surface-border pb-2 mb-6">
          6. Interactive Controls & Tabs
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-sm font-bold uppercase text-ink-muted mb-3">Tabs Component</h3>
            <Tabs
              tabs={[
                { id: 'overview', label: 'Overview', count: 12 },
                { id: 'facts', label: 'Supplement Facts' },
                { id: 'reviews', label: 'Reviews', count: 312 },
              ]}
              activeTab={activeTab}
              onChange={setActiveTab}
              className="mb-4"
            />
            <div className="p-4 bg-surface-subtle border border-surface-border rounded-sm text-xs text-brand-ink">
              Active Tab Content: <span className="font-bold uppercase text-brand-green">{activeTab}</span>
            </div>

            <h3 className="text-sm font-bold uppercase text-ink-muted mt-6 mb-3">Quantity Stepper</h3>
            <div className="flex items-center gap-4 mb-6">
              <QuantityStepper value={stepperVal} onChange={setStepperVal} min={1} max={10} />
              <span className="text-xs text-ink-muted">Selected Quantity: {stepperVal}</span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase text-ink-muted mb-3">Accordion</h3>
            <div className="space-y-3">
              <Accordion title="Suggested Usage Directions" defaultOpen>
                Take 1 tablet daily after your largest meal with a glass of water, or as advised by your qualified healthcare professional.
              </Accordion>
              <Accordion title="Cash on Delivery (COD) Information">
                Cash on Delivery is the sole payment method supported. Hand the exact order total in Pakistani Rupees to the delivery courier upon arrival.
              </Accordion>
            </div>

            <h3 className="text-sm font-bold uppercase text-ink-muted mt-6 mb-3">Loading Skeletons (Solid Grey Blocks, No Shimmer)</h3>
            <div className="space-y-3 p-4 border border-surface-border rounded-lg bg-surface-subtle">
              <Skeleton width="40%" height="22px" />
              <Skeleton width="90%" height="16px" />
              <Skeleton width="75%" height="16px" />
              <div className="flex gap-3 pt-2">
                <Skeleton width="120px" height="38px" />
                <Skeleton width="120px" height="38px" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Reusable States, Data Table & Pagination */}
      <section className="mb-12">
        <h2 className="text-xl font-bold uppercase tracking-wide border-b border-surface-border pb-2 mb-6">
          7. Empty & Error States, Table & Pagination
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <EmptyState
            title="Your Cart is Empty"
            description="Explore our range of daily multivitamins and supplements to get started."
            actionLabel="Continue Shopping"
            onAction={() => showToast('Navigating to shop...')}
          />
          <ErrorState
            title="Unable to Load Products"
            description="Network request failed while contacting the server. Check your connection and retry."
            onRetry={() => showToast('Retrying network request...')}
          />
        </div>

        <h3 className="text-sm font-bold uppercase text-ink-muted mb-3">Responsive Data Table</h3>
        <Table headers={['Product Name', 'Category', 'Price (PKR)', 'Status', 'Actions']}>
          <tr>
            <td className="px-4 py-3 font-semibold">Vitamax Men Multivitamin</td>
            <td className="px-4 py-3 text-ink-muted">Daily Multivitamins</td>
            <td className="px-4 py-3 font-bold text-brand-green">Rs. 1,450</td>
            <td className="px-4 py-3"><Badge variant="default" size="xs">In Stock</Badge></td>
            <td className="px-4 py-3"><Button variant="outline" size="sm">Details</Button></td>
          </tr>
          <tr>
            <td className="px-4 py-3 font-semibold">Vitamin C Glow Serum</td>
            <td className="px-4 py-3 text-ink-muted">Skincare Serums</td>
            <td className="px-4 py-3 font-bold text-brand-green">Rs. 1,690</td>
            <td className="px-4 py-3"><Badge variant="sale" size="xs">Sale</Badge></td>
            <td className="px-4 py-3"><Button variant="outline" size="sm">Details</Button></td>
          </tr>
        </Table>

        <Pagination
          currentPage={currentPage}
          totalPages={5}
          onPageChange={setCurrentPage}
          className="mt-6"
        />
      </section>

      {/* Confirmation Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Confirm Order Cancellation"
        confirmLabel="Yes, Cancel Order"
        onConfirm={() => {
          setModalOpen(false);
          showToast('Order cancelled successfully.');
        }}
        isDestructive
      >
        Are you sure you want to cancel Order #SPLV-4091-8821? This action will restore product inventory and release your applied promotional coupon.
      </Modal>
    </div>
  );
}
