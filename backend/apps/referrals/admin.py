from django.contrib import admin
from .models import Referral

@admin.register(Referral)
class ReferralAdmin(admin.ModelAdmin):
    list_display = ('id', 'patient', 'from_facility', 'to_facility', 'referred_by', 'priority', 'status', 'created_at')
    list_filter = ('status', 'priority', 'from_facility', 'to_facility')
    search_fields = ('patient__full_name', 'reason')
    readonly_fields = ('id', 'created_at', 'updated_at', 'completed_at')
