from django.views.generic.detail import SingleObjectMixin
from django.db.models.signals import pre_save, post_save, post_delete
from django.db.models import Prefetch
from django.db import transaction
from django.dispatch import receiver
from django_eventstream import send_event as sse_send

from core.models import *
from .serializers import *


def send_event(channel, event, data):
    print(event)
    sse_send(channel, event, data)


class Notifier(SingleObjectMixin):
    serializer_class = None
    _data = None

    def __init__(self, **kwargs):
        self.kwargs = kwargs
        self.instance = self.get_object()

        if 'data' in kwargs:
            self._data = kwargs.get('data')
        else:
            self.serializer = self.get_serializer()

    def get_serializer_class(self):
        return self.serializer_class

    def get_serializer(self, serializer_class=None):
        if serializer_class is None:
            serializer_class = self.get_serializer_class()
        return serializer_class(**self.get_serializer_kwargs())

    def get_serializer_kwargs(self):
        kwargs = {
            'instance': self.instance,
            'read_only': True,
        }
        return kwargs

    @property
    def data(self):
        if self._data is None:
            return self.serializer.data
        return self._data

    def notify(self, event_id, data=None):
        if data is None:
            data = self.data
        send_event('events', event_id, data)


###############################################################################
# On ne dynamise que les 3 modèle Equipe, Score et Performance.               #
# Se sont les seuls modèles modifiés durant une rencontre, les autres         #
# le sont en dehors de la rencontre ou imposeront un rechargement de la page. #
###############################################################################


# Equipes

class EquipeNotifier(Notifier):
    serializer_class = EquipeSerializer
    def get_queryset(self):
        return Equipe.objects.with_related().with_valide_and_points()

    def create(self):
        self.notify(f"club/{self.instance.club_id}/equipes/")
        self.notify(f"equipes/")

    def delete(self):
        self.notify(f"club/{self.instance.club_id}/equipes/")
        self.notify(f"equipes/")
        self.notify(f"equipes/{self.instance.id}/")

    def update(self, changed):
        self.notify(f"club/{self.instance.club_id}/equipes/")
        self.notify(f"equipes/")
        if any(f in changed for f in ['ordre', 'numero', 'score.deleted', 'score.created']):
            self.notify(f"equipes/{self.instance.id}/")


@receiver(post_save, sender=Equipe, dispatch_uid='SSE_signal')
def send_notification(sender, instance, created=False, **kwargs):
    notifier = EquipeNotifier(instance=instance)
    if created:
        transaction.on_commit(lambda: notifier.create())
    else:
        transaction.on_commit(lambda: notifier.update({}))
@receiver(post_delete, sender=Equipe, dispatch_uid='SSE_signal')
def send_notification(sender, instance, created=False, **kwargs):
    notifier = EquipeNotifier(instance=instance, data={'deleted': {'id': instance.id}})
    notifier.delete()


# Scores

class ScoreNotifier(Notifier):
    serializer_class = ScoreSerializer

    def get_object(self):
        self.equipe = None
        if 'equipe_id' in self.kwargs:
            self.equipe = EquipeNotifier(pk=self.kwargs['equipe_id'])
            equipe = self.equipe.instance
            if 'pk' in self.kwargs:
                return next(s for s in equipe.membres.all() if s.pk == self.kwargs['pk'])
        if 'instance' in self.kwargs:
            return self.kwargs.get('instance')
        return super().get_object()

    def create(self):
        self.notify(f"club/{self.instance.equipe.club_id}/scores/")
        self.notify(f"scores/")
        self.equipe.update({'score.created': True})

    def delete(self):
        self.notify(f"club/{self.instance.equipe.club_id}/scores/")
        self.notify(f"scores/")
        self.notify(f"scores/{self.instance.id}/")
        self.equipe.update({'score.deleted': True})

    def update(self, changed):
        self.notify(f"scores/{self.instance.id}/")
        if 'points' in changed:
            self.notify(f"scores/")
        if any(f in changed for f in ['ordre', 'points']):
            self.equipe.update(changed)


@receiver(post_save, sender=Score, dispatch_uid='SSE_signal')
def send_notification(sender, instance, created=False, **kwargs):
    notifier = ScoreNotifier(pk=instance.id, equipe_id=instance.equipe_id)
    if created:
        transaction.on_commit(lambda: notifier.create())
    else:
        transaction.on_commit(lambda: notifier.update(instance.tracker.changed()))
@receiver(post_delete, sender=Score, dispatch_uid='SSE_signal')
def send_notification(sender, instance, created=False, **kwargs):
    notifier = ScoreNotifier(instance=instance, equipe_id=instance.equipe_id, data={'deleted': {'id': instance.id}})
    notifier.delete()


# Performances

class PerformanceNotifier(Notifier):
    serializer_class = FullPerformanceSerializer

    def get_queryset(self):
        return Equipe.objects.prefetch_related(
                Prefetch('membres',
                    queryset=Score.objects.select_related('grimpeur__club').prefetch_related(
                        Prefetch('performances', queryset=Performance.objects.with_related()),
                    ).in_order()
                )
            ).select_related('club').with_valide_and_points()

    def get_object(self):
        self.equipe = None
        if 'equipe_id' in self.kwargs:
            self.equipe = EquipeNotifier(pk=self.kwargs['equipe_id'])
            equipe = self.equipe.instance
            if 'score_id' in self.kwargs:
                score = next(s for s in equipe.membres.all() if s.pk == self.kwargs['score_id'])
                self.score = ScoreNotifier(instance=score)
                self.score.equipe = self.equipe
            if 'pk' in self.kwargs:
                return next(p for p in score.performances.all() if p.pk == self.kwargs['pk'])
        if 'instance' in self.kwargs:
            return self.kwargs.get('instance')
        return super().get_object()

    def create(self):
        self.notify(f"voie/{self.instance.voie_id}/perfs/")
        # On create une perf en même temps qu'un score.
        # C'est le score qui se charge de notifier les autres modèles

    def delete(self):
        self.notify(f"voie/{self.instance.voie_id}/perfs/")

    def update(self, changed):
        if 'voie_id' in changed:
            # On déplace le grimpeur de feuille de juge
            self.notify(f"voie/{self.instance.voie_id}/perfs/")
            self.notify(f"voie/{changed['voie_id']}/perfs/", data={'deleted': {'id': self.instance.id}})

        self.notify(f"perfs/{self.instance.id}/")

        if 'points' in changed:
            self.notify(f"voie/{self.instance.voie_id}/perfs/")
            self.score.update(changed)


@receiver(post_save, sender=Performance, dispatch_uid='SSE_signal')
def send_notification(sender, instance, created=False, **kwargs):
    if created:
        notifier = PerformanceNotifier(instance=instance)
        transaction.on_commit(lambda: notifier.create())
    else:
        notifier = PerformanceNotifier(pk=instance.id, score_id=instance.score_id, equipe_id=instance.score.equipe_id)
        transaction.on_commit(lambda: notifier.update(instance.tracker.changed()))
@receiver(post_delete, sender=Performance, dispatch_uid='SSE_signal')
def send_notification(sender, instance, created=False, **kwargs):
    notifier = PerformanceNotifier(instance=instance, data={'deleted': {'id': instance.id}})
    notifier.delete()
