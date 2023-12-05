#from django_sse.views import BaseSseView

from django.views.generic import View
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse, StreamingHttpResponse
from django.utils.decorators import method_decorator

from django.utils import timezone
from time import sleep

from .models import Notification


class SSEView(View):
    @method_decorator(csrf_exempt)
    def dispatch(self, request, *args, **kwargs):
        self.request = request
        self.args = args
        self.kwargs = kwargs

        response = StreamingHttpResponse(streaming_content=self.iterator(), content_type="text/event-stream")
        response['Cache-Control'] = 'no-cache'
        response['Software'] = 'django-sse'
        return response

    def iterator(self):
        last_timestamp = timezone.now()
        cont = True
        while cont:
            for msg in Notification.objects.filter(date__gt=last_timestamp):
                payload = ""
                if msg.event is not None: payload += f"event: {msg.event}\n"
                if msg.data is not None: payload += f"data: {msg.data}\n"
                else: payload += "data: no data\n"
                payload += "\n"
                last_timestamp = msg.date
                yield payload
            sleep(0.3)
