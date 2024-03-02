"""
ASGI config for pyInterClubs project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application

from django.urls import path, re_path
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django_eventstream import consumers
#import django_eventstream

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyInterClubs.settings')

#application = get_asgi_application()
application = ProtocolTypeRouter({
    'http': URLRouter([
        #path('api/<obj>/<id>/events', consumers.EventsConsumer.as_asgi(), {'format-channels': ['{obj}-{id}']}),
        path('events/', consumers.EventsConsumer.as_asgi(), {'channels': ['events']}),
        #path('events/', AuthMiddlewareStack(URLRouter(django_eventstream.routing.urlpatterns)), { 'channels': ['test'] }),
        re_path(r'', get_asgi_application()),
    ]),
})
