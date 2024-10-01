from django.db.models.signals import pre_save, post_save, post_delete
from django.dispatch import receiver

from .models import *


@receiver(post_save, sender=Performance, dispatch_uid='proceed_speed_points')
@receiver(post_delete, sender=Performance, dispatch_uid='proceed_speed_points')
def proceed_speed_points(sender, instance, created=False, **kwargs):
    # A la création d'une perf, il ne doit pas encore y avoir de points.
    # Et lors d'un import, les points sont déjà calculés.
    if created: return

    perf = instance
    if perf.tracker.has_changed('temps') and perf.voie_id and perf.voie.type == TypeVoie.vitesse:
        if perf.score_id and perf.score.equipe_id and perf.score.equipe.rencontre_id:
            perf.score.equipe.rencontre.proceed_speed_points(perf)
            perf.refresh_from_db()
