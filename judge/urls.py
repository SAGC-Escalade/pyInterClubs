from django.urls import path, include

from .views import *

app_name = 'judge'

urlpatterns = [
    path('', JugeManageView.as_view(), name='manage'),
    path('create', JugeCreateView.as_view(), name='create'),
]
