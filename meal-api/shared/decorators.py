from functools import wraps

from rest_framework import status
from rest_framework.response import Response


def superuser_only(view_method):
    """Restrict an APIView method to authenticated superusers only.

    For catalog/admin endpoints that aren't tied to a staff role.
    """

    @wraps(view_method)
    def wrapper(self, request, *args, **kwargs):
        user = request.user
        if not user.is_authenticated:
            return Response(
                {"detail": "authentication required"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        if not user.is_superuser:
            return Response(
                {"detail": "superuser only"},
                status=status.HTTP_403_FORBIDDEN,
            )
        return view_method(self, request, *args, **kwargs)

    return wrapper


def pre_authorize(*allowed_roles):
    """Restrict an APIView method to users whose role is in `allowed_roles`.

    Accepts predicates from `shared.security`. Superusers bypass the check.

    Usage:
        from shared import security
        from shared.decorators import pre_authorize

        class TrayListView(APIView):
            @pre_authorize(security.IS_KITCHEN_STAFF)
            def get(self, request): ...
    """
    allowed = {str(r) for r in allowed_roles}

    def decorator(view_method):
        @wraps(view_method)
        def wrapper(self, request, *args, **kwargs):
            user = request.user
            if not user.is_authenticated:
                return Response(
                    {"detail": "authentication required"},
                    status=status.HTTP_401_UNAUTHORIZED,
                )
            if user.is_superuser:
                return view_method(self, request, *args, **kwargs)
            if getattr(user, "role", None) not in allowed:
                return Response(
                    {"detail": "insufficient role"},
                    status=status.HTTP_403_FORBIDDEN,
                )
            return view_method(self, request, *args, **kwargs)

        return wrapper

    return decorator
