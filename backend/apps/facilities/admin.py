from django.contrib import admin
from .models import Facility

@admin.register(Facility)
class FacilityAdmin(admin.ModelAdmin):
    list_display = ('name', 'type', 'is_active', 'phone', 'created_at')
    search_fields = ('name', 'address', 'phone')
    list_filter = ('type', 'is_active')
    readonly_fields = ('id', 'created_at', 'updated_at')
