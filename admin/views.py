from django.views import View
from django.views.generic.edit import FormView
from django.views.generic.list import ListView
from django.contrib.auth.mixins import UserPassesTestMixin
from django.db.models.functions import MD5
from django.urls import reverse_lazy


from core.models import Club, Saison
from .forms import MancheSelectionForm
from .models import Config


class SuperUserRequiredMixin(UserPassesTestMixin):
    def test_func(self):
        return self.request.user.is_superuser


class ClubQRCodesView(SuperUserRequiredMixin, ListView):
    model = Club
    template_name = 'admin/qrcode_club.html'

    def get_queryset(self):
        return super().get_queryset().annotate(md5=MD5('Nom'))

    def get_context_data(self, **kwargs):
        import socket
        ip = socket.gethostbyname(socket.gethostname())
        if not ip or ip == "127.0.0.1": ip = socket.gethostbyname(socket.getfqdn())
        if 'server_ip' not in kwargs: kwargs['server_ip'] = ip

        kwargs['config'] = Config
        return super().get_context_data(**kwargs)


class RencontresListView(SuperUserRequiredMixin, ListView):
    model = Saison
    template_name = 'admin/rencontres-list.html'

    def get_context_data(self, **kwargs):
        if 'rencontre' not in kwargs: kwargs['rencontre'] = Config.get('CURRENT_RENCONTRE')
        if 'categorie' not in kwargs: kwargs['categorie'] = Config.get('CURRENT_CATEGORIE')
        return super().get_context_data(**kwargs)

class MancheSelectionView(SuperUserRequiredMixin, FormView):
    success_url = reverse_lazy('rencontres')
    form_class = MancheSelectionForm
    template_name = 'admin/form.html'

    def post(self, request, *args, **kwargs):
        post = request.POST
        if 'selected' in post:
            post._mutable = True
            post['rencontre'] = post['selected'].split('-')[0]
            post['categorie'] = post['selected'].split('-')[1]
            post._mutable = False
        return super().post(request, *args, **kwargs)

    def form_valid(self, form):
        form.save()
        return super().form_valid(form)

class ManchesListView(SuperUserRequiredMixin, View):
    def get(self, request, *args, **kwargs):
        return RencontresListView.as_view()(request, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        return MancheSelectionView.as_view()(request, *args, **kwargs)
