from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.shortcuts import redirect

def root_redirect(request):
    if request.user.is_authenticated:
        return redirect('dashboard')
    return redirect('login')

urlpatterns = [
    # Root URL Redirect
    path('', root_redirect, name='root'),

    # Django Admin
    path('admin/', admin.site.urls),

    # Fallback Redirect for accounts/login/
    path('accounts/login/', lambda req: redirect('login')),

    # Accounts Module
    path('', include('accounts.urls')),


    # Dashboard Module
    path('dashboard/', include('dashboard.urls')),
    path('', include('dashboard.urls')),

    # Society Module
    path('', include('societies.urls')),

    #emergency module
    path('', include('emergency.urls')),
]

# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)