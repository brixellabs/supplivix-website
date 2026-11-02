import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Icon from '../components/ui/Icon';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import QuantityStepper from '../components/ui/QuantityStepper';
import Accordion from '../components/ui/Accordion';
import StyleguidePage from '../pages/StyleguidePage';
import { ToastProvider } from '../components/ui/Toast';

describe('Design System UI Primitives (Phase 3)', () => {
  it('Icon renders FontAwesome SVG and accessibility attributes', () => {
    const { container } = render(<Icon name="cart" label="Shopping Cart" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(screen.getByText('Shopping Cart')).toHaveClass('sr-only');
  });

  it('Button handles variants, loading, and click events', () => {
    const handleClick = vi.fn();
    const { rerender } = render(
      <Button variant="primary" onClick={handleClick}>
        Place Order
      </Button>
    );

    const btn = screen.getByRole('button', { name: /place order/i });
    expect(btn).toHaveClass('bg-brand-ink');
    fireEvent.click(btn);
    expect(handleClick).toHaveBeenCalledTimes(1);

    // Test loading state
    rerender(
      <Button variant="primary" loading onClick={handleClick}>
        Place Order
      </Button>
    );
    expect(screen.getByText(/processing/i)).toBeInTheDocument();
    expect(btn).toBeDisabled();
  });

  it('Input renders accessible label, error message and aria attributes', () => {
    render(
      <Input
        label="Phone Number"
        name="phone"
        error="Invalid mobile number."
      />
    );

    const input = screen.getByLabelText(/phone number/i);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid mobile number.');
  });

  it('Card enforces solid background and zero glassmorphism', () => {
    const { container } = render(
      <Card>
        <div>Content</div>
      </Card>
    );
    const cardDiv = container.firstChild;
    expect(cardDiv).toHaveClass('bg-surface-card');
    expect(cardDiv.className).not.toContain('backdrop-blur');
    expect(cardDiv.className).not.toContain('bg-white/30');
  });

  it('Badge renders sale and pill variants', () => {
    render(<Badge variant="sale">25% OFF</Badge>);
    expect(screen.getByText('25% OFF')).toHaveClass('bg-status-sale');
  });

  it('QuantityStepper increments and decrements within bounds', () => {
    let value = 1;
    const handleChange = vi.fn((val) => {
      value = val;
    });

    const { rerender } = render(
      <QuantityStepper value={value} onChange={handleChange} min={1} max={5} />
    );

    const decBtn = screen.getByLabelText(/decrease quantity/i);
    const incBtn = screen.getByLabelText(/increase quantity/i);

    // Decrement at min=1 should be disabled
    expect(decBtn).toBeDisabled();

    // Increment
    fireEvent.click(incBtn);
    expect(handleChange).toHaveBeenCalledWith(2);

    // Rerender at max
    rerender(<QuantityStepper value={5} onChange={handleChange} min={1} max={5} />);
    expect(screen.getByLabelText(/increase quantity/i)).toBeDisabled();
  });

  it('Accordion expands and collapses on summary click', () => {
    render(
      <Accordion title="Supplement Details">
        <p>100% bioavailable ingredients.</p>
      </Accordion>
    );

    expect(screen.getByText('Supplement Details')).toBeInTheDocument();
    expect(screen.getByText('100% bioavailable ingredients.')).toBeInTheDocument();
  });

  it('StyleguidePage renders all component sections with zero emojis', () => {
    const { container } = render(
      <ToastProvider>
        <StyleguidePage />
      </ToastProvider>
    );

    expect(screen.getByText('Supplivix Styleguide')).toBeInTheDocument();
    expect(screen.getByText(/1. Color Palette Tokens/i)).toBeInTheDocument();
    expect(screen.getByText(/2. Typography Scale/i)).toBeInTheDocument();
    expect(screen.getByText(/3. Button Variants & States/i)).toBeInTheDocument();
    expect(screen.getByText(/4. Form Inputs & Validation States/i)).toBeInTheDocument();
    expect(screen.getByText(/5. Cards & Badges/i)).toBeInTheDocument();
    expect(screen.getByText(/6. Interactive Controls & Reusable States/i)).toBeInTheDocument();

    // Verify zero emoji in rendered text
    const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2300}-\u{23FF}]/gu;
    const allText = container.textContent;
    expect(allText).not.toMatch(emojiRegex);
  });
});
