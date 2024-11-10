from django.contrib import admin
from django import forms
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


# Inline
class ScoreInline(admin.TabularInline):
    model = Score
    fk_name = 'equipe'
    show_change_link = True
    fields = ('grimpeur', 'clubPreteur')
    ordering = ('ordre',)
    readonly_fields = ('grimpeur', 'clubPreteur')
    max_num = 8
    verbose_name = 'Participant'
class PerfsInline(admin.TabularInline):
    model = Performance
    fk_name = 'score'
    show_change_link = True
    fields = ('voie', 'etat', 'temps', 'points')
    readonly_fields = ('voie', 'etat', 'temps', 'points')
    max_num = 6
    verbose_name = 'Performance'


# ModelAdmin
@admin.register(Voie)
class VoieAdmin(admin.ModelAdmin):
    list_display = ('nom', 'niveau', 'type', 'categorie', 'genre', 'actif')
    list_filter = ('actif', 'categorie', 'genre')
    search_fields = ('nom', 'niveau')
    search_help_text = "Recherchez par le nom ou la difficultée de l'épreuve"
    fieldsets = (
        (None, {
            'fields': ('actif', ('nom', 'niveau')),
        }),
        ('Caractéristiques de la voie', {
            'fields': ('type', 'categorie', 'genre', 'zones'),
        }),
    )

@admin.register(Club)
class ClubAdmin(admin.ModelAdmin):
    list_display = ('nom', 'ville', 'grimpeurs_count')
    search_fields = ('nom', 'ville')
    search_help_text = "Recherchez par le nom du club ou de la ville"
    fieldsets = (
        (None, {
            'fields': ('nom', 'ville'),
        }),
    )

    @admin.display(description="Nb de grimpeurs")
    def grimpeurs_count(self, obj):
        return obj.grimpeurs.count()

@admin.register(Grimpeur)
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

@admin.register(Rencontre)
class RencontreAdmin(admin.ModelAdmin):
    date_hierarchy = 'date'
    list_display = ('saison', 'date', 'club_ville', 'categorie')
    list_filter = (byField(Club, 'ville', 'club__ville'), 'saison', 'categorie')
    search_fields = ('saison', 'date', 'club__ville')
    search_help_text = "Recherchez par le nom du club acceuillant, la date ou la saison"

    fieldsets = (
        (None, {
            'fields': ('saison', 'date', 'club', 'categorie'),
        }),
        ('Caractéristiques de la rencontre', {
            'fields': ('nbBloc', 'nbDiff', 'nbVitesse', 'voiesReutilisables', 'voiesGroupees'),
        }),
    )

    @admin.display(description="Lieu")
    def club_ville(self, obj):
        return obj.club.ville

@admin.register(Equipe)
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
    inlines = [ScoreInline]

@admin.register(Score)
class ScoreAdmin(admin.ModelAdmin):
    list_display = ('grimpeur', 'get_rencontre', 'get_equipe')
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
            'fields': ('equipe', 'grimpeur'),
        }),
        ('Options avancées', {
            'classes': ('collapse',),
            'fields': ('clubPreteur', 'ordre'),
        }),
    )
    readonly_fields = ('equipe',)
    inlines = [PerfsInline]

    @admin.display(ordering='equipe__rencontre', description='Rencontre')
    def get_rencontre(self, obj):
        return str(obj.equipe.rencontre)
    @admin.display(ordering='equipe__club_id', description='Equipe')
    def get_equipe(self, obj):
        return str(obj.equipe)


class PerformanceForm(forms.ModelForm):
    class Meta:
        model = Performance
        fields = '__all__'
    etat = forms.ChoiceField()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        instance = kwargs.get('instance')
        if instance is None or instance.voie_id is None: return
        self.fields['etat'].choices = enumerate(instance.voie.zones.keys())

@admin.register(Performance)
class PerformanceAdmin(admin.ModelAdmin):
    list_display = ('score_grimpeur', 'voie', 'etat', 'temps', 'points')
    list_filter = ('etat', 'voie')
    search_fields = ('score__grimpeur__nom', 'score__grimpeur__prenom')
    search_help_text = "Recherchez par le nom du grimpeur"
    fieldsets = (
        (None, {
            'fields': ('voie', 'temps', 'points', 'etat'),
        }),
    )
    form = PerformanceForm

    @admin.display(description="Grimpeur")
    def score_grimpeur(self, obj):
        return obj.score.grimpeur

@admin.register(RencontreVoie)
class RencontreVoieAdmin(admin.ModelAdmin):
    list_display = ('rencontre', 'voie', 'juge')
    list_filter = ('rencontre',)
