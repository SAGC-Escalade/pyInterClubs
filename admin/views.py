from django.views.generic import FormView, CreateView, DeleteView, ListView, TemplateView
from django.contrib.auth.mixins import UserPassesTestMixin
from django.db.models.functions import MD5, Concat
from django.db.models import Value as V
from django.urls import reverse_lazy
from django.http import HttpResponseRedirect

from datetime import datetime

from core.models import Club, Rencontre, Categorie, Voie
from admin.middleware import WithRencontreRequiredMixin
from .forms import *
from .models import *


class SuperUserRequiredMixin(UserPassesTestMixin):
    def test_func(self):
        return self.request.user.is_superuser
class StaffRequiredMixin(UserPassesTestMixin):
    def test_func(self):
        return self.request.user.is_staff


class ClubQRCodesView(StaffRequiredMixin, WithRencontreRequiredMixin, ListView):
    model = Club
    template_name = 'admin/qrcode_club.html'

    def get_queryset(self):
        # TODO: Simplifier la requête en comptant directement le nombre de grimpeurs plutôt que de les récupérer
        return super().get_queryset().prefetch_related('grimpeurs') \
            .annotate(md5=MD5(Concat('nom', V(f"-{self.request.interclub.rencontre}"))))

    def get_context_data(self, **kwargs):
        import socket
        ip = socket.gethostbyname(socket.gethostname())
        if not ip or ip == "127.0.0.1": ip = socket.gethostbyname(socket.getfqdn())
        kwargs.setdefault('server_ip', ip)

        kwargs['config'] = Config
        kwargs['environ'] = self.request.environ if hasattr(self.request, 'environ') else self.request.META
        return super().get_context_data(**kwargs)


class RencontreSelectionView(SuperUserRequiredMixin, FormView):
    success_url = reverse_lazy('rencontre:qrcode-clubs')
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
            initial['voies'] = Voie.objects.filter(actif=True, categorie=categorie)
        return initial

class RencontreDeleteView(SuperUserRequiredMixin, DeleteView):
    success_url = reverse_lazy('rencontre:select')
    model = Rencontre
    template_name = 'admin/delete.html'
    context_object_name = 'object'
