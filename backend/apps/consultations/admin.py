from django.contrib import admin
from .models import Consultation

@admin.register(Consultation)
class ConsultationAdmin(admin.ModelAdmin):
    list_display = ('id', 'patient', 'doctor', 'facility', 'status', 'consulted_at', 'created_at')
    list_filter = ('status', 'facility')
    search_fields = ('patient__full_name', 'doctor__email')
    readonly_fields = ('id', 'created_at', 'updated_at')
