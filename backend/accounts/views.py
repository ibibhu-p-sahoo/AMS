from django.contrib.auth import get_user_model
from rest_framework import viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from .permissions import IsAdmin
from .serializers import (
    EmailTokenObtainPairSerializer,
    UserCreateSerializer,
    UserSerializer,
    generate_password,
)

User = get_user_model()


class LoginView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer
    throttle_scope = "auth"


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    return Response(UserSerializer(request.user).data)


class UserViewSet(viewsets.ModelViewSet):
    """Admin-only user management."""

    queryset = User.objects.all().order_by("name")
    permission_classes = [IsAdmin]
    search_fields = ["name", "email"]
    filterset_fields = ["role", "is_active"]

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        return UserSerializer

    @action(detail=True, methods=["post"], url_path="reset-password")
    def reset_password(self, request, pk=None):
        """Generate a fresh password for this user and return it once."""
        user = self.get_object()
        password = generate_password()
        user.set_password(password)
        user.save(update_fields=["password"])
        return Response(
            {"id": user.id, "email": user.email, "generated_password": password}
        )
