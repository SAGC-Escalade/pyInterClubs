# This is an auto-generated Django model module.
# You'll have to do the following manually to clean this up:
#   * Rearrange models' order
#   * Make sure each model has one field with primary_key=True
#   * Make sure each ForeignKey and OneToOneField has `on_delete` set to the desired behavior
#   * Remove `managed = False` lines if you wish to allow Django to create, modify, and delete the table
# Feel free to rename the models, but don't rename db_table values or field names.
from django.db import models
from django.db.models import Q
from django.utils import timezone


class Notification(models.Model):
    id = models.AutoField(primary_key=True)
    event = models.CharField(max_length=255, blank=True, null=True)
    data = models.TextField(blank=True, null=True)
    date = models.DateTimeField(auto_now=True, null=False)

    @classmethod
    def send_event(cls, event, data=None):
        cls.objects.filter(event=event).delete()
        cls.objects.create(event=event, data=data)
