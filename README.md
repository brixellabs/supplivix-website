# Supplivix E-Commerce Platform

A production-ready e-commerce platform for Supplivix, a skincare and multivitamins brand, featuring Cash on Delivery (COD) as the payment method and multivitamins as the catalog and design centerpiece.

## Architecture and Stack

- Frontend: React (Vite) + Tailwind CSS + React Router
- Icons: FontAwesome Free via npm (@fortawesome/react-fontawesome, self-hosted, no CDN)
- Backend: Django + Django REST Framework
- Database: Neon (serverless PostgreSQL, pooled connection string)
- Auth: Django session or JWT (httpOnly cookie), email + password
- Testing: pytest + pytest-django, Vitest + React Testing Library, Playwright (E2E), Locust (load)
- Currency: Pakistani Rupee (PKR, Rs.), stored as whole-rupee integers

## Non-Negotiable Standards

1. Zero Emojis: Absolutely no emojis across UI, code, seed data, comments, commits, or documentation.
2. Zero Glassmorphism: Solid backgrounds, 1px solid borders, and small solid shadows. No backdrop-filter or translucent overlays.
3. Design System: Strict replica of the client reference layout, color palette, typography scale, and component hierarchy.
4. Health Compliance: Mandatory regulatory disclaimer on all supplement interfaces: "These statements have not been evaluated by a regulator. This product is not intended to diagnose, treat, cure or prevent any disease."
5. Validation: Strict parity between client-side and server-side validation.
6. Security: No secrets in code, Argon2 password hashing, HTTPS-only cookies, strict CORS, rate limiting, and Turnstile bot protection.
7. Accessibility: WCAG 2.1 AA compliance with semantic HTML, explicit labels, and visible focus rings.
8. Mobile First: Fluid responsive design starting from 360px viewport width up to 1280px+ desktop.

## Project Structure

```
supplivix_website/
|-- backend/               # Django and Django REST Framework application
|   |-- config/            # Project settings, URLs, WSGI/ASGI
|   |-- accounts/          # User authentication, profiles, addresses
|   |-- catalog/           # Categories, products, images, attributes, FAQs, reviews
|   |-- cart/              # Cart and cart items
|   |-- orders/            # Orders, order items, status history
|   |-- promotions/        # Coupons, rules, redemptions
|   |-- content/           # Contact, waitlist, public settings
|   |-- core/              # Health check, bot protection, middleware
|-- frontend/              # React + Vite + Tailwind CSS application
|   |-- src/
|   |   |-- components/    # Reusable UI primitives and layout blocks
|   |   |-- pages/         # Page routes
|   |   |-- services/      # API clients
|   |   |-- assets/        # Self-hosted fonts, brand assets, demo illustrations
|-- design-reference/      # Reference design and client logo
|-- docs/                  # Design specification, test reports, architecture
|-- docker-compose.yml     # Local orchestration
`-- README.md
```

## Quick Start

### Backend Setup

```bash
cd backend
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Unix:
source .venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Running Tests

```bash
# Backend pytest suite (197 tests)
cd backend
pytest -v

# Frontend vitest suite (133 tests)
cd frontend
npm run test -- --run

# Multi-browser Playwright E2E suite (91 scenarios across Chromium, Firefox, WebKit, Mobile, Edge)
cd frontend
npm run test:e2e

# 100-User Load Test & Concurrency Simulation
python loadtests/run_load_test.py

# Or via Locust CLI
locust -f loadtests/locustfile.py --host=http://localhost:8000
```

## Production Deployment & Operations

### 1. Environment Configuration

Create `.env` in `backend/` with production variables:

