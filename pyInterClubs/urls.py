"""
pyInterClubs URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/2.1/topics/http/urls/

Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.views.generic import TemplateView

from django_js_reverse.views import urls_js
import django_eventstream

from .views import *

urlpatterns = [
    path('debug/', admin.site.urls),
    path('api/', include('api.urls', namespace='api'), name='api'),
    path('admin/', include('admin.urls', namespace='rencontre')),
    path('leader/', include('leader.urls', namespace='equipe')),
    path('judge/', include('judge.urls', namespace='juge')),
    path('accounts/', include('django.contrib.auth.urls')),

    path('accounts/club', ClubAuthenticationView.as_view(), name='auth-club'),
    path('', TemplateView.as_view(template_name="index.html")),

    # TODO: Prévoir un channel par rencontre (en ajoutant l'id de la rencontre dans l'uri par exemple)
    # Avec la dernière version de django-eventstream :
    # path('events/<id>/', include(django_eventstream.urls), {'format-channels': ['rencontre-{id}']})
    # Ca permettrait d'avoir plusieurs rencontres lancées en même temps sans qu'elles ne se perturbent entre elles.
    path('events/', include(django_eventstream.urls), {"channels": ["events"]}),

    re_path(r"^react/(?P<path>.*.jsx)$", serve_react, name='react'),
    re_path(r'^js/reverse/$', urls_js, name='js_reverse'),
]
