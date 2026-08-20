from django.urls import path
from . import views

urlpatterns = [

    # Template Views
    path('emergency/', views.emergency_list, name='emergency_list'),
    path('emergency/add/', views.emergency_add, name='emergency_add'),
    path('emergency/edit/<int:pk>/', views.emergency_edit, name='emergency_edit'),
    path('emergency/delete/<int:pk>/', views.emergency_delete, name='emergency_delete'),
    path('emergency/<int:pk>/', views.emergency_detail, name='emergency_detail'),
    path('sos/', views.sos_request, name='sos_request'),

    # REST API Endpoints for SOS & Sequential Escalation Workflow
    path('api/emergency/sos/', views.create_sos_api, name='api_create_sos'),
    path('api/emergency/sos', views.create_sos_api),
    path('api/sos/', views.create_sos_api),
    path('api/sos', views.create_sos_api),

    path('api/emergency/history/', views.emergency_history_api, name='api_emergency_history'),
    path('api/emergency/history', views.emergency_history_api),
    path('api/history/', views.emergency_history_api),
    path('api/history', views.emergency_history_api),

    path('api/emergency/sos/<int:pk>/', views.emergency_detail_api, name='api_sos_detail_alt'),
    path('api/emergency/sos/<int:pk>/accept/', views.accept_sos_api, name='api_accept_sos'),
    path('api/emergency/sos/<int:pk>/accept', views.accept_sos_api),
    path('api/emergency/sos/<int:pk>/decline/', views.reject_sos_api, name='api_decline_sos'),
    path('api/emergency/sos/<int:pk>/decline', views.reject_sos_api),
    path('api/emergency/sos/<int:pk>/reject/', views.reject_sos_api, name='api_reject_sos'),
    path('api/emergency/sos/<int:pk>/reject', views.reject_sos_api),
    path('api/emergency/sos/<int:pk>/respond/', views.respond_emergency_api, name='api_respond_sos_alt'),
    path('api/emergency/sos/<int:pk>/respond', views.respond_emergency_api),
    path('api/emergency/sos/<int:pk>/resolve/', views.resolve_emergency_api, name='api_resolve_sos_alt'),
    path('api/emergency/sos/<int:pk>/resolve', views.resolve_emergency_api),
    path('api/emergency/sos/<int:pk>/cancel/', views.cancel_emergency_api, name='api_cancel_sos_alt'),
    path('api/emergency/sos/<int:pk>/cancel', views.cancel_emergency_api),

    path('api/emergency/<int:pk>/', views.emergency_detail_api, name='api_emergency_detail'),
    path('api/emergency/<int:pk>/update-details/', views.update_sos_details_api, name='api_update_sos_details'),
    path('api/emergency/<int:pk>/respond/', views.respond_emergency_api, name='api_respond_emergency'),
    path('api/emergency/<int:pk>/resolve/', views.resolve_emergency_api, name='api_resolve_emergency'),
    path('api/emergency/<int:pk>/cancel/', views.cancel_emergency_api, name='api_cancel_emergency'),

    path('api/emergency/my-active/', views.my_active_emergency_api, name='api_my_active_emergency'),
    path('api/emergency/my-active', views.my_active_emergency_api),
    path('api/my-active/', views.my_active_emergency_api),
    path('api/my-active', views.my_active_emergency_api),

    path('api/notifications/', views.notifications_list_api, name='api_notifications_list'),
    path('api/notifications', views.notifications_list_api),
    path('api/emergency/notifications/', views.notifications_list_api, name='api_emergency_notifications_list'),
    path('api/emergency/notifications', views.notifications_list_api),
    path('api/notifications/<int:pk>/read/', views.mark_notification_read_api, name='api_mark_notification_read'),
    path('api/notifications/<int:pk>/read', views.mark_notification_read_api),
    path('api/notifications/mark-all-read/', views.mark_all_notifications_read_api, name='api_mark_all_notifications_read'),
    path('api/notifications/mark-all-read', views.mark_all_notifications_read_api),
    path('api/emergency/notifications/<int:pk>/read/', views.mark_notification_read_api, name='api_emergency_mark_notification_read'),
    path('api/emergency/notifications/<int:pk>/read', views.mark_notification_read_api),
    path('api/emergency/notifications/mark-all-read/', views.mark_all_notifications_read_api, name='api_emergency_mark_all_notifications_read'),
    path('api/emergency/notifications/mark-all-read', views.mark_all_notifications_read_api),
]