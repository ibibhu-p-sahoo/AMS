from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
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


class PasswordResetRequestView(APIView):
    """Email a password-reset link.

    Always returns 200 with the same message whether or not the address is
    registered, so the endpoint can't be used to enumerate accounts.
    """

    permission_classes = [AllowAny]
    throttle_scope = "auth"

    def post(self, request):
        email = (request.data.get("email") or "").strip()
        generic = Response(
            {"detail": "If that email is registered, a reset link has been sent."}
        )
        if not email:
            return generic
        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if not user:
            return generic

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        link = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"
        send_mail(
            subject="Reset your AMS password",
            message=(
                f"Hi {user.name or user.email},\n\n"
                f"We received a request to reset your password. Use the link "
                f"below to choose a new one (valid for a limited time):\n\n{link}\n\n"
                f"If you didn't request this, you can safely ignore this email.\n\n"
                f"— The Alumni Team"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=True,
        )
        return generic


class PasswordResetConfirmView(APIView):
    """Validate the uid + token from the email link and set a new password."""

    permission_classes = [AllowAny]
    throttle_scope = "auth"

    def post(self, request):
        uid = request.data.get("uid") or ""
        token = request.data.get("token") or ""
        password = request.data.get("password") or ""
        try:
            user = User.objects.get(pk=force_str(urlsafe_base64_decode(uid)))
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            user = None
        if user is None or not default_token_generator.check_token(user, token):
            return Response(
                {"detail": "This reset link is invalid or has expired."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            validate_password(password, user)
        except DjangoValidationError as exc:
            return Response({"password": exc.messages}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(password)
        user.save(update_fields=["password"])
        return Response({"detail": "Password updated. You can now sign in."})


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
