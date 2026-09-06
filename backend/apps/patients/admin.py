from django.contrib import admin
from .models import Patient

@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'phone', 'gender', 'created_by', 'created_at')
    search_fields = ('full_name', 'phone')
    list_filter = ('gender', 'created_at')
    readonly_fields = ('id', 'created_by', 'created_at', 'updated_at')

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
