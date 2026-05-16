from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from shared import security
from shared.decorators import pre_authorize

from .enum import TrayStatus
from .models import Tray, TrayStatusHistory
from .serializers import TraySerializer, TrayStatusHistorySerializer
from .services import TrayService
from .state_machine import InvalidTransition


class TrayListView(generics.ListAPIView):
    serializer_class = TraySerializer

    def get_queryset(self):
        qs = Tray.objects.order_by("-created_at")
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        meal_request_id = self.request.query_params.get("meal_request_id")
        if meal_request_id:
            qs = qs.filter(meal_request_id=meal_request_id)
        return qs

    @pre_authorize(security.IS_KITCHEN_STAFF, security.IS_DIETARY_STAFF)
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class TrayDetailView(generics.RetrieveAPIView):
    queryset = Tray.objects.all()
    serializer_class = TraySerializer
    lookup_url_kwarg = "tray_id"

    @pre_authorize(security.IS_KITCHEN_STAFF, security.IS_DIETARY_STAFF)
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class TrayStatusHistoryView(generics.ListAPIView):
    serializer_class = TrayStatusHistorySerializer

    def get_queryset(self):
        get_object_or_404(Tray, pk=self.kwargs["tray_id"])
        return TrayStatusHistory.objects.filter(
            tray_id=self.kwargs["tray_id"]
        ).order_by("transitioned_at")

    @pre_authorize(security.IS_KITCHEN_STAFF, security.IS_DIETARY_STAFF)
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class _TrayTransitionView(APIView):
    target_status: str = ""

    @pre_authorize(security.IS_KITCHEN_STAFF)
    def post(self, request, tray_id):
        try:
            tray = TrayService().transition(
                tray_id=tray_id, target_status=self.target_status
            )
        except Tray.DoesNotExist:
            return Response(
                {"detail": "tray not found"}, status=status.HTTP_404_NOT_FOUND
            )
        except InvalidTransition as exc:
            return Response(
                {
                    "detail": str(exc),
                    "current_status": exc.current,
                    "attempted_status": exc.attempted,
                },
                status=status.HTTP_409_CONFLICT,
            )
        return Response(TraySerializer(tray).data)


class StartPreparationView(_TrayTransitionView):
    target_status = TrayStatus.PREPARATION_STARTED


class ValidateAccuracyView(_TrayTransitionView):
    target_status = TrayStatus.ACCURACY_VALIDATED


class DispatchView(_TrayTransitionView):
    target_status = TrayStatus.EN_ROUTE


class DeliverView(_TrayTransitionView):
    target_status = TrayStatus.DELIVERED


class RetrieveView(_TrayTransitionView):
    target_status = TrayStatus.RETRIEVED
