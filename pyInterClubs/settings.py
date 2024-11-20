"""
Django settings for pyInterClubs project.

Based on by 'django-admin startproject' using Django 2.1.2.

For more information on this file, see
https://docs.djangoproject.com/en/2.1/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/2.1/ref/settings/
"""

from pathlib import Path

# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
BASE_DIR = Path(__file__).resolve().parent.parent

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/2.1/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'dc7519ba-91c9-42c9-b41f-c8ac5c6fc48b'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = ['*']

# Application references
# https://docs.djangoproject.com/en/2.1/ref/settings/#std:setting-INSTALLED_APPS
INSTALLED_APPS = [
    # Add your apps here to enable them
    'daphne',
    'channels',
    'leader',
    'judge',
    'admin',
    'core',
    'api',
    'fontawesomefree',
    'django_bootstrap5',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'babel_transpiling',
    'rest_framework',
    'django_js_reverse',
]

# Middleware framework
# https://docs.djangoproject.com/en/2.1/topics/http/middleware/
MIDDLEWARE = [
    'babel_transpiling.middlewares.StaticFilesTranspilingMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'admin.middleware.pyInterClubsMiddleware',
]

ROOT_URLCONF = 'pyInterClubs.urls'

# Template configuration
# https://docs.djangoproject.com/en/2.1/topics/templates/
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'pyInterClubs/templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'admin.context_processor.get_rencontre',
            ],
        },
    },
]

WSGI_APPLICATION = 'pyInterClubs.wsgi.application'
ASGI_APPLICATION = 'pyInterClubs.asgi.application'

# Database
# https://docs.djangoproject.com/en/2.1/ref/settings/#databases
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'django.sqlite',
    },
}

# Password validation
# https://docs.djangoproject.com/en/2.1/ref/settings/#auth-password-validators
AUTH_PASSWORD_VALIDATORS = [
    { 'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator', },
    { 'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', },
    { 'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator', },
    { 'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator', },
]

AUTHENTICATION_BACKENDS = ['pyInterClubs.backends.ClubBackend', 'django.contrib.auth.backends.ModelBackend']
LOGIN_REDIRECT_URL  = '/'
LOGOUT_REDIRECT_URL = '/'

# Internationalization
# https://docs.djangoproject.com/en/2.1/topics/i18n/
LANGUAGE_CODE = 'fr-FR'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_L10N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/2.1/howto/static-files/
STATIC_URL = 'static/'
STATICFILES_DIRS = [BASE_DIR / 'pyInterClubs/static']
#STATIC_ROOT = BASE_DIR / 'static'

# Ajout de types MIME pour les fichiers statiques
import mimetypes
mimetypes.add_type("application/javascript", ".js", True)

# React configuration
#REACT_URL = "react"

# JS-Reverse configuration
JS_REVERSE_EXCLUDE_NAMESPACES = ['admin']

# REST configuration
REST_FRAMEWORK = {
    'EXCEPTION_HANDLER': 'api.exceptions.custom_exception_handler'
}

# LOGGING
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs/pyInterClubs.log',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.server': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'daphne': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'channels': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        '': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}


# Django Debug Toolbar
#INTERNAL_IPS = ['127.0.0.1', 'localhost']
#INSTALLED_APPS = INSTALLED_APPS + [ 'debug_toolbar', ]
#MIDDLEWARE = [ 'debug_toolbar.middleware.DebugToolbarMiddleware', ] + MIDDLEWARE
#DEBUG_TOOLBAR_CONFIG = {
#    #'SHOW_TOOLBAR_CALLBACK': 'pyInterclubs.utils.show_toolbar',
#    'SHOW_TOOLBAR_CALLBACK': lambda request: True,
#}
#DEBUG_TOOLBAR_PANELS = [
#    'debug_toolbar.panels.timer.TimerPanel',
#    'debug_toolbar.panels.sql.SQLPanel',
#    'debug_toolbar.panels.cache.CachePanel',
#    'debug_toolbar.panels.headers.HeadersPanel',
#    'debug_toolbar.panels.request.RequestPanel',
#    'debug_toolbar.panels.templates.TemplatesPanel',
#    'debug_toolbar.panels.staticfiles.StaticFilesPanel',
#    'debug_toolbar.panels.profiling.ProfilingPanel',
#]
