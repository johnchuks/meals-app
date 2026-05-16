from rest_framework import generics
from rest_framework.response import Response
from rest_framework.views import APIView

from shared import security
from shared.decorators import pre_authorize

from .models import Recipe
from .serializers import RecipeSerializer


def _recipes_with_relations():
    return Recipe.objects.prefetch_related("allergens", "diet_compatibility")


class RecipeListView(APIView):
    @pre_authorize(security.IS_KITCHEN_STAFF, security.IS_DIETARY_STAFF)
    def get(self, request):
        qs = _recipes_with_relations().order_by("name")
        active = request.query_params.get("active")
        if active is not None:
            qs = qs.filter(active=active.lower() == "true")
        return Response(RecipeSerializer(qs, many=True).data)


class RecipeDetailView(generics.RetrieveAPIView):
    queryset = _recipes_with_relations()
    serializer_class = RecipeSerializer
    lookup_url_kwarg = "recipe_id"

    @pre_authorize(security.IS_KITCHEN_STAFF, security.IS_DIETARY_STAFF)
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)
