from django.contrib import admin
from .models import *

# ModelAdmin
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('id', 'event', 'data', 'date')
    list_filter = ('date',)


# Register your models here.
admin.site.register(Notification, NotificationAdmin)
