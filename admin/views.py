from django.views.generic.edit import FormView, CreateView, DeleteView
from django.views.generic.base import RedirectView, TemplateView
from django.views.generic.detail import SingleObjectMixin, DetailView
from django.views.generic.list import ListView
from django.contrib.auth.mixins import UserPassesTestMixin
from django.db.models.functions import MD5, Concat
from django.db.models import Value as V, Prefetch
from django.db import transaction
from django.urls import reverse_lazy
from django.http import HttpResponse, HttpResponseRedirect
from django.template.loader import get_template
from django.utils.dateparse import parse_date

from datetime import datetime
import json

from core.models import Club, Rencontre, Categorie, Voie
from admin.middleware import WithRencontreRequiredMixin
from .forms import *
from .models import *

# TODO: Faire en sorte d'utiliser l'id de la rencontre passée en paramètre pour les queryset de ces View
# Sinon l'admin est obligé de sélectionner la rencontre sur laquelle il veut travailler.

class SuperUserRequiredMixin(UserPassesTestMixin):
    def test_func(self):
        return self.request.user.is_superuser
class StaffRequiredMixin(UserPassesTestMixin):
    def test_func(self):
        return self.request.user.is_staff



class ClubQRCodesView(StaffRequiredMixin, WithRencontreRequiredMixin, ListView):
    model = Coach
    template_name = 'admin/qrcode_club.html'

    def get_queryset(self):
        return super().get_queryset().select_related('club').prefetch_related('club__grimpeurs')

    def get_context_data(self, **kwargs):
        import socket
        ip = socket.gethostbyname(socket.gethostname())
        if not ip or ip == "127.0.0.1": ip = socket.gethostbyname(socket.getfqdn())
        kwargs.setdefault('server_ip', ip)

        kwargs['config'] = Config
        kwargs['environ'] = self.request.environ if hasattr(self.request, 'environ') else self.request.META
        return super().get_context_data(**kwargs)


class RencontreSelectionView(SuperUserRequiredMixin, FormView):
    success_url = reverse_lazy('rencontre:select')
    form_class = RencontreSelectionForm
    template_name = 'admin/select.html'

    def get_initial(self):
        initial = super().get_initial()
        initial.setdefault('rencontre', self.request.interclub.rencontre)
        return initial

    def form_valid(self, form):
        if not hasattr(self.request.user, 'profil'):
            Profil(user=self.request.user, rencontre=form.cleaned_data['rencontre']).save()
        else:
            self.request.user.profil.rencontre = form.cleaned_data['rencontre']
            self.request.user.profil.save()
        return HttpResponseRedirect(self.get_success_url() + f"?rencontre={form.cleaned_data['rencontre'].id}")

class RencontreCreateView(SuperUserRequiredMixin, CreateView):
    success_url = reverse_lazy('rencontre:select')
    form_class = RencontreCreateForm
    template_name = 'admin/create.html'

    def get_initial(self):
        now = datetime.now()
        categorie = self.request.POST.get('categorie')

        initial = super().get_initial()
        initial.update({
            'saison': now.year + (now.month > 8),
            'date': now.date(),
        })
        if categorie == Categorie.enfants:
            initial['voiesGroupees'] = True
        if not categorie is None:
            initial['voies'] = Voie.objects.actifs().categorie(categorie)
        return initial

class RencontreDeleteView(SuperUserRequiredMixin, DeleteView):
    success_url = reverse_lazy('rencontre:select')
    model = Rencontre
    template_name = 'admin/delete.html'
    context_object_name = 'object'


class RencontreStartView(SuperUserRequiredMixin, DetailView, RedirectView):
    model = Rencontre
    url = reverse_lazy('rencontre:qrcode-clubs')
    query = "rencontre=%(pk)s"

    def get_redirect_url(self, *args, **kwargs):
        url = super().get_redirect_url(*args, **kwargs)
        if self.query:
            url += '?' + (self.query % kwargs)
        return url

    @transaction.atomic
    def get(self, request, *args, **kwargs):
        rencontre = self.object = self.get_object()
        clubs = Club.objects.all()

        for club in clubs:
            coach = Coach(club=club, rencontre=rencontre)
            user = User(username=coach.token, first_name=club.nom, last_name=club.ville)
            user.set_unusable_password()
            user.save()
            coach.user = user
            coach.save()

        return HttpResponseRedirect(self.get_redirect_url(*args, **kwargs))