```bash
DEBUG=False
SECRET_KEY=generate-strong-64-char-random-key
ALLOWED_HOSTS=supplivix.com,www.supplivix.com,api.supplivix.com
CORS_ALLOWED_ORIGINS=https://supplivix.com,https://www.supplivix.com

# Neon PostgreSQL Database URLs
# Pooled URL for web queries (PgBouncer port 6543)
DATABASE_URL=postgresql://user:pass@ep-cool-sample-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
# Direct URL for schema migrations (Direct port 5432)
DIRECT_DATABASE_URL=postgresql://user:pass@ep-cool-sample.us-east-2.aws.neon.tech/neondb?sslmode=require

# Cloudflare Turnstile Bot Protection
TURNSTILE_SITE_KEY=0x4AAAAAA...
TURNSTILE_SECRET_KEY=0x4AAAAAA...

# Email Delivery (SMTP)
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_HOST_USER=apikey
EMAIL_HOST_PASSWORD=your-sendgrid-api-key
DEFAULT_FROM_EMAIL=Supplivix <orders@supplivix.com>
```

### 2. Static & Media Asset Build

```bash
# Frontend production build
cd frontend
npm run build

# Backend static files collection
cd ../backend
python manage.py collectstatic --noinput
```

### 3. Database Management Commands

```bash
# Run schema migrations (routes through DIRECT_DATABASE_URL automatically)
python manage.py migrate

# Seed baseline demo catalog (48 products, 6 categories, 6 coupons)
python manage.py seed_demo

# Purge demo products before loading client inventory
python manage.py purge_demo --confirm

# Seed 100 load test users on staging branch (never runs on main/production)
python manage.py seed_load_users --count 100

# Execute Neon Point-In-Time Recovery drill
python manage.py neon_restore_drill --verify
```

### 4. Production Web Server (Gunicorn + Uvicorn Worker)

```bash
gunicorn config.wsgi:application \
  --workers 4 \
  --worker-class gthread \
  --threads 4 \
  --bind 0.0.0.0:8000 \
  --timeout 30 \
  --max-requests 1000 \
  --max-requests-jitter 100
```

## Documentation Index

- [`TEST_REPORT.md`](file:///d:/Brixellabs/supplivix/supplivix_website/TEST_REPORT.md): Complete 421-test automated suite report (100% pass across Pytest, Vitest, and Playwright).
- [`LOAD_TEST_REPORT.md`](file:///d:/Brixellabs/supplivix/supplivix_website/LOAD_TEST_REPORT.md): 100-user load test benchmark report (Cold, Warm, Spike, Bot simulation, READY verdict).
- [`docs/admin-user-guide.md`](file:///d:/Brixellabs/supplivix/supplivix_website/docs/admin-user-guide.md): One page per module user guide for the Staff Admin Panel.
- [`docs/design-spec.md`](file:///d:/Brixellabs/supplivix/supplivix_website/docs/design-spec.md): Design tokens, color palette, typography hierarchy, and UI guidelines.
- [`docs/neon-reliability.md`](file:///d:/Brixellabs/supplivix/supplivix_website/docs/neon-reliability.md): Neon serverless connection topology and PITR drill procedures.
- [`docs/asset-audit.md`](file:///d:/Brixellabs/supplivix/supplivix_website/docs/asset-audit.md): Codebase audit confirming 100% original assets and zero third-party stock photos.

## Architectural Assumptions

1. **Free Shipping Threshold**: Nationwide Cash on Delivery (COD) only. Orders with subtotal >= Rs. 2,000 receive free delivery; orders < Rs. 2,000 incur a flat Rs. 200 delivery fee.
2. **Shipping Fee**: Configurable in admin (`SiteSetting`), defaults to flat Rs. 200 nationwide.
3. **Currency & Whole Integers**: Stored and calculated in Pakistani Rupees (PKR) as whole integers (`Rs. 2,400`). Decimals are disallowed.
4. **Turnstile Bot Protection**: Cloudflare Turnstile serves as the interactive challenge provider, supported by off-screen honeypot traps and signed timestamp tokens.
5. **Pre-Rendering & SEO**: Hybrid SSR shell injection dynamically injects `<title>`, `<meta>`, canonical links, and Schema.org JSON-LD scripts into the static HTML shell before delivering it to web crawlers.
6. **Regulatory Health Disclaimer**: Standard regulatory disclaimer is mandatory and rendered on every multivitamin product page, hub page, catalog description, and site footer.

