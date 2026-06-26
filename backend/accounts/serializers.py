import secrets
import string

from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()

# Unambiguous alphabet (no O/0, I/l/1) so generated passwords are easy to read & share.
_PW_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"


def generate_password(length: int = 12) -> str:
    """Return a cryptographically strong, readable random password."""
    return "".join(secrets.choice(_PW_ALPHABET) for _ in range(length))


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "name", "email", "role", "is_active", "is_admin"]
        read_only_fields = ["id", "is_admin"]


class UserCreateSerializer(serializers.ModelSerializer):
    # Optional — leave blank and the server auto-generates a strong password.
    password = serializers.CharField(
        write_only=True, min_length=8, required=False, allow_blank=True
    )
    # Returned once, on creation, so the admin can copy & share it.
    generated_password = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = ["id", "name", "email", "role", "is_active", "password", "generated_password"]

    def create(self, validated_data):
        password = validated_data.pop("password", "") or generate_password()
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        # Attach the plaintext so it surfaces in the response (never stored as plaintext).
        user.generated_password = password
        return user


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Adds user profile to the token response so the SPA gets it in one call."""

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data
