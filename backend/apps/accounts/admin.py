from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .forms import UserCreationForm, UserChangeForm
from .models import User


class UserAdmin(BaseUserAdmin):
    form = UserChangeForm
    add_form = UserCreationForm

    ordering = ["email"]
    list_display = [
        "email",
        "first_name",
        "last_name",
        "role",
        "facility",
        "is_active",
    ]
    search_fields = [
        "email",
        "first_name",
        "last_name",
        "facility__name",
    ]
    readonly_fields = ["created_at", "updated_at"]

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        (
            "Personal info",
            {
                "fields": (
                    "first_name",
                    "last_name",
                    "phone",
                    "role",
                    "facility",
                )
            },
        ),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        (
            "Important dates",
            {
                "fields": (
                    "last_login",
                    "created_at",
                    "updated_at",
                )
            },
        ),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "password1",
                    "password2",
                    "first_name",
                    "last_name",
                    "phone",
                    "role",
                    "facility",
                ),
            },
        ),
    )


admin.site.register(User, UserAdmin)