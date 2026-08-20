from django.urls import path
from . import views

urlpatterns = [
    path('', views.dashboard, name='dashboard'),
    path('admin/', views.admin_dashboard, name='admin_dashboard'),
    path('resident/', views.resident_dashboard, name='resident_dashboard'),
    path('volunteer/', views.volunteer_dashboard, name='volunteer_dashboard'),
    path('security/', views.security_dashboard, name='security_dashboard'),
    path('guardian/', views.guardian_dashboard, name='guardian_dashboard'),
    path('society-member/', views.society_member_dashboard, name='society_member_dashboard'),
    path('api/dashboard/admin-stats/', views.admin_dashboard_stats_api, name='api_admin_dashboard_stats'),
]