from django.db.models.signals import pre_save, post_save, post_delete
from django.dispatch import receiver
from django.db.models import Q
import logging

from .models import *

logger = logging.getLogger(__name__)


##################################################
# Performance.temps => Tri des grimpeurs pour attribution des points

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


##################################################
# Voie.zones => Performance.etat

def maj_performances_etat(voie, anciennes_zones):
    """
    Met à jour le champ `etat` de toutes les performances associées à une voie
    en fonction des correspondances entre les anciennes et les nouvelles zones,
    et loggue les cas particuliers où les anciens états deviennent obsolètes.

    :param voie: Instance de la voie mise à jour.
    :param anciennes_zones: Dictionnaire des anciennes zones avant mise à jour.
    :return: Un dictionnaire contenant des statistiques sur les mises à jour.
    """

    nouvelles_zones = list(voie.zones.keys())
    anciennes_zones = list(anciennes_zones.keys())

    # Table de correspondance : ancien index -> nouvel index
    correspondance = {anciennes_zones.index(valeur): nouvelles_zones.index(valeur)
                      for valeur in anciennes_zones if valeur in nouvelles_zones}

    # Appliquer les mises à jour
    stats = {"updated": 0, "ignored": 0, "reset": 0, "reset_details": []}
    performances = Performance.objects.filter(voie=voie)
    for perf in performances:
        if perf.etat is None:
            stats["ignored"] += 1
            continue
        if perf.etat in correspondance:
            new = correspondance[perf.etat]
            if perf.etat == new:
                stats["ignored"] += 1
                continue
            perf.etat = new
            perf.save()
            stats["updated"] += 1
        else:
            stats["reset_details"].append((perf.id, perf.etat, perf.voie_id))
            perf.etat = None
            perf.save()
            stats["reset"] += 1

    return stats

@receiver(pre_save, sender=Voie)
def sauvegarder_anciennes_zones(sender, instance, **kwargs):
    if instance.pk:
        ancienne_voie = Voie.objects.get(pk=instance.pk)
        instance._anciennes_zones = ancienne_voie.zones

@receiver(post_save, sender=Voie)
def mettre_a_jour_performances_apres_zones(sender, instance, **kwargs):
    if hasattr(instance, "_anciennes_zones"):
        stats = maj_performances_etat(instance, instance._anciennes_zones)

        # Logguer les résultats
        logger.info(f"Performances mises à jour pour la voie {instance.id} : {stats['updated']}")
        logger.info(f"Performances ignorées pour la voie {instance.id} : {stats['ignored']}")
        logger.info(f"Performances réinitialisées pour la voie {instance.id} : {stats['reset']}")

        if stats["reset"] > 0:
            logger.warning(f"Détails des performances réinitialisées pour la voie {instance.id} : {stats['reset_details']}")
