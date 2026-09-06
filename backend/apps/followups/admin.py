from django.contrib import admin
from .models import FollowUp

@admin.register(FollowUp)
class FollowUpAdmin(admin.ModelAdmin):
    list_display = ('id', 'patient', 'consultation', 'status', 'scheduled_date', 'created_at')
    list_filter = ('status', 'scheduled_date')
    search_fields = ('patient__full_name', 'consultation__id')
    readonly_fields = ('id', 'created_at', 'updated_at', 'completed_at', 'created_by')
