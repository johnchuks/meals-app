import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models

from .enum import UserRole


class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.CharField(max_length=20, choices=UserRole.choices)

    class Meta:
        db_table = "users"

    @property
    def is_kitchen_staff(self) -> bool:
        return self.role == UserRole.KITCHEN_STAFF

    @property
    def is_dietary_staff(self) -> bool:
        return self.role == UserRole.DIETARY_STAFF
