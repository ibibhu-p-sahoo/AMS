from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class Role(models.TextChoices):
    ADMIN = "admin", "Admin"
    COORDINATOR = "coordinator", "Coordinator"
    VOLUNTEER = "volunteer", "Volunteer"
    ALUMNUS = "alumnus", "Alumnus"
    READONLY = "readonly", "Read-only"


class UserManager(BaseUserManager):
    """User manager keyed on email (institute email is the login per PRD)."""

    use_in_migrations = True

    def _create_user(self, email, password, **extra):
        if not email:
            raise ValueError("Users must have an email address")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra):
        extra.setdefault("is_staff", False)
        extra.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra)

    def create_superuser(self, email, password=None, **extra):
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        extra.setdefault("role", Role.ADMIN)
        if extra.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")
        return self._create_user(email, password, **extra)


class User(AbstractUser):
    """Custom user — email login, single role field drives RBAC."""

    username = None
    email = models.EmailField("email address", unique=True)
    name = models.CharField(max_length=150, blank=True)
    role = models.CharField(
        max_length=20, choices=Role.choices, default=Role.VOLUNTEER
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self):
        return f"{self.name or self.email} ({self.role})"

    @property
    def is_admin(self):
        return self.role == Role.ADMIN or self.is_superuser

    def save(self, *args, **kwargs):
        if not self.name:
            self.name = self.email.split("@")[0]
        super().save(*args, **kwargs)
