from django.contrib import admin
from .models import *


# ModelAdmin
class ConfigAdmin(admin.ModelAdmin):
    list_display = ('key', 'type', 'value')
    list_filter = ('type',)


# Register your models here.
admin.site.register(Config, ConfigAdmin)
