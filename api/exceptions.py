from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from django.db.models import ProtectedError

def custom_exception_handler(exc, context):
    # Vérifier si l'exception est de type ProtectedError
    if isinstance(exc, ProtectedError):
        custom_response_data = {
            'delete': 'Suppression impossible : cet élément est protégé car il contient d\'autres éléments.',
        }
        return Response(custom_response_data, status=status.HTTP_400_BAD_REQUEST)
    
    # Appeler le gestionnaire d'exception par défaut pour obtenir la réponse initiale
    return exception_handler(exc, context)
