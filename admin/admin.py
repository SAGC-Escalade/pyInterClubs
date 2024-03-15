from django.contrib import admin
from .models import *


@admin.register(Config)
class ConfigAdmin(admin.ModelAdmin):
    list_display = ('key', 'type', 'value')
    list_filter = ('type',)

@admin.register(Profil)
class ProfilConfig(admin.ModelAdmin):
    list_display = ('user', 'rencontre')
    list_filter = ('rencontre',)

@admin.register(Coach)
class CoachConfig(admin.ModelAdmin):
    list_display = ('user', 'rencontre', 'club')
    list_filter = ('rencontre',)

@admin.register(Juge)
class JugeConfig(admin.ModelAdmin):
    list_display = ('user', 'rencontre')
    list_filter = ('rencontre',)
    #fieldsets = (
    #    (None, {
    #        'fields': ('user', 'niveaux'),
    #    }),
    #)
    #filter_horizontal = ('niveaux',)
