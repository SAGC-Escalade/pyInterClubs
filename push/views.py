from django_sse.views import BaseSseView
from django.utils import timezone
from time import sleep

from .models import Notification


class SSEView(BaseSseView):
    def iterator(self):
        last_timestamp = timezone.now()
        cont = True
        while cont:
            msgs = Notification.objects.filter(date__gt=last_timestamp)
            for msg in msgs:
                self.sse.add_message(msg.event, msg.data or "no data")
                last_timestamp = msg.date
                cont = False
            yield
            sleep(0.3)
