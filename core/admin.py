from django.contrib import admin
from .models import *

# Filter
class FirstLetterFilter(admin.SimpleListFilter):
    title = 'Première lettre'
    parameter_name = 'Nom'

    def lookups(self, request, model_admin):
        return [c+c for c in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ']

class NomFirstLetterFilter(FirstLetterFilter):
    def queryset(self, request, queryset):
        if self.value() is None:
            return queryset.all()
        return queryset.filter(Nom__startswith=self.value())

class GrimpeurFirstLetterFilter(FirstLetterFilter):
    def queryset(self, request, queryset):
        if self.value() is None:
            return queryset.all()
        return queryset.filter(Grimpeur__Nom__startswith=self.value())


# Inline
class ScoreInline(admin.TabularInline):
    model = Score
    fields = ('Grimpeur', ('IDVoie1', 'Voie1'), ('IDVoie2', 'Voie2'), ('IDVoie3', 'Voie3'), ('IDVoie4', 'Voie4'), 'Bloc1', 'Bloc2', ('Vitesse', 'PtsVitesse'), 'Points')
    ordering = ('Ordre',)
    readonly_fields = ('PtsVitesse', 'Points')
    max_num = 8
    verbose_name = 'Grimpeur'


# ModelAdmin
class NiveauAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'Categorie', 'Actif')
    list_filter = ('Categorie', 'Actif')
    fieldsets = (
        (None, {
            'fields': (('NomVoie', 'NiveauVoie'), 'Categorie', ('PtsValorises', 'PtsVoieComplete'), 'Actif'),
        }),
    )

class ClubAdmin(admin.ModelAdmin):
    list_display = ('Nom', 'Localisation')
    fieldsets = (
        (None, {
            'fields': ('Nom', 'Localisation'),
        }),
    )

class GrimpeurAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'Club', 'AnneeNaissance', 'Sexe')
    list_filter = (NomFirstLetterFilter, 'Club', 'AnneeNaissance', 'Sexe')
    search_fields = ('Nom', 'Prenom', 'Club__Nom', 'Club__Localisation')
    search_help_text = "Recherchez par le nom, le prénom ou le club d'un grimpeur"
    fieldsets = (
        ('Identité', {
            'fields': (('Nom', 'Prenom'), 'AnneeNaissance', 'Sexe'),
        }),
        ('Informations de la Fédération', {
            'fields': ('Club', 'Licence'),
        }),
    )

    @admin.display(ordering='Nom', description='Nom')
    def get_first_letter(self, obj):
        return obj.Nom[0]

class RencontreAdmin(admin.ModelAdmin):
    list_display = ('Date', 'Club')
    list_filter = ('Club', 'Date')

class EquipeAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'Rencontre', 'Categorie')
    list_filter = ('Club__Nom', 'Rencontre', 'Categorie')
    search_fields = ('Club__Nom', 'Club__Localisation', 'Rencontre__Club__Nom', 'Rencontre__Club__Localisation')
    search_help_text = "Recherchez par le nom du club de l'équipe ou de la rencontre"
    fieldsets = (
        (None, {
            'fields': (('Rencontre', 'Categorie'), ('Club', 'Numero')),
        }),
    )
    inlines = [ScoreInline]

class ScoreAdmin(admin.ModelAdmin):
    list_display = ('Grimpeur', 'get_rencontre', 'get_categorie', 'Points')
    list_filter = (GrimpeurFirstLetterFilter, 'Equipe__Rencontre', 'Equipe__Categorie', 'Grimpeur__Sexe')
    search_fields = ('Grimpeur__Nom', 'Grimpeur__Prenom', 'Grimpeur__Club__Nom', 'Grimpeur__Club__Localisation')
    search_help_text = "Recherchez par le nom, le prénom ou le club d'un grimpeur"
    fieldsets = (
        ('Grimpeur', {
            'fields': ('Equipe', 'Grimpeur', 'ClubPreteur'),
        }),
        ('Résultats', {
            'fields': (('IDBloc1', 'Bloc1'), ('IDBloc2', 'Bloc2'), ('IDVoie1', 'Voie1'), ('IDVoie2', 'Voie2'), ('IDVoie3', 'Voie3'), ('IDVoie4', 'Voie4'), ('Vitesse', 'PtsVitesse'), 'Points'),
        }),
        ('Options avancées', {
            'classes': ('collapse',),
            'fields': ('Ordre',),
        }),
    )

    @admin.display(ordering='Equipe__Rencontre', description='Rencontre')
    def get_rencontre(self, obj):
        return str(obj.Equipe.Rencontre)
    @admin.display(ordering='Equipe__Categorie', description='Catégorie')
    def get_categorie(self, obj):
        return Categorie(obj.Equipe.Categorie).name


# Register your models here
admin.site.register(Niveau, NiveauAdmin)
admin.site.register(Club, ClubAdmin)
admin.site.register(Grimpeur, GrimpeurAdmin)
admin.site.register(Saison)
admin.site.register(Rencontre, RencontreAdmin)
admin.site.register(Equipe, EquipeAdmin)
admin.site.register(Score, ScoreAdmin)
