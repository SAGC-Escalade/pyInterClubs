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

def byField(model, field, filter, title=None):
    _title = title
    if title is None: _title = filter

    class byFieldFilter(admin.SimpleListFilter):
        title = _title
        parameter_name = _title

        def lookups(self, request, model_admin):
            queryset = model.objects.using('interClubs').all()
            lst = []
            for o in queryset:
                value = getattr(o, field)
                if callable(value):
                    try: value = value()
                    except e: value = None
                value = str(value)
                lst.append((o.ID, value))
            return sorted(lst, key=lambda o: o[1])

        def queryset(self, request, queryset):
            if self.value():
                return queryset.filter(**{filter: self.value()})
    return byFieldFilter

# Using Database
class interclubsMixin:
    using = 'interClubs'

    def save_model(self, request, obj, form, change):
        obj.save(using=self.using)

    def delete_model(self, request, obj):
        obj.delete(using=self.using)

    def get_queryset(self, request):
        return super().get_queryset(request).using(self.using)

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        return super().formfield_for_foreignkey(db_field, request, using=self.using, **kwargs)

    def formfield_for_manytomany(self, db_field, request, **kwargs):
        return super().formfield_for_manytomany(db_field, request, using=self.using, **kwargs)


class interclubsTabularInline(interclubsMixin, admin.TabularInline):
    pass
class interclubsModelAdmin(interclubsMixin, admin.ModelAdmin):
    pass


# Inline
class ScoreInline(interclubsTabularInline):
    model = Score
    fields = ('Grimpeur', ('IDVoie1', 'Voie1'), ('IDVoie2', 'Voie2'), ('IDVoie3', 'Voie3'), ('IDVoie4', 'Voie4'), 'Bloc1', 'Bloc2', ('Vitesse', 'PtsVitesse'), 'Points')
    ordering = ('Ordre',)
    readonly_fields = ('PtsVitesse', 'Points')
    max_num = 8
    verbose_name = 'Grimpeur'


# ModelAdmin
class NiveauAdmin(interclubsModelAdmin):
    list_display = ('__str__', 'Categorie', 'Actif')
    list_filter = ('Categorie', 'Actif')
    fieldsets = (
        (None, {
            'fields': (('NomVoie', 'NiveauVoie'), 'Categorie', ('PtsValorises', 'PtsVoieComplete'), 'Actif'),
        }),
    )

class ClubAdmin(interclubsModelAdmin):
    list_display = ('Nom', 'Localisation')
    fieldsets = (
        (None, {
            'fields': ('Nom', 'Localisation'),
        }),
    )

class GrimpeurAdmin(interclubsModelAdmin):
    list_display = ('__str__', 'Club', 'AnneeNaissance', 'Sexe')
    list_filter = (NomFirstLetterFilter, byField(Club, 'Nom', 'Club'), 'AnneeNaissance', 'Sexe')
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

class SaisonAdmin(interclubsModelAdmin):
    pass

class RencontreAdmin(interclubsModelAdmin):
    list_display = ('Date', 'Club')
    list_filter = (byField(Club, 'Nom', 'Club'), 'Date')

class EquipeAdmin(interclubsModelAdmin):
    list_display = ('__str__', 'Rencontre', 'Categorie')
    list_filter = (byField(Club, 'Nom', 'Club'), byField(Rencontre, '__str__', 'Rencontre'), 'Categorie')
    search_fields = ('Club__Nom', 'Club__Localisation', 'Rencontre__Club__Nom', 'Rencontre__Club__Localisation')
    search_help_text = "Recherchez par le nom du club de l'équipe ou de la rencontre"
    fieldsets = (
        (None, {
            'fields': (('Rencontre', 'Categorie'), ('Club', 'Numero')),
        }),
    )
    inlines = [ScoreInline]

class ScoreAdmin(interclubsModelAdmin):
    list_display = ('Grimpeur', 'get_rencontre', 'get_categorie', 'Points')
    list_filter = (
        GrimpeurFirstLetterFilter,
        byField(Rencontre, '__str__', 'Equipe__Rencontre', 'Rencontre'),
        'Equipe__Categorie',
        'Grimpeur__Sexe',
    )
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
admin.site.register(Saison, SaisonAdmin)
admin.site.register(Rencontre, RencontreAdmin)
admin.site.register(Equipe, EquipeAdmin)
admin.site.register(Score, ScoreAdmin)
