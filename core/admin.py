from django.contrib import admin
from .models import *

# Filter
class FirstLetterFilter(admin.SimpleListFilter):
    title = 'Première lettre'
    parameter_name = 'nom'

    def lookups(self, request, model_admin):
        return [c+c for c in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ']

class NomFirstLetterFilter(FirstLetterFilter):
    def queryset(self, request, queryset):
        if self.value() is None:
            return queryset.all()
        return queryset.filter(nom__startswith=self.value())

class GrimpeurFirstLetterFilter(FirstLetterFilter):
    def queryset(self, request, queryset):
        if self.value() is None:
            return queryset.all()
        return queryset.filter(grimpeur__nom__startswith=self.value())

def byField(model, field, filter, title=None):
    _title = title
    if title is None: _title = filter

    class byFieldFilter(admin.SimpleListFilter):
        title = _title
        parameter_name = _title

        def lookups(self, request, model_admin):
            #queryset = model.objects.using('interClubs').all()
            queryset = model.objects.all()
            lst = []
            for o in queryset:
                value = getattr(o, field)
                if callable(value):
                    try: value = value()
                    except e: value = None
                value = str(value)
                lst.append((o.id, value))
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
class ScoreInline(admin.TabularInline):
    model = Score
    #fields = ('Grimpeur', ('IDVoie1', 'Voie1'), ('IDVoie2', 'Voie2'), ('IDVoie3', 'Voie3'), ('IDVoie4', 'Voie4'), 'Bloc1', 'Bloc2', ('Vitesse', 'PtsVitesse'), 'Points')
    fields = ('grimpeur', 'points', 'valide')
    ordering = ('ordre',)
    #readonly_fields = ('PtsVitesse', 'Points')
    max_num = 8
    verbose_name = 'Participant'


# ModelAdmin
class NiveauAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'actif')
    list_filter = ('actif',)
    fieldsets = (
        (None, {
            'fields': (('nom', 'niveau', 'type', 'actif'), 'zones'),
        }),
    )

class ClubAdmin(admin.ModelAdmin):
    list_display = ('nom', 'ville')
    fieldsets = (
        (None, {
            'fields': ('nom', 'ville'),
        }),
    )

class GrimpeurAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'club', 'anneeNaissance', 'sexe')
    list_filter = (NomFirstLetterFilter, byField(Club, 'nom', 'club'), 'anneeNaissance', 'sexe')
    search_fields = ('nom', 'prenom', 'club__nom', 'club__ville')
    search_help_text = "Recherchez par le nom, le prénom ou le club d'un grimpeur"
    fieldsets = (
        ('Identité', {
            'fields': (('nom', 'prenom'), 'anneeNaissance', 'sexe'),
        }),
        ('Informations de la Fédération', {
            'fields': ('club', 'licence'),
        }),
    )

class RencontreAdmin(admin.ModelAdmin):
    list_display = ('date', 'club')
    list_filter = (byField(Club, 'nom', 'club'), 'date')

class EquipeAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'rencontre')
    list_filter = (byField(Club, 'nom', 'club'), byField(Rencontre, '__str__', 'rencontre'))
    search_fields = ('club__nom', 'club__ville', 'rencontre__club__nom', 'rencontre__club__ville')
    search_help_text = "Recherchez par le nom du club de l'équipe ou de la rencontre"
    fieldsets = (
        (None, {
            'fields': ('rencontre', ('club', 'numero')),
        }),
    )
    #inlines = [ScoreInline]

class ScoreAdmin(admin.ModelAdmin):
    list_display = ('grimpeur', 'get_rencontre', 'get_categorie', 'points')
    list_filter = (
        GrimpeurFirstLetterFilter,
        byField(Rencontre, '__str__', 'equipe__rencontre', 'rencontre'),
        'equipe__rencontre__categorie',
        'grimpeur__sexe',
    )
    search_fields = ('grimpeur__nom', 'grimpeur__prenom', 'grimpeur__club__nom', 'grimpeur__club__ville')
    search_help_text = "Recherchez par le nom, le prénom ou le club d'un grimpeur"
    fieldsets = (
        ('Grimpeur', {
            'fields': ('equipe', 'grimpeur', 'clubPreteur'),
        }),
        ('Options avancées', {
            'classes': ('collapse',),
            'fields': ('ordre',),
        }),
    )

    @admin.display(ordering='equipe__rencontre', description='Rencontre')
    def get_rencontre(self, obj):
        return str(obj.equipe.rencontre)
    @admin.display(ordering='equipe__rencontre__categorie', description='Catégorie')
    def get_categorie(self, obj):
        return Categorie(obj.equipe.rencontre.categorie).name

class PerformanceAdmin(admin.ModelAdmin):
    pass

# Register your models here
admin.site.register(Niveau, NiveauAdmin)
admin.site.register(Club, ClubAdmin)
admin.site.register(Grimpeur, GrimpeurAdmin)
admin.site.register(Rencontre, RencontreAdmin)
admin.site.register(Equipe, EquipeAdmin)
admin.site.register(Score, ScoreAdmin)
admin.site.register(Performance, PerformanceAdmin)
