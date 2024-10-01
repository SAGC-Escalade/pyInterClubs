from django.apps import AppConfig


class apiConfig(AppConfig):
    name = 'api'

    def ready(self):
        import api.signals
