from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from user.enum import UserRole

USERS = [
    {
        "username": "kitchen1",
        "email": "kitchen@meals.local",
        "password": "Kitchen!2026",
        "role": UserRole.KITCHEN_STAFF,
    },
    {
        "username": "dietary1",
        "email": "dietary@meals.local",
        "password": "Dietary!2026",
        "role": UserRole.DIETARY_STAFF,
    },
]


class Command(BaseCommand):
    help = "Seed one user per staff role (idempotent)."

    def handle(self, *args, **options):
        User = get_user_model()
        for spec in USERS:
            user, created = User.objects.get_or_create(
                username=spec["username"],
                defaults={"email": spec["email"], "role": spec["role"]},
            )
            if created:
                user.set_password(spec["password"])
                user.save()
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Created {spec['role']} user '{spec['username']}'"
                    )
                )
            else:
                self.stdout.write(
                    f"User '{spec['username']}' already exists — skipping"
                )
