from django.db.models.signals import pre_save, post_save, post_delete
from django.db.models import Prefetch
from django.db import transaction
from django.dispatch import receiver
from django_eventstream import send_event

from core.models import *
from .serializers import *


###############################################################################
# On ne dynamise que les 3 modèle Equipe, Score et Performance.               #
# Se sont les seuls modèles modifiés durant une rencontre, les autres         #
# le sont en dehors de la rencontre ou imposeront un rechargement de la page. #
###############################################################################


@receiver(post_save, sender=Equipe, dispatch_uid='SSE_signal')
def send_notification(sender, instance, created=False, **kwargs):
    def send(instance, created, changed):
        serializer = EquipeSerializer(instance, read_only=True)
        send_event('events', serializer.url_list, serializer.data)
        if not created:
            send_event('events', serializer.url_detail, serializer.data)

    transaction.on_commit(lambda: send(instance, created, {}))

@receiver(post_delete, sender=Equipe, dispatch_uid='SSE_signal')
def send_notification(sender, instance, created=False, **kwargs):
    send_event('events', EquipeSerializer.url_list, {'deleted': {'id': instance.id}})


@receiver(post_save, sender=Score, dispatch_uid='SSE_signal')
def send_notification(sender, instance, created=False, **kwargs):
    def send(instance, created, changed):
        # Reload complete instance
        equipe = instance.equipe
        equipe = Equipe.objects.with_related().with_valide_and_points().get(pk=equipe.pk)
        instance = next(s for s in equipe.membres.all() if s.pk == instance.pk)

        serializer = ScoreSerializer(instance, read_only=True)
        if created:
            send_event('events', serializer.url_list, serializer.data)
        else:
            send_event('events', serializer.url_detail, serializer.data)

        if 'clubPreteur' in changed.keys():
            return

        serializer = EquipeSerializer(equipe, read_only=True)
        send_event('events', serializer.url_detail, serializer.data)

    transaction.on_commit(lambda: send(instance, created, {}))

@receiver(post_delete, sender=Score, dispatch_uid='SSE_signal')
def send_notification(sender, instance, created=False, **kwargs):
    equipe = instance.equipe
    equipe = Equipe.objects.with_related().with_valide_and_points().get(pk=equipe.pk)

    send_event('events', ScoreSerializer.url_list, {'deleted': {'id': instance.id}})
    serializer = EquipeSerializer(equipe, read_only=True)
    send_event('events', serializer.url_detail, serializer.data)


@receiver(post_save, sender=Performance, dispatch_uid='SSE_signal')
def send_notification(sender, instance, created=False, **kwargs):
    def send(instance, created, changed):
        # Aucune notification en cas de création/suppression d'une Performance
        # Ni si c'est le 'temps' qui change
        if created or 'temps' in changed.keys():
            return

        # Reload complete instance
        equipe = instance.score.equipe
        equipe = Equipe.objects.prefetch_related(
                Prefetch('membres',
                    queryset=Score.objects.prefetch_related(
                        Prefetch('performances', queryset=Performance.objects.with_related()),
                    ).in_order()
                )
            ).select_related('club').with_valide_and_points().get(pk=equipe.pk)
        score = next(s for s in equipe.membres.all() if s.pk == instance.score.pk)
        instance = next(p for p in score.performances.all() if p.pk == instance.pk)

        serializer = PerformanceSerializer(instance, read_only=True)
        send_event('events', serializer.url_detail, serializer.data)

        serializer = ScoreSerializer(score, read_only=True)
        send_event('events', serializer.url_detail, serializer.data)

        serializer = EquipeSerializer(equipe, read_only=True)
        send_event('events', serializer.url_detail, serializer.data)

    transaction.on_commit(lambda: send(instance, created, {}))
