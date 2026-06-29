from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    LoginView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    UserViewSet,
    me,
)

router = DefaultRouter()
router.register("users", UserViewSet, basename="user")

urlpatterns = [
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/me/", me, name="me"),
    path("auth/password-reset/", PasswordResetRequestView.as_view(), name="password_reset"),
    path(
        "auth/password-reset-confirm/",
        PasswordResetConfirmView.as_view(),
        name="password_reset_confirm",
    ),
    path("", include(router.urls)),
]
