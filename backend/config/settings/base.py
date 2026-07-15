"""
config/settings/base.py

Paramètres Django communs à tous les environnements.
Les valeurs sensibles sont chargées depuis .env via python-decouple.
"""

import os
from datetime import timedelta
from pathlib import Path

from decouple import config

# ── Chemins ────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent.parent  # backend/

# ── Sécurité ───────────────────────────────────────────────────────────────────
SECRET_KEY = config("SECRET_KEY")
DEBUG = config("DEBUG", default=False, cast=bool)
ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="localhost,127.0.0.1").split(",")

# ── Applications ───────────────────────────────────────────────────────────────
DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    "drf_spectacular",
    "django_celery_beat",
    "django_celery_results",
]

LOCAL_APPS = [
    "core",
    "apps.authentication",
    "apps.superadmin",
    "apps.pedagogy",
    "apps.finance",
    "apps.monitoring",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# ── Middleware ──────────────────────────────────────────────────────────────────
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",        # Doit être avant CommonMiddleware
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "core.middleware.TenantMiddleware",             # AUTH-03 — après auth Django
]

ROOT_URLCONF = "config.urls"

# ── Templates ──────────────────────────────────────────────────────────────────
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# ── Base de données ─────────────────────────────────────────────────────────────
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": config("DB_NAME", default="eduguinee_dev"),
        "USER": config("DB_USER", default="eduguinee"),
        "PASSWORD": config("DB_PASSWORD", default="eduguinee"),
        "HOST": config("DB_HOST", default="localhost"),
        "PORT": config("DB_PORT", default="5432"),
        "CONN_MAX_AGE": 60,
        "OPTIONS": {
            "connect_timeout": 10,
        },
    }
}

# ── Modèle utilisateur personnalisé ────────────────────────────────────────────
AUTH_USER_MODEL = "authentication.User"

# ── Mots de passe — Argon2id (§5.1 CDC) ───────────────────────────────────────
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",  # argon2-cffi requis
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",  # fallback
]

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
     "OPTIONS": {"min_length": 12}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ── Internationalisation ────────────────────────────────────────────────────────
LANGUAGE_CODE = "fr-fr"
TIME_ZONE = "Africa/Conakry"
USE_I18N = True
USE_TZ = True

# ── Fichiers statiques et médias ────────────────────────────────────────────────
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "mediafiles"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ── Django REST Framework ──────────────────────────────────────────────────────
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_PAGINATION_CLASS": "core.pagination.StandardPagination",
    "PAGE_SIZE": 25,
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "EXCEPTION_HANDLER": "core.exceptions.custom_exception_handler",
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

# ── JWT (djangorestframework-simplejwt) ────────────────────────────────────────
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=config("JWT_ACCESS_TOKEN_LIFETIME_MINUTES", default=15, cast=int)
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(
        days=config("JWT_REFRESH_TOKEN_LIFETIME_DAYS", default=7, cast=int)
    ),
    "ROTATE_REFRESH_TOKENS": True,       # Rotation des refresh tokens
    "BLACKLIST_AFTER_ROTATION": True,    # Blacklist l'ancien refresh token après rotation
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),
    # Claims personnalisés injectés dans le token (AUTH-03)
    "TOKEN_OBTAIN_SERIALIZER": "apps.authentication.serializers.CustomTokenObtainPairSerializer",
}

# ── CORS ────────────────────────────────────────────────────────────────────────
CORS_ALLOWED_ORIGINS = config(
    "CORS_ALLOWED_ORIGINS", default="http://localhost:3000"
).split(",")
CORS_ALLOW_CREDENTIALS = True

# ── drf-spectacular (Swagger/OpenAPI) ─────────────────────────────────────────
SPECTACULAR_SETTINGS = {
    "TITLE": "Eduguinée 3.0 API",
    "DESCRIPTION": (
        "API RESTful du SaaS de gestion scolaire Eduguinée. "
        "Multi-tenant, JWT, versionnée /api/v1/."
    ),
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "SCHEMA_PATH_PREFIX": "/api/v1",
    "COMPONENT_SPLIT_REQUEST": True,
}

# ── Celery ─────────────────────────────────────────────────────────────────────
CELERY_BROKER_URL = config("REDIS_URL", default="redis://localhost:6379/0")
CELERY_RESULT_BACKEND = "django-db"  # django-celery-results
CELERY_CACHE_BACKEND = "default"
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE
CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"

# ── Cache (Redis) ──────────────────────────────────────────────────────────────
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": config("REDIS_URL", default="redis://localhost:6379/0"),
    }
}

# ── Stockage fichiers (S3-compatible MinIO en dev) ─────────────────────────────
DEFAULT_FILE_STORAGE = "storages.backends.s3boto3.S3Boto3Storage"
AWS_ACCESS_KEY_ID = config("AWS_ACCESS_KEY_ID", default="minioadmin")
AWS_SECRET_ACCESS_KEY = config("AWS_SECRET_ACCESS_KEY", default="minioadmin")
AWS_STORAGE_BUCKET_NAME = config("AWS_STORAGE_BUCKET_NAME", default="eduguinee-dev")
AWS_S3_ENDPOINT_URL = config("AWS_S3_ENDPOINT_URL", default="http://localhost:9000")
AWS_S3_FILE_OVERWRITE = False
AWS_DEFAULT_ACL = None
