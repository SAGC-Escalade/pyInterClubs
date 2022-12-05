class inMetaRouter:
    def db_for_read(self, model, **hints):
        if not hasattr(model, 'Meta'): return None
        return getattr(model.Meta, '_using', None)

    def db_for_write(self, model, **hints):
        if not hasattr(model, 'Meta'): return None
        return getattr(model.Meta, '_using', None)

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        return True
