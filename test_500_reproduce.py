import os
import sys
import django
import traceback

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'careconnect.settings')
django.setup()

from accounts.models import User, Guardian, Volunteer, SecurityPersonnel
from emergency.models import EmergencyRequest, EmergencyNotification, EmergencyAuditLog
from emergency.services import create_sos_incident, is_user_guardian_for_resident, process_response
from emergency.views import serialize_emergency, create_sos_api, my_active_emergency_api
from django.test import RequestFactory
import json

print("=== TESTING EDGE CASES AND POTENTIAL 500 ERRORS ===")

rf = RequestFactory()

for u in User.objects.all():
    req = rf.post('/api/emergency/sos/', data=json.dumps({"emergency_type": "Medical Emergency", "description": "Test"}), content_type='application/json')
    req.user = u
    try:
        res = create_sos_api(req)
        if res.status_code >= 500:
            print(f"FAILED (500) for user '{u.username}': {res.content.decode('utf-8')}")
        else:
            print(f"Passed for user '{u.username}' (Status {res.status_code})")
    except Exception as e:
        print(f"EXCEPTION for user '{u.username}':")
        traceback.print_exc()

print("\n=== TESTING SERIALIZE EMERGENCY FOR ALL EMERGENCIES ===")
for em in EmergencyRequest.objects.all():
    for u in User.objects.all():
        try:
            data = serialize_emergency(em, u)
        except Exception as e:
            print(f"SERIALIZATION EXCEPTION for SOS #{em.id} and User '{u.username}':")
            traceback.print_exc()

print("\n=== TESTING MY_ACTIVE_EMERGENCY_API FOR ALL USERS ===")
for u in User.objects.all():
    req = rf.get('/api/emergency/my-active/')
    req.user = u
    try:
        res = my_active_emergency_api(req)
        if res.status_code >= 500:
            print(f"MY_ACTIVE FAILED (500) for user '{u.username}': {res.content.decode('utf-8')}")
        else:
            print(f"MY_ACTIVE Passed for user '{u.username}' (Status {res.status_code})")
    except Exception as e:
        print(f"MY_ACTIVE EXCEPTION for user '{u.username}':")
        traceback.print_exc()
