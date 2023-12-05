from django.urls import path

from .views import SSEView

urlpatterns = [
    path('events', SSEView.as_view(), name='events'),
]
