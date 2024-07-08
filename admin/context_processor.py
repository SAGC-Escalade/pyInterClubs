from api.serializers import RencontreSerializer

def get_rencontre(request):
    if hasattr(request, 'interclub'):
        return {"rencontre": RencontreSerializer(request.interclub.rencontre).data}
    return {}
