from django.views import View
from django.views.generic.edit import FormView
from django.views.generic.list import ListView
from django.contrib.auth.mixins import UserPassesTestMixin
from django.db.models.functions import MD5, Concat
from django.db.models import Value as V
from django.urls import reverse_lazy
from django.http import HttpResponseRedirect


from core.models import Club, Rencontre
from .forms import *
from .models import *


class SuperUserRequiredMixin(UserPassesTestMixin):
    def test_func(self):
        return self.request.user.is_superuser


class ClubQRCodesView(SuperUserRequiredMixin, ListView):
    model = Club
    template_name = 'admin/qrcode_club.html'

    def get_queryset(self):
        return super().get_queryset().annotate(md5=MD5(Concat('nom', V(f"-{self.request.interclub.rencontre}")))).order_by('nom')

    def get_context_data(self, **kwargs):
        import socket
        ip = socket.gethostbyname(socket.gethostname())
        if not ip or ip == "127.0.0.1": ip = socket.gethostbyname(socket.getfqdn())
        kwargs.setdefault('server_ip', ip)

        kwargs['config'] = Config
        kwargs['environ'] = self.request.environ if hasattr(self.request, 'environ') else self.request.META
        return super().get_context_data(**kwargs)


class RencontreSelectionView(SuperUserRequiredMixin, FormView):
    success_url = reverse_lazy('qrcode-clubs')
    form_class = RencontreSelectionForm
    template_name = 'admin/rencontres-list.html'

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

    #def get_success_url(self):
    #    print(dir(self))
    #    return self.success_url + f"?rencontre="
