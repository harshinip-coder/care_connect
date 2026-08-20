import os
import sys
import django
import traceback
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'careconnect.settings')
django.setup()

from accounts.models import User
from emergency.views import create_sos_api
from django.test import RequestFactory

factory = RequestFactory()

for user in User.objects.all():
    print(f"\n--- Testing User: {user.username} (Role: {user.role}) ---")
    request = factory.post(
        '/api/emergency/sos/',
        data=json.dumps({"emergency_type": "Medical Emergency", "description": "Emergency SOS Triggered"}),
        content_type='application/json'
    )
    request.user = user
    try:
        res = create_sos_api(request)
        print(f"Status Code: {res.status_code}")
        body = json.loads(res.content.decode('utf-8'))
        print("Success:", body.get("success"), "| Message:", body.get("message"))
    except Exception as e:
        print("ERROR THROWN FOR USER:", user.username)
        traceback.print_exc()
