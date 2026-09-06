from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import CustomTokenObtainPairView, UserDetailView, DoctorListView, DoctorProfileViewSet, DoctorAvailabilityViewSet

router = DefaultRouter()
router.register(r'doctor-profiles', DoctorProfileViewSet, basename='doctorprofile')
router.register(r'doctor-availability', DoctorAvailabilityViewSet, basename='doctoravailability')

urlpatterns = [
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', UserDetailView.as_view(), name='user_detail'),
    path('doctors/', DoctorListView.as_view(), name='doctor_list'),
    path('', include(router.urls)),
]
