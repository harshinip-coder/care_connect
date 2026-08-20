import os
import sys
import django
import traceback

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'careconnect.settings')
django.setup()

from accounts.models import User
from emergency.views import create_sos_api
from django.test import RequestFactory
import json

deepan = User.objects.get(username="Deepan")

factory = RequestFactory()
request = factory.post(
    '/api/emergency/sos/',
    data=json.dumps({"emergency_type": "Medical Emergency", "description": "Emergency SOS Triggered"}),
    content_type='application/json'
)
request.user = deepan

try:
    response = create_sos_api(request)
    print("Response Status Code:", response.status_code)
    print("Response Content:", response.content.decode('utf-8'))
except Exception as e:
    print("EXCEPTIONAL ERROR TRACEBACK:")
    traceback.print_exc()
