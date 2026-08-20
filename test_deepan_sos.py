import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'careconnect.settings')
django.setup()

from django.test import Client
from accounts.models import User

client = Client()

# 1. Login as Deepan
login_res = client.post('/api/auth/login/', json.dumps({"username": "Deepan", "password": "Harshini@2008"}), content_type='application/json')
print("Login Deepan Status:", login_res.status_code)
print("Login Deepan Response:", login_res.content.decode('utf-8'))

# 2. Trigger SOS
sos_res = client.post('/api/emergency/sos/', json.dumps({"emergency_type": "Medical Emergency", "description": "Test SOS"}), content_type='application/json')
print("Trigger SOS Status:", sos_res.status_code)
print("Trigger SOS Response:", sos_res.content.decode('utf-8'))

# 3. Check my active emergency
active_res = client.get('/api/emergency/my-active/')
print("My Active Status:", active_res.status_code)
print("My Active Response:", active_res.content.decode('utf-8'))
