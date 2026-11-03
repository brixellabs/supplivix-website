"""
Django settings for Supplivix e-commerce platform.
Production-ready configuration supporting Neon serverless PostgreSQL,
strict security defaults, and full REST API integration.
"""

import os
import sys
from pathlib import Path

import dj_database_url
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from .env if present
load_dotenv(BASE_DIR / '.env')

# Core Secret and Debug Settings
SECRET_KEY = os.environ.get(
    'SECRET_KEY',
    'django-insecure-default-change-me-in-production'
)

DEBUG = os.environ.get('DEBUG', 'False').lower() in ('true', '1', 'yes')

ALLOWED_HOSTS = [
    host.strip()
    for host in os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1,testserver').split(',')
    if host.strip()
]
if 'testserver' not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append('testserver')

SITE_URL = os.environ.get('SITE_URL', 'http://localhost:5173')

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party apps
    'rest_framework',
    'corsheaders',

    # Supplivix apps
    'core.apps.CoreConfig',
    'accounts.apps.AccountsConfig',
    'catalog.apps.CatalogConfig',
    'cart.apps.CartConfig',
    'orders.apps.OrdersConfig',
    'promotions.apps.PromotionsConfig',
    'content.apps.ContentConfig',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'core.middleware.BotProtectionMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Database Configuration
# Neon Serverless PostgreSQL support with pooled and direct connection strings.
# Migrations use DIRECT_DATABASE_URL if specified, avoiding PgBouncer transaction/DDL limits.
is_migration = any(cmd in sys.argv for cmd in ['migrate', 'makemigrations'])
direct_url = os.environ.get('DIRECT_DATABASE_URL')
db_url = os.environ.get('DATABASE_URL')

selected_db_url = direct_url if (is_migration and direct_url) else (db_url or 'sqlite:///db.sqlite3')

DATABASES = {
    'default': dj_database_url.config(
        default=selected_db_url,
        conn_max_age=0 if '-pooler' in selected_db_url else 600,
        conn_health_checks=True,
        ssl_require=True if 'postgresql' in selected_db_url else False,
    )
}

if 'sqlite' in selected_db_url:
    DATABASES['default'].setdefault('OPTIONS', {})['timeout'] = 30

# Custom User Model
AUTH_USER_MODEL = 'accounts.User'

# Password validation and Argon2 hashing
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.Argon2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher',
    'django.contrib.auth.hashers.BCryptSHA256PasswordHasher',
]

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 8}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Karachi'
USE_I18N = True
USE_TZ = True

# Static and Media Files
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'EXCEPTION_HANDLER': 'core.exceptions.custom_exception_handler',
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
        'rest_framework.throttling.ScopedRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/min',
        'user': '1000/min',
        'login': '5/min',
        'register': '5/hour',
        'coupon': '10/min',
        'order': '30/hour',
        'contact': '3/hour',
        'waitlist': '10/min',
    },
}

# CORS and CSRF Configuration
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get('CORS_ALLOWED_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173').split(',')
    if origin.strip()
]
CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get('CSRF_TRUSTED_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173').split(',')
    if origin.strip()
]

# Security Defaults
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SAMESITE = 'Lax'
X_FRAME_OPTIONS = 'DENY'
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'

if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

# Cloudflare Turnstile Configuration
TURNSTILE_SECRET_KEY = os.environ.get(
    'TURNSTILE_SECRET_KEY',
    '1x0000000000000000000000000000000AA'
)
TURNSTILE_SITE_KEY = os.environ.get(
    'TURNSTILE_SITE_KEY',
    '1x00000000000000000000AA'
)

# Demo and Store Seed Defaults
DEMO_STAFF_EMAIL = os.environ.get('DEMO_STAFF_EMAIL', 'admin@supplivix.com')
DEMO_STAFF_PASSWORD = os.environ.get('DEMO_STAFF_PASSWORD', 'SupplivixAdmin2026!')
