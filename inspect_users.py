import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'careconnect.settings')
django.setup()

from accounts.models import User, Guardian, Volunteer, SecurityPersonnel
from emergency.models import EmergencyRequest, EmergencyNotification

print("=== ALL USERS ===")
for u in User.objects.all():
    print(f"ID={u.id} | username='{u.username}' | first='{u.first_name}' | last='{u.last_name}' | email='{u.email}' | phone='{u.phone}' | role='{u.role}' | society={u.society}")

print("\n=== ALL GUARDIANS ===")
for g in Guardian.objects.all():
    print(f"ID={g.id} | user={g.user} | resident={g.resident} | name='{g.first_name} {g.last_name}' | username='{g.username}' | email='{g.email}' | phone='{g.phone}' | is_primary={g.is_primary}")

print("\n=== ALL EMERGENCY REQUESTS ===")
for em in EmergencyRequest.objects.all().order_by('-id')[:10]:
    print(f"ID={em.id} | resident={em.resident} | status='{em.status}' | active_stage='{em.active_escalation_level}' | responder={em.assigned_responder}")
    for n in em.notifications.all():
        print(f"   -> Notif ID={n.id} | role={n.recipient_role} | user={n.recipient_user} | status={n.status} | timeout={n.timeout_at}")
