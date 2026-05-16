from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from shared import security
from shared.decorators import pre_authorize

from .models import MealRequest, MealRequestStatus
from .serializers import (
    MealRequestCreateSerializer,
    MealRequestSerializer,
    MealRequestUpdateSerializer,
)
from .services import InvalidMealRequestState, MealRequestService


class MealRequestCreateView(APIView):
    @pre_authorize(security.IS_DIETARY_STAFF)
    def get(self, request):
        qs = MealRequest.objects.all().order_by("-created_at")
        patient_id = request.query_params.get("patient_id")
        if patient_id:
            qs = qs.filter(patient_id=patient_id)
        return Response(MealRequestSerializer(qs, many=True).data)

    @pre_authorize(security.IS_DIETARY_STAFF)
    def post(self, request):
        write = MealRequestCreateSerializer(data=request.data)
        write.is_valid(raise_exception=True)
        meal_request = MealRequestService().create_draft(**write.validated_data)
        return Response(
            MealRequestSerializer(meal_request).data,
            status=status.HTTP_201_CREATED,
        )


class MealRequestDetailView(generics.RetrieveAPIView):
    queryset = MealRequest.objects.all()
    serializer_class = MealRequestSerializer
    lookup_url_kwarg = "meal_request_id"

    @pre_authorize(security.IS_DIETARY_STAFF, security.IS_KITCHEN_STAFF)
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @pre_authorize(security.IS_DIETARY_STAFF)
    def patch(self, request, meal_request_id):
        write = MealRequestUpdateSerializer(data=request.data)
        write.is_valid(raise_exception=True)
        try:
            meal_request = MealRequestService().set_recipes(
                meal_request_id=meal_request_id, **write.validated_data
            )
        except MealRequest.DoesNotExist:
            return Response(
                {"detail": "meal request not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        except InvalidMealRequestState as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_409_CONFLICT)
        return Response(MealRequestSerializer(meal_request).data)


class MealRequestFinalizeView(APIView):
    @pre_authorize(security.IS_DIETARY_STAFF)
    def post(self, request, meal_request_id):
        try:
            meal_request = MealRequestService().finalize(
                meal_request_id=meal_request_id
            )
        except MealRequest.DoesNotExist:
            return Response(
                {"detail": "meal request not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        except InvalidMealRequestState as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_409_CONFLICT)

        body = MealRequestSerializer(meal_request).data
        if meal_request.status == MealRequestStatus.REJECTED:
            return Response(body, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
        return Response(body)
