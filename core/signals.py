from django.db.models.signals import pre_save, post_save, post_delete
from django.dispatch import receiver

from .models import *


@receiver(post_save, sender=Performance, dispatch_uid='proceed_speed_points')
@receiver(post_delete, sender=Performance, dispatch_uid='proceed_speed_points')
def proceed_speed_points(sender, instance, **kwargs):
    perf = instance
    # A la création d'une perf, il ne doit pas encore y avoir de points.
    # Lors d'un import, les points sont déjà calculés.
    if perf._state.adding: return

    if perf.tracker.has_changed('temps') and perf.voie_id and perf.voie.type == TypeVoie.vitesse:
        if perf.score_id and perf.score.equipe_id and perf.score.equipe.rencontre_id:
            perf.score.equipe.rencontre.proceed_speed_points(perf)
            perf.refresh_from_db()
    elif perf.tracker.has_changed('points') and perf.score_id:
        perf.score.refresh('points')



@receiver(pre_save, sender=Performance)
def detect_changes_pre_save(sender, instance, **kwargs):
    if instance.pk:  # Si l'instance existe déjà
        old_instance = sender.objects.get(pk=instance.pk)
        if instance.tracker.has_changed('temps') or instance.tracker.has_changed('points'):
            update_score_points(instance)

@receiver(post_delete, sender=Performance)
def update_score_on_performance_delete(sender, instance, **kwargs):
    update_score_points(instance)

def update_score_points(instance):
    score = instance.score
    total_points = sum(perf.points for perf in score.performances.all() if perf.points is not None)
    score.points = total_points
    score.save()
