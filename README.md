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
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm run test
```

