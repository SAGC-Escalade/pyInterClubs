from api.serializers import RencontreSerializer
from core.models import Rencontre

def get_rencontre(request):
    if hasattr(request, 'interclub') and request.interclub.rencontre:
        return {"rencontre": RencontreSerializer(Rencontre.objects.prefetch_related('voies').get(pk=request.interclub.rencontre)).data}
    return {}
