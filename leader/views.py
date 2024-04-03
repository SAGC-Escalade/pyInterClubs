from django.views.generic import DetailView #, ListView, FormView

from core.models import *
from admin.models import *

from api.serializers import RencontreSerializer


class EquipeUpdateView(DetailView):
    model = Equipe
    template_name = 'leader/edit_equipe.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context.setdefault('rencontre', RencontreSerializer(self.object.rencontre).data)
        return context
