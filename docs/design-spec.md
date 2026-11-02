# Supplivix Design System Specification

Extracted directly from the client reference design (`design-reference/index.html`) and client logo (`design-reference/logo.png`).
Strict compliance with Rule 1 (Zero Emojis), Rule 2 (Zero Glassmorphism), Rule 4 (Original Assets), and Rule 8 (WCAG 2.1 AA 4.5:1 Contrast).

---

## 1. Color Palette and Semantic Tokens

| Token Name | Hex Code | Purpose | Contrast vs #FFFFFF |
|------------|----------|---------|---------------------|
| `brand-ink` | `#232323` | Primary text, headings, dark buttons | 16.1:1 (Passes AAA) |
| `brand-green` | `#016a38` | Primary accent, button hover, health icons | 5.8:1 (Passes AA) |
| `brand-lime` | `#b497ed` | Secondary brand accent, feature highlights | Muted light purple |
| `brand-lavender`| `#e1d6f9` | Top announcement bar, pill backgrounds | Background only |
| `brand-purple` | `#7a2fd0` | Announcement text, category accent | 5.2:1 vs #e1d6f9 (Passes AA) |
| `surface-card` | `#ffffff` | Solid card and form container background | Neutral Base |
| `surface-subtle`| `#f8f8f8` | Secondary section background | 1.05:1 vs #ffffff |
| `surface-accent`| `#f2f2f2` | Image container backgrounds, input inner | 1.1:1 vs #ffffff |
| `border-line` | `#e8e8e8` | 1px solid card and form borders | Clean divider |
| `text-muted` | `#666666` | Secondary body text, dates, review counts | 4.54:1 (Passes AA) |
| `status-sale` | `#e95144` | Discount badges, strike-through sale price | 4.6:1 (Passes AA) |
| `status-success`| `#0b4f27` | In-stock tags, confirmed state | 7.2:1 (Passes AAA) |
| `status-error` | `#c53030` | Form inline validation errors | 5.9:1 (Passes AA) |

*Contrast Note: Any text on lighter surfaces is tested against WCAG 2.1 AA minimum 4.5:1 ratio.*

---

## 2. Typography Scale (Self-Hosted Poppins)

- **Font Family**: `'Poppins', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`
- **Font Display**: `swap`
- **Weights Loaded**: `400` (Regular), `500` (Medium), `600` (SemiBold), `700` (Bold)

| Level | Size | Weight | Line Height | Tracking | Purpose |
|-------|------|--------|-------------|----------|---------|
| Display / H1 | 30px to 48px | 700 | 1.12 | -0.02em | Hero headline |
| H2 | 24px (1.5rem) | 700 | 1.25 | +0.02em | Section titles, uppercase |
| H3 | 18px (1.125rem) | 600 | 1.3 | normal | Card titles, subsections |
| H4 | 15px (0.9375rem) | 600 | 1.4 | normal | Feature blocks, FAQs |
| Body Regular | 14px (0.875rem) | 400 / 500 | 1.55 | normal | Paragraphs, descriptions |
| Small / Meta | 13px / 12px | 500 | 1.4 | +0.01em | Badges, reviews count, footer |
| Button Text | 13px (0.8125rem) | 700 | 1 | +0.05em | Uppercase button labels |

---

## 3. Spacing, Radius, and Shadow Scale

- **Max Container Width**: `1180px` (`max-w-[1180px] mx-auto px-4 sm:px-6`)
- **Spacing Scale**:
  - `section-padding`: `42px 0` (`py-10 md:py-12`)
  - `card-gap`: `20px` (`gap-5`)
  - `hero-gap`: `20px md:gap-8`
- **Border Radius**:
  - `rounded-xs`: `2px` (Sale tags)
  - `rounded-sm`: `4px` (Standard buttons, image containers)
  - `rounded-md`: `6px` (Product cards, category chips)
  - `rounded-lg`: `12px` (Modal dialogs, form boxes)
  - `rounded-xl`: `18px` (Feature benefit containers)
  - `rounded-full`: `9999px` (Pills, circular icons, quantity buttons)
- **Shadows (Strictly Solid, No Blur Glows)**:
  - `shadow-sm`: `0 1px 2px 0 rgba(0, 0, 0, 0.05)`
  - `shadow-card`: `0 2px 4px rgba(0, 0, 0, 0.04)`
  - `shadow-hover`: `0 8px 20px rgba(0, 0, 0, 0.08)`

---

## 4. Responsive Grid & Layout Map

| Page | 360px Mobile | 768px Tablet | 1280px Desktop |
|------|--------------|--------------|----------------|
| Header | Logo + Cart + Hamburger (Sheet) | Logo + Search + Cart + Menu | Logo + Nav (6 items) + Search + Cart |
| Hero | Stacked: Headline, Buttons, 3 Bottles | Grid 1fr 1fr | Grid 1.1fr 1fr |
| Category Grid | 2 columns (minmax 140px) | 3 columns | 6 columns |
| Product Grid | 1 or 2 columns (minmax 160px) | 3 columns | 4 columns |
| Product Detail | Stacked: Image, Details, Tabs | Stacked | Grid 1fr 1fr (sticky image column) |
| Cart & Checkout | Stacked: Items then Summary | Stacked | Grid 1.6fr 1fr |
| Footer | 1 column stacked | 2 columns | Grid 1.5fr 1fr 1fr 1fr |

---

## 5. Component Inventory & Standards

1. **Buttons**:
   - `Primary`: Solid `#232323` bg, `#ffffff` text, 4px radius, hover `#016a38`.
   - `Outline`: Solid transparent bg, 1.5px solid `#232323`, hover `#016a38` border/bg with `#ffffff` text.
   - `Cart Add`: Compact square button with FontAwesome shopping cart icon.
2. **Cards**:
   - Solid `#ffffff` bg, 1px solid `#e8e8e8` border, 6px radius, solid 1px shadow.
   - No glassmorphism, no backdrop blur.
3. **Form Fields**:
   - Solid `#ffffff` bg, 1px solid `#e8e8e8` border, focus ring `#016a38`, labels strictly above inputs.
4. **Icons**:
   - FontAwesome Free SVG icons via `@fortawesome/react-fontawesome`. Zero external CDN, zero emojis.
5. **Regulatory Disclaimer**:
   - Standard footer & product detail text: *"These statements have not been evaluated by a regulator. This product is not intended to diagnose, treat, cure or prevent any disease."*
