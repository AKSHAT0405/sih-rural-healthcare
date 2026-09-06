from django.urls import path, include
from .views import health_check

urlpatterns = [
    path('health/', health_check, name='health_check'),
    path('auth/', include('apps.accounts.urls')),
    path('', include('apps.patients.urls')),
    path('', include('apps.facilities.urls')),
    path('', include('apps.consultations.urls')),
    path('', include('apps.referrals.urls')),
    path('', include('apps.followups.urls')),
    path('', include('apps.inventory.urls')),
]
