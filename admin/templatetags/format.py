from django import template
from datetime import timedelta

register = template.Library()

@register.filter
def format(value):
    "Formate un champ"
    if isinstance(value, timedelta):
        if value == timedelta(minutes=-1): return 'Chute'
        if value == timedelta(minutes=-2): return 'Abandon'

        # Calculer les heures, minutes, secondes à partir de la durée
        total_seconds = int(value.total_seconds())
        minutes = total_seconds // 60
        seconds = total_seconds % 60
        hundredth = value.microseconds // 10000
        return f"{minutes:02}:{seconds:02}.{hundredth:02}"
    return value


@register.filter
def map(value, key):
    """
    Map filter to extract a specific key from a list of dictionaries/tuples.
    Usage: {{ my_list|map:"key" }}
    """
    try:
        if isinstance(value, (list, tuple)):
            # Handle list of dictionaries
            if isinstance(value[0], dict):
                return [v[key] for v in value if key in v]
            # Handle list of tuples
            return [v[int(key)] for v in value]
    except (IndexError, KeyError, ValueError, TypeError):
        pass  # Silently ignore errors
    return []

@register.filter
def split(value, key):
    return value.split(key)