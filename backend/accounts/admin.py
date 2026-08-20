from django.contrib import admin
from .models import User, Guardian, Volunteer, SecurityPersonnel

admin.site.register(User)
admin.site.register(Guardian)
admin.site.register(Volunteer)
admin.site.register(SecurityPersonnel)