from api.serializers import RencontreSerializer
from core.models import Rencontre
from django.core.exceptions import ObjectDoesNotExist

def get_rencontre(request):
    try:
        if hasattr(request, 'interclub') and request.interclub.rencontre:
            rencontre = Rencontre.objects.prefetch_related('voies').get(pk=request.interclub.rencontre)
            serializer = RencontreSerializer(rencontre)
            return {"rencontre": serializer.data}
    except ObjectDoesNotExist:
        pass
    return {}
