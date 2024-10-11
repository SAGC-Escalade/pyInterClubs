from django.views.generic.edit import FormView, CreateView, DeleteView
from django.views.generic.base import RedirectView, TemplateView
from django.views.generic.detail import SingleObjectMixin, DetailView
from django.views.generic.list import ListView
from django.contrib.auth.mixins import UserPassesTestMixin
from django.db.models.functions import MD5, Concat
from django.db.models import Value as V
from django.db import transaction
from django.urls import reverse_lazy
from django.http import HttpResponse, HttpResponseRedirect
from django.template.loader import get_template
from xhtml2pdf import pisa

from datetime import datetime

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


class PDFTemplateMixin:
    """Ce mixin permet de rendre un fichier pdf en lieu et place du document HTML"""
    pdf_filename = 'document.pdf'   # Nom du document pdf téléchargé
    pdf_template_name = None        # Utilise le template HTML par défaut
    always_render_pdf = True

    def get_pdf_template_name(self):
        if self.pdf_template_name:
            return self.pdf_template_name
        return self.template_name

    def render_to_pdf(self, context, **kwargs):
        template_name = self.get_pdf_template_name()
        html = get_template(template_name).render(context)
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{self.pdf_filename}"'
        pisa_status = pisa.CreatePDF(html, dest=response)
        if pisa_status.err:
            return HttpResponse('Une erreur est survenue lors de la génération du PDF', status=400)
        return response

    def render_to_response(self, context, **kwargs):
        if self.always_render_pdf or \
            self.request.META.get('HTTP_ACCEPT') == 'application/pdf' or \
            self.request.GET.get('format') == 'pdf':
            return self.render_to_pdf(context, **kwargs)
        super().render_to_response(context, **kwargs)


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
            'saison': now.year - (now.month < 8),
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

class RencontreReportView(SuperUserRequiredMixin, PDFTemplateMixin, ListView):
    model = Score
    template_name = 'reports/ranking.html'
    pdf_filename = 'ranking.pdf'

    def get_queryset(self):
        interclub = self.request.interclub
        if not interclub.rencontre: return Score.objects.none()
        rencontre = Rencontre.objects.get(pk=interclub.rencontre)
        queryset = Score.objects.with_related() \
            .filter(equipe__rencontre__date=rencontre.date) \
            .annotate(categorie=F('equipe__rencontre__categorie')) \
            .with_valide_and_points() \
            .order_by('-points')

        return queryset
