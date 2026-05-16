from django.db import models


class UserRole(models.TextChoices):
    KITCHEN_STAFF = "KITCHEN_STAFF"
    DIETARY_STAFF = "DIETARY_STAFF"
