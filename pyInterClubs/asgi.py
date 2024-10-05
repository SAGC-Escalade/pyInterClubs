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

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyInterClubs.settings')

application = ProtocolTypeRouter({
    'http': URLRouter([
        # TODO: Prévoir un channel par rencontre (en ajoutant l'id de la rencontre dans l'uri par exemple)
        path('events/', consumers.EventsConsumer.as_asgi(), {'channels': ['events']}),
        re_path(r'', get_asgi_application()),
    ]),
})
