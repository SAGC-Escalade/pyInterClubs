from django.apps import AppConfig


class coreConfig(AppConfig):
    name = 'core'

    def ready(self):
        import core.signals
