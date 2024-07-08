from api.serializers import RencontreSerializer

def get_rencontre(request):
    if hasattr(request, 'user') and hasattr(request.user, 'profil') and request.user.profil.rencontre:
        return {'rencontre': RencontreSerializer(request.user.profil.rencontre).data}
    #if hasattr(request, 'interclub'):
    #    return {"rencontre": RencontreSerializer(request.interclub.rencontre).data}
    return {}
