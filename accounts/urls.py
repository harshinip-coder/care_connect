from django.urls import path
from . import views
from dashboard import views as dashboard_views
from django.contrib.auth import views as auth_views

urlpatterns = [

    # Authentication
    path('register/', views.register_view, name='register'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    # Profile
    path('profile/', views.profile, name='profile'),
    path('profile/edit/', views.edit_profile, name='edit_profile'),

    # Change Password
    path(
        'change-password/',
        views.change_password,
        name='password_change'
    ),

    # Forgot Password
    path(
        'forgot-password/',
        auth_views.PasswordResetView.as_view(
            template_name='accounts/forgot_password.html',
            email_template_name='accounts/reset_password_email.html',
            success_url='/password-reset-sent/'
        ),
        name='forgot_password'
    ),

    # Password Reset Done
    path(
        'password-reset-sent/',
        auth_views.PasswordResetDoneView.as_view(
            template_name='accounts/password_reset_done.html'
        ),
        name='password_reset_done'
    ),

    # Password Reset Confirm
    path(
        'reset/<uidb64>/<token>/',
        auth_views.PasswordResetConfirmView.as_view(
            template_name='accounts/reset_password.html'
        ),
        name='password_reset_confirm'
    ),

    # Password Reset Complete
    path(
        'reset-complete/',
        auth_views.PasswordResetCompleteView.as_view(
            template_name='accounts/password_reset_complete.html'
        ),
        name='password_reset_complete'
    ),



    # Member Management (Admin Panel)
    path('members/', views.member_list, name='member_list'),
    path('member/add/', views.member_add, name='member_add'),
    path('member/delete/<int:pk>/', views.member_delete, name='member_delete'),

    # Resident Management
    path('residents/', views.resident_list, name='resident_list'),
    path('resident/add/', views.resident_add, name='resident_add'),
    path('resident/edit/<int:pk>/', views.resident_edit, name='resident_edit'),
    path('resident/delete/<int:pk>/', views.resident_delete, name='resident_delete'),

    # Guardian Management
    path('guardians/', views.guardian_list, name='guardian_list'),
    path('guardian/add/', views.guardian_add, name='guardian_add'),
    path('guardian/edit/<int:pk>/', views.guardian_edit, name='guardian_edit'),
    path('guardian/delete/<int:pk>/', views.guardian_delete, name='guardian_delete'),
    path('my-guardians/', views.my_guardians, name='my_guardians'),
    path('my-guardians/add/', views.add_guardian_resident, name='guardian_add_resident'),

    # Volunteer Management
    path('volunteers/', views.volunteer_list, name='volunteer_list'),
    path('volunteer/add/', views.volunteer_add, name='volunteer_add'),
    path('volunteer/edit/<int:pk>/', views.volunteer_edit, name='volunteer_edit'),
    path('volunteer/delete/<int:pk>/', views.volunteer_delete, name='volunteer_delete'),

    # Security Personnel Management
    path('security/', views.security_list, name='security_list'),
    path('security/add/', views.security_add, name='security_add'),
    path('security/edit/<int:pk>/', views.security_edit, name='security_edit'),
    path('security/delete/<int:pk>/', views.security_delete, name='security_delete'),

    # Settings & User Role REST API
    path('settings/', views.settings_view, name='settings'),
    path('api/health/', views.api_health_check, name='api_health_check'),
    path('api/users/add/', views.user_add_api, name='api_user_add'),
    path('api/auth/register/', views.api_register_view, name='api_auth_register'),
    path('api/auth/login/', views.api_login_view, name='api_auth_login'),
    path('api/auth/me/', views.api_auth_me, name='api_auth_me'),
    path('api/auth/logout/', views.api_logout_view, name='api_logout_view'),
    path('api/dashboard/admin-stats/', dashboard_views.admin_dashboard_stats_api, name='api_admin_dashboard_stats'),
    path('api/profile/update/', views.api_profile_update, name='api_profile_update'),
    path('api/profile/upload-avatar/', views.api_profile_upload_avatar, name='api_profile_upload_avatar'),
    path('api/profile/change-password/', views.api_change_password, name='api_change_password'),
    path('api/users/list/', views.api_users_list, name='api_users_list'),
    path('api/users/save/', views.api_users_save, name='api_users_save'),
    path('api/users/delete/', views.api_users_delete, name='api_users_delete'),
    path('api/emergency/list/', views.api_emergency_list, name='api_emergency_list'),
    path('api/guardians/my-residents/', views.api_guardian_my_residents, name='api_guardian_my_residents'),
    path('api/guardians/search/', views.api_guardian_search, name='api_guardian_search'),
    path('api/guardians/emergency-alerts/', views.api_guardian_emergency_alerts, name='api_guardian_emergency_alerts'),
]