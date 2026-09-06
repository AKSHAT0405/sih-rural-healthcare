from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ConsultationViewSet, AppointmentViewSet, DoctorSlotView, MedicalRecordViewSet

router = DefaultRouter()
router.register(r'consultations', ConsultationViewSet, basename='consultation')
router.register(r'appointments', AppointmentViewSet, basename='appointment')
router.register(r'medical-records', MedicalRecordViewSet, basename='medicalrecord')

urlpatterns = [
    path('doctors/<str:doctor_id>/slots/', DoctorSlotView.as_view(), name='doctor-slots'),
    path('', include(router.urls)),
]
