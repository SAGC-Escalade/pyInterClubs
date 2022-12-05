class inModelRouter:
    def db_for_read(self, model, **hints):
        return getattr(model, '_using', None)

    def db_for_write(self, model, **hints):
        return getattr(model, '_using', None)

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        return True