class RencontreStopView(SuperUserRequiredMixin, DetailView, FormView):
    model = Rencontre
    success_url = reverse_lazy('rencontre:select')
    form_class = ConfirmationForm
    template_name = 'admin/stop.html'
    context_object_name = 'object'

    def get(self, request, *args, **kwargs):
        self.object = self.get_object()
        return super().get(request, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        self.object = self.get_object()
        return super().post(request, *args, **kwargs)

    @transaction.atomic
    def form_valid(self, form):
        rencontre = self.object.pk
        # Sélection des users et profils à supprimer (pour forcer la déconnexion)
        # NOTE: La suppression automatique de django-polymorphism ne fonctionne pas.
        ids = User.objects.select_related('profil') \
            .filter(profil__rencontre_id=rencontre) \
            .exclude(is_superuser=True) \
            .values_list('id', 'profil__id')
        users_id = [u for u,p in ids]
        profils_id = [p for u,p in ids]
        users = User.objects.filter(id__in=users_id)
        juges = Juge.objects.filter(profil_ptr_id__in=profils_id)
        coachs = Coach.objects.filter(profil_ptr_id__in=profils_id)

        # Suppression des objets
        # (les profils sont supprimés à la suppression de l'objet enfant)
        juges.delete()
        coachs.delete()
        users.delete()

        return super().form_valid(form)

class RencontreReportViewMixin:
    model = Rencontre
    template_name = 'reports/ranking.html'

    @staticmethod
    def ranking(scores):
        rank = 1
        for temps, group in groupby(scores, key=lambda s: s.points):
            group = list(group)
            for score in group:
                score.rank = rank
            rank += len(group)
        return scores

    @staticmethod
    def ranking_vitesse(scores):
        pass

    def get_queryset(self):
        interclub = self.request.interclub
        if not interclub.rencontre: return Score.objects.none()
        queryset = Rencontre.objects.prefetch_related(
                Prefetch('equipes', queryset=Equipe.objects.with_valide_and_points().prefetch_related(
                        Prefetch('membres', queryset=Score.objects.with_valide_and_points().prefetch_related(
                                Prefetch('performances', queryset=Performance.objects.with_related()),
                            ).select_related('grimpeur__club')
                        )
                    ).select_related('club')
                ),
                'voies'
            ).select_related('club').with_counts().with_valide()

        return queryset

class RencontreReportView(RencontreReportViewMixin, SuperUserRequiredMixin, DetailView):
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        rencontre = self.object

        # On répertorie les voies dans l'ordre
        voies = [voie for voie in sorted(rencontre.voies.all(), key=lambda v: (v.nom[0], int(v.nom.split(' ')[0][1:]) if v.type==TypeVoie.diff else v.nom))]
        voies.append("Abandon")

        # On élabore les classements et les listes
        equipes = sorted(rencontre.equipes.all(), key=lambda o: o.points, reverse=True)
        inscrits = [membre for equipe in rencontre.equipes.all() for membre in equipe.membres.all()]

        hommes = [s for s in inscrits if s.grimpeur.sexe==Genre.homme]
        hommes = self.ranking(sorted(hommes, key=lambda s: s.points, reverse=True))
        femmes = [s for s in inscrits if s.grimpeur.sexe==Genre.femme]
        femmes = self.ranking(sorted(femmes, key=lambda s: s.points, reverse=True))

        inscrits = [s.grimpeur for s in inscrits]
        inscrits = sorted(inscrits, key=lambda s: (s.club.nom, s.nom, s.prenom))
        inscrits = [(c,list(g)) for c,g in groupby(inscrits, key=attrgetter('club.nom'))]

        # On compte les passages dans chaques voies par genre de grimpeur et état de réussite
        counts = {}
        temps = []
        performances = [perf for equipe in rencontre.equipes.all() for score in equipe.membres.all() for perf in score.performances.all()]
        for p in performances:
            voie = p.voie
            etat = p.voie.etat(p.etat)
            if p.voie is None or p.points is None or etat == "Abandon":
                voie = "Abandon"
                etat = TypeVoie(p.voie.type if p.voie else TypeVoie.diff).label
            if p.temps is not None:
                temps.append({'x': str(voie), 'y': p.temps.total_seconds()})
            if not voie in counts: counts[voie] = {g:0 for g in Genre}
            counts[voie][p.score.grimpeur.sexe] += 1
            if etat not in counts[voie]:
                counts[voie][etat] = 1
            else:
                counts[voie][etat] += 1

        # On répertorie les états dans l'ordre (du moins bien au top / c'est dépendant de l'ordre entré en base)
        etats = []
        for voie in reversed(voies):
            if isinstance(voie, str): continue
            for etat in voie.zones.keys():
                if etat in etats: continue
                if 'rank' in etat: continue # On ne traite pas les états calculés
                etats.append(etat)

        # On prépare les datasets
        stats = {}
        maximum = 0
        for genre in Genre:
            lst = [counts.get(voie, {}).get(genre, 0)  for voie in voies]
            maximum += max(lst)
            stats[('genre', Genre(genre).label)] = lst
        for etat in etats:
            if etat.lower() in ['a réaliser', 'abandon']: continue
            stats[('etat', etat)] = [counts.get(voie, {}).get(etat, 0) for voie in voies]
        for type,label in TypeVoie.choices:
            if type is None: continue
            stats[('etat', label)] = [counts.get(voie, {}).get(label, 0) for voie in voies]
        stats = {
            'labels': [str(voie) for voie in voies],
            'datasets': stats,
            'temps': temps,
            'max': 10 * (1 + max([maximum, max([t['y'] for t in temps])]) // 10),
        }

        context.update({
            'equipes': equipes,
            'classements': [(Genre.homme, hommes), (Genre.femme, femmes)],
            'inscrits': inscrits,
            'stats': stats,
            'report': self.kwargs.get('report', 'stats'),
        })

        return context

class MultiRencontreReportView(RencontreReportViewMixin, SuperUserRequiredMixin, ListView):
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        rencontres = list(self.object_list.all())

        inscrits = [membre for rencontre in rencontres for equipe in rencontre.equipes.all() for membre in equipe.membres.all()]

        inscrits = list({m.grimpeur_id:m.grimpeur for m in inscrits}.values())
        inscrits = sorted(inscrits, key=lambda s: (s.club.nom, s.nom, s.prenom))
        inscrits = [(c,list(g)) for c,g in groupby(inscrits, key=attrgetter('club.nom'))]

        # TODO: Faire l'export pour la saison complète :
        #  - Classement individuel (somme des points de la saison pour le grimpeur)
        #  - Classement par équipe (somme des points de la saison pour l'équipe N)
        #equipes = sorted([equipe for rencontre in rencontres for equipe in rencontre.equipes.all()], key=lambda o: o.points, reverse=True)
        #
        #hommes = [s for s in inscrits if s.grimpeur.sexe==Genre.homme]
        #hommes = self.ranking(sorted(hommes, key=lambda s: s.points, reverse=True))
        #femmes = [s for s in inscrits if s.grimpeur.sexe==Genre.femme]
        #femmes = self.ranking(sorted(femmes, key=lambda s: s.points, reverse=True))
        #
        #inscrits = [s.grimpeur for s in inscrits]
        #inscrits = sorted(inscrits, key=lambda s: (s.club.nom, s.nom, s.prenom))
        #inscrits = [(c,list(g)) for c,g in groupby(inscrits, key=attrgetter('club.nom'))]

        context.update({
            'inscrits': inscrits,
            'report': self.kwargs.get('report', 'stats'),
        })

        return context

    def get_queryset(self):
        date = self.request.GET.get('date')
        if date:
            date = parse_date(date)

        queryset = super().get_queryset()
        if date:
            queryset = queryset.filter(date=date)

        return queryset
