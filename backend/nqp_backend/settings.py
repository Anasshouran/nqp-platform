import os
import sys
from pathlib import Path
from datetime import timedelta

from dotenv import load_dotenv

from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / '.env')

SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
DEBUG = os.environ.get('DEBUG', 'False').lower() in ('true', '1', 'yes')
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

_IS_TEST_RUN = any(a == 'test' or 'pytest' in a for a in sys.argv)
_PLACEHOLDER_SECRETS = {
    'dev-secret-key-change-in-production',
    'your-secret-key-here',
    'dev-secret-key-please-change',
}
if not DEBUG and not _IS_TEST_RUN and SECRET_KEY in _PLACEHOLDER_SECRETS:
    raise ImproperlyConfigured(
        'SECRET_KEY must be set to a real value via environment in production '
        '(set DEBUG=true only for local development).'
    )

# GeoDjango يُفعَّل تلقائياً عند استخدام محرك PostGIS (الإنتاج) فقط؛
# مع SQLite (التطوير) تبقى النماذج تعمل عبر JSONField البديل في apps.surveillance.
_GIS_ENABLED = os.environ.get('DB_ENGINE') == 'django.contrib.gis.db.backends.postgis' or \
    os.environ.get('USE_GIS', '').strip().lower() in ('true', '1', 'yes')

DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
] + (['django.contrib.gis'] if _GIS_ENABLED else [])

THIRD_PARTY_APPS = [
    'rest_framework',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'drf_spectacular',
    'django_extensions',
]

LOCAL_APPS = [
    'apps.accounts',
    'apps.travelers',
    'apps.ports',
    'apps.chemistry',
    'apps.carriers',
    'apps.screening',
    'apps.risk_engine',
    'apps.clinic',
    'apps.laboratory',
    'apps.food_quarantine',
    'apps.food_window',
    'apps.food_surveillance',
    'apps.emergency_eoc',
    'apps.notifications',
    'apps.reporting',
    'apps.integration',
    'apps.cms',
    'apps.airport_health',
    'apps.db_admin',
    'apps.it_management',
    'apps.organization',
    'apps.port_health',
    'apps.vector_control',
    'apps.public',
    'apps.masterdata',
    'apps.finance',
    'apps.ihr',
    'apps.who',
    'apps.vaccination',
    'apps.surveillance',
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'nqp_backend.urls'

AUTH_USER_MODEL = 'accounts.User'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
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

WSGI_APPLICATION = 'nqp_backend.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': os.environ.get('DB_ENGINE', 'django.db.backends.postgresql'),
        'NAME': os.environ.get('DB_NAME', 'nqp_db'),
        'USER': os.environ.get('DB_USER', 'postgres'),
        'PASSWORD': os.environ.get('DB_PASSWORD', 'postgres'),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '5432'),
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'ar'
TIME_ZONE = 'Africa/Khartoum'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'static'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

CORS_ALLOW_ALL_ORIGINS = DEBUG
CORS_ALLOWED_ORIGINS = os.environ.get('CORS_ALLOWED_ORIGINS', 'http://localhost:5173,http://localhost:3000').split(',')

# Security hardening (production / DEBUG=False)
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_SSL_REDIRECT = os.environ.get('SECURE_SSL_REDIRECT', 'False').lower() in ('true', '1', 'yes')
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = int(os.environ.get('SECURE_HSTS_SECONDS', 31536000))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'

# DRF
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_RENDERER_CLASSES': (
        'core.renderers.EnvelopeRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ),
    'DEFAULT_PAGINATION_CLASS': 'core.pagination.StandardPagination',
    'PAGE_SIZE': 10,
'DEFAULT_THROTTLE_CLASSES': (
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
        'rest_framework.throttling.ScopedRateThrottle',
    ),
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/min',
        'user': '200/hour',
        'traveler_lookup': '30/hour',
    },
}

if _IS_TEST_RUN:
    REST_FRAMEWORK['DEFAULT_THROTTLE_CLASSES'] = ()
    REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {}

# JWT
_SIGNING_KEY = os.environ.get('JWT_SECRET_KEY') or None
if _SIGNING_KEY:
    SIMPLE_JWT = {
        'SIGNING_KEY': _SIGNING_KEY,
        'ACCESS_TOKEN_LIFETIME': timedelta(seconds=int(os.environ.get('JWT_ACCESS_TOKEN_LIFETIME', 1800))),
        'REFRESH_TOKEN_LIFETIME': timedelta(seconds=int(os.environ.get('JWT_REFRESH_TOKEN_LIFETIME', 604800))),
    }
else:
    SIMPLE_JWT = {
        'ACCESS_TOKEN_LIFETIME': timedelta(seconds=int(os.environ.get('JWT_ACCESS_TOKEN_LIFETIME', 1800))),
        'REFRESH_TOKEN_LIFETIME': timedelta(seconds=int(os.environ.get('JWT_REFRESH_TOKEN_LIFETIME', 604800))),
    }

# رابط الواجهة الأمامية لروابط إعادة تعيين كلمة المرور.
# يُفعَّل صراحةً في الإنتاج — يُستخدم بدلاً من رأس Origin (الذي يمكن تسميمه).
PASSWORD_RESET_BASE_URL = os.environ.get('PASSWORD_RESET_BASE_URL', '').rstrip('/')

# Celery — build broker/result URLs from REDIS_* when not overridden (e.g. in containers)
_REDIS_HOST = os.environ.get('REDIS_HOST')
if _REDIS_HOST:
    _redis_auth = ''
    if os.environ.get('REDIS_PASSWORD'):
        _redis_auth = f":{os.environ['REDIS_PASSWORD']}@"
    _redis_base = f'redis://{_redis_auth}{_REDIS_HOST}:{os.environ.get("REDIS_PORT", "6379")}/0'
    CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', _redis_base)
    CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', _redis_base)
else:
    CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', 'redis://localhost:6379/0')
    CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'

# MinIO / S3
USE_S3 = os.environ.get('USE_S3', 'False').lower() in ('true', '1', 'yes')

# بوابة عرض QR التجريبي (يُفعَّل صراحةً في بيئات المعاينة فقط — الافتراضي معطّل)
ENABLE_DEMO_QR = os.environ.get('ENABLE_DEMO_QR', 'False').lower() in ('true', '1', 'yes')
if USE_S3:
    AWS_ACCESS_KEY_ID = os.environ.get('MINIO_ACCESS_KEY')
    AWS_SECRET_ACCESS_KEY = os.environ.get('MINIO_SECRET_KEY')
    AWS_STORAGE_BUCKET_NAME = os.environ.get('MINIO_BUCKET', 'nqp-documents')
    AWS_S3_ENDPOINT_URL = f"http://{os.environ.get('MINIO_ENDPOINT', 'localhost:9000')}"
    AWS_S3_REGION_NAME = 'us-east-1'
    STORAGES = {
        'default': {'BACKEND': 'storages.backends.s3.S3Storage'},
        'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
    }

# Spectacular (OpenAPI)
SPECTACULAR_SETTINGS = {
    'TITLE': 'NQP API',
    'DESCRIPTION': 'National Quarantine Platform API',
    'VERSION': '1.0.0',
}
